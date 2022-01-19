import "dotenv/config";
import Moment from "moment";
const { Client, Intents } = require("discord.js");

import {
  updateCollMap,
  updateUser,
  getEnrollment,
  getReferrals,
  getUserByDiscord,
  getWallet,
  createFloorTracker,
  createUser,
  getUserFloorTrackers,
  deleteFloorTrackers,
} from "./api";
import {
  checkBalChange,
  getSolTransaction
} from "./solana/transactions"
import { getWallets } from "./solana/coordinators"
import {
  FindGlobalCollMapByPin,
  GetGlobalCollMap,
  FindGlobalCollMapByChannel,
  UpdateGlobalCollMap,
} from "./collMappings"

export const BuildListener = () => {
  return new Client({
    intents: [
      Intents.FLAGS.GUILD_MESSAGES,
      Intents.FLAGS.DIRECT_MESSAGES,
      Intents.FLAGS.DIRECT_MESSAGE_REACTIONS,
      Intents.FLAGS.GUILDS,
      Intents.FLAGS.GUILD_MEMBERS,
      Intents.FLAGS.GUILD_MESSAGES,
      Intents.FLAGS.GUILD_PRESENCES,
      Intents.FLAGS.GUILD_MESSAGE_REACTIONS,
      Intents.FLAGS.GUILD_INVITES,
    ],
    partials: ["MESSAGE", "CHANNEL", "REACTION", "USER", "GUILD_MEMBER"],
  });
};

const discordHandleErr = async (content) => {
  await message.reply({ content, ephemeral: true });
}

let guildInvites = new Map()
let enrollment

const syncEnrollment = async () => {
  enrollment = await getEnrollment( msg => console.log(msg) )
}

const getMembershipString = enrollment => {
  return `Rd ${enrollment.round} - Members ${enrollment.currentCount}/${enrollment.limit}`
}

const getEnrollPriceStr = enrollment => {
  return `Rd ${enrollment.round} - Enroll Price: ${enrollment.price} SOL`
}

const getEnrollBountyStr = enrollment => {
  return `Bounty Fee: ${enrollment.defaultBounty} SOL`
}

export const StartListener = async (listener) => {
  listener.on("ready", async () => {
    console.log(`Logged in as ${listener.user.tag}!`);

    // track invites
    const guild = listener.guilds.cache.get(process.env.SERVER_ID);
    const invites = await guild.invites.fetch()
    invites.each(inv => guildInvites.set(inv.code, inv.uses));
    console.log("Invites tracker updated...")

    // update membership data
    await syncEnrollment()
    const enrollPriceStr = getEnrollPriceStr(enrollment)
    const channPrice = listener.channels.cache.get(process.env.CHANNEL_ENROLL_PRICE)
    if ( channPrice.name !== enrollPriceStr) {
      console.log('Updating channel enrollment price...')
      channPrice.setName(enrollPriceStr)
    }

    const enrolledTxt = getMembershipString(enrollment)
    const channEnrolled = listener.channels.cache.get(process.env.CHANNEL_RD_MEMBERS)
    if ( channEnrolled.name !== enrolledTxt) {
      console.log('Updating channel enrollment membership...')
      channEnrolled.setName(enrolledTxt)
    }

    const bountyTxt = getEnrollBountyStr(enrollment)
    const channBounty = listener.channels.cache.get(process.env.CHANNEL_BOUNTY_FEE)
    if ( channBounty.name !== bountyTxt) {
      console.log('Updating channel bounty fee...')
      channBounty.setName(bountyTxt)
    }
  });

  // update invite cache when new ones created
  listener.on('inviteCreate', async invite => {
    console.log("Syncing invite: ", invite)
    const invites = await invite.guild.invites.fetch();
    invites.each(inv => guildInvites.set(inv.code, inv.uses));
    console.log("Invites tracker updated...")
  })

  // role synchronization with db
  listener.on("guildMemberUpdate", async (oldMember, newMember) => {
    listener.users.cache.get(newMember.id)

    const discordId = newMember.user.id
    const isOG = newMember._roles.includes( process.env.OG_ROLE_ID )
    const wasOG = oldMember._roles.includes( process.env.OG_ROLE_ID )
    console.log("is OG", discordId, isOG, wasOG)
    if ( isOG !== wasOG ) {
      console.log('updating og role ', isOG, discordId)
      await updateUser({ discordId, update: { isOG }})
    }
  });

  // new member
  listener.on("guildMemberAdd", async (newMember) => {
    const guild = listener.guilds.cache.get(process.env.SERVER_ID);
    const newInvites = await guild.invites.fetch()
    const usedInvite = newInvites.find(inv => guildInvites.get(inv.code) < inv.uses);
    console.log(`The code ${usedInvite.code} was just used by ${newMember.user.username}.`)
    newInvites.each(inv => guildInvites.set(inv.code, inv.uses));

    const newUser = await createUser(
      {
        discordId: newMember.user.id,
        discordName: `${newMember.user.username}#${newMember.user.discriminator}`,
        referrerDiscordId: usedInvite.inviter.id,
        inviteId: usedInvite.code, 
        lastJoined: Moment(),
      },
      msg => console.log(msg),
    )
    if ( newUser ) {
      console.log(`Created / Updated user for discordId ${ newUser.discordId }`)
      if ( newUser.inactiveDate && Moment(newUser.inactiveDate).isBefore(Moment())) {
        newUser.roles.add(process.env.TRAIL_ROLE_ID)
      }
    }

    // broadcast
    const chann = listener.channels.cache.get(process.env.CHANNEL_MEMBERSHIP)
    chann.send({ content: `${ newMember.user.username }#${newMember.user.discriminator} just joined!` });
  });

  // member left
  listener.on("guildMemberRemove", async (member) => {
    // broadcast
    const chann = listener.channels.cache.get(process.env.CHANNEL_MEMBERSHIP)
    chann.send({ content: `${ member.user.username }#${member.user.discriminator} just left!`});
    updateUser(
      { discordId, update: { lastLeft: Moment() }},
      async (errMsg) => {
        await chann.send({ content: `Error updating user: ${ member.user.username }#${member.user.discriminator} ${errMsg}`});
      }
    )
  });

  // handle bot commands
  listener.on("messageCreate", async (message) => {
    if (message.author.bot) return false;

    if (message.content == "/commands") {
      let commands = "*** DM Commands ***\n"
      commands += "/enroll-price - Current price of enrollment\n"
      commands += "/status - Current membership status\n"
      commands += "/get-referrer - User's referrer\n"
      commands += "/get-referrals - View status of current and recent referrals and bounties\n"
      commands += "/get-wallet - Users's associated wallet\n"
      commands += "/set-wallet <PUB_KEY> - Associate user's wallet public key\n"
      commands += "/enroll-transaction <TRX_ID> - Verify membership payment to degenbible.sol with payment transaction id & gain membership\n"
      commands += "/list-floor-trackers - List all your current active floor trackers\n"
      commands += "/delete-floor-tracker <TRACKER_NUM> - Delete floor tracker by number in floor tracker list\n"
      commands += "/track-sales - Get a DM whenever a Magic Eden sale is detected in the wallet set by /set-wallet\n"
      commands += "/untrack-sales - Disable Magic Eden sales tracker\n\n"

      commands += "*** Channel Commands ***\n"
      commands += "/notify-floor-above <FLOOR_PRICE> - Send in the channel of the collection you want a DM alert when the floor price is ABOVE a certain number\n"
      commands += "/notify-floor-below <FLOOR_PRICE> - Send in the channel of the collection you want a DM alert when the floor price is BELOW a certain number\n"

      await message.reply({ content: commands, ephemeral: true })
      return false
    }

    if (message.channel.type !== "DM") {
      const collMap = FindGlobalCollMapByChannel(message.channel.id)
      if (!collMap) return false;

      if (message.content.startsWith("/notify-floor-")) {
        const discordId = message.author.id
        const user = await getUserByDiscord(discordId, discordHandleErr)
        if ( !user ) {
          await message.reply({ content: "User not found. Please contact an admin.", ephemeral: true })
          return false
        }
        if ( !user.isOG && !user.isEnrolled && (user.inactiveDate && Moment(user.inactiveDate).isBefore(Moment()))) {
          await message.reply({ content: "Floor tracker only available for members and OG.", ephemeral: true })
          return false
        }

        let trackType
        const splitMsg = message.content.split(" ")
        if (splitMsg.length === 2) {
          trackType = splitMsg[0].split("-")[2]
        }
        if ( splitMsg.length !== 2 || isNaN(parseFloat(splitMsg[1])) || !["above", "below"].includes( trackType )) {
          await message.reply({
            content: "Invalid command",
            ephemeral: true,
          });
          return false
        }
        const isAbove = trackType == "above"
        const floor = parseFloat(splitMsg[1])
        const tracker = await createFloorTracker({
          userId: user.id,
          discordId: user.discordId,
          collection: collMap.collection,
          isAbove,
          floor,
        })
        if (tracker) {
          await message.reply({
            content: `Alert set for: ${collMap.collection} floor ${trackType} ${floor}`,
            ephemeral: true,
          })
        }
      }

      return false;
    }

    // get enroll price
    if (message.content == "/enroll-price") {
      await syncEnrollment()
      let content = `Current enrollment price: ${ enrollment.price } SOL\n`
      content += `Current round membership: ${ enrollment.currentCount }/${ enrollment.limit }\n`
      content += `Treasury Address: degenbible.sol\n`
      await message.reply({ content, ephemeral: true })
      return false
    }

    // get status
    if (message.content == "/status") {
      const discordId = message.author.id
      const user = await getUserByDiscord(discordId, discordHandleErr)
      if ( user ) {
        let status = `Trial - Active until ${ Moment( user.trialEnd ).format('dddd, MMM Do h:mm A ZZ') }`
        if ( user.isEnrolled ) status = `Member - Enrolled on ${ Moment( user.enrolledAt ).format('dddd, MMM Do h:mm A ZZ') }`
        if ( user.isOG ) status = "OG Member"
        await message.reply({ content: status, ephemeral: true })
      }

      return false
    }

    // get wallet address
    if (message.content == "/get-wallet") {
      const discordId = message.author.id
      const user = await getUserByDiscord(discordId, discordHandleErr)
      if ( user ) {
        await message.reply({ content: `Wallet: ${user.walletPublicKey || "Not Set"}`, ephemeral: true })
      }

      return false
    }

    // set wallet address
    if (message.content.startsWith("/set-wallet ")) {
      const splitMsg = message.content.split(" ")
      if ( splitMsg.length !== 2 || splitMsg[1].length !== 44 ) {
        await message.reply({
          content: "Invalid command",
          ephemeral: true,
        });
        return false
      }
      const discordId = message.author.id
      const user = await getUserByDiscord(discordId, discordHandleErr)
      if ( !user ) return false

      const walletPublicKey = splitMsg[1]
      const updSuccess = await updateUser(
        { discordId, update: { walletPublicKey }},
        async (content) => {
          await message.reply({ content, ephemeral: true });
        }
      )
      if ( updSuccess ) {
        await message.reply({ content: "Wallet successfully updated", ephemeral: true })
      }

      return false
    }

    // track ME sales
    if (message.content === "/track-sales") {
      const discordId = message.author.id
      const user = await getUserByDiscord(discordId, discordHandleErr)
      if ( !user ) {
        await message.reply({ content: "User not found. Please contact an admin.", ephemeral: true })
        return false
      }
      if ( !user.isOG && !user.isEnrolled && (user.inactiveDate && Moment(user.inactiveDate).isBefore(Moment()))) {
        await message.reply({ content: "Sales tracker only available for members and OG.", ephemeral: true })
        return false
      }

      const updSuccess = await updateUser(
        { discordId, update: { trackMagicEdenSales: true }},
        async (content) => {
          await message.reply({ content, ephemeral: true });
        }
      )
      if ( updSuccess ) {
        await message.reply({ content: "Magic Eden sales tracker active!", ephemeral: true })
      }

      return false
    }

    // untrack ME sales
    if (message.content === "/untrack-sales") {
      const discordId = message.author.id
      const user = await getUserByDiscord(discordId, discordHandleErr)
      if ( !user ) {
        await message.reply({ content: "User not found. Please contact an admin.", ephemeral: true })
        return false
      }
      if ( !user.trackMagicEdenSales ) {
        await message.reply({ content: "Sales tracker is already deactivated", ephemeral: true })
        return false
      }

      const updSuccess = await updateUser(
        { discordId, update: { trackMagicEdenSales: false }},
        async (content) => {
          await message.reply({ content, ephemeral: true });
        }
      )
      if ( updSuccess ) {
        await message.reply({ content: "Magic Eden sales tracker deactivated!", ephemeral: true })
      }

      return false
    }

    // get inviter
    if (message.content == "/get-referrer") {
      const discordId = message.author.id
      const user = await getUserByDiscord(discordId, discordHandleErr)
      if ( user ) {
        let inviterTxt = "None"
        if ( user.referrerDiscordId ) {
          const inviter = await getUserByDiscord(user.referrerDiscordId, discordHandleErr)
          inviterTxt = inviter.discordName
        }
        await message.reply({ content: `Inviter: ${inviterTxt}\nInvite code: ${ user.inviteId || "None" }`, ephemeral: true })
      }

      return false
    }

    // get referrals
    if (message.content == "/get-referrals") {
      const discordId = message.author.id

      const user = await getUserByDiscord(discordId, discordHandleErr)
      if ( !user ) {
        await message.reply({ content: "User not found. Please contact an admin.", ephemeral: true })
        return false
      }
      if ( !user.isOG && !user.isEnrolled ) {
        await message.reply({ content: "Referral program only available to members and OG.", ephemeral: true })
        return false
      }

      const referrals = await getReferrals(discordId, discordHandleErr)
      if ( referrals ) {
        const {
          currentStart,
          currentEnd,
          prevStart,
          currentReferrals = [],
          currentEnrollees = [],
          prevReferrals = [],
          prevEnrollees = [],
        } = referrals

        let response = `Current Period: ${ Moment( currentStart ).format('dddd, MMM Do') } - ${ Moment( currentEnd ).format('dddd, MMM Do') }\n`
        response += `Bounty reward per referral enrollment: ${ enrollment.price } SOL\n`
        response += `Joined (${ currentReferrals.length }) - ${ currentReferrals.map( r => r.discordName ).join(", ") || "None" }\n`
        response += `Enrolled (${ currentEnrollees.length }) - ${ currentEnrollees.map( r => r.discordName ).join(", ") || "None" }\n`
        response += `Bounties - ${ currentEnrollees.reduce((acc, curr) => acc + curr.bounty, 0.0) } SOL\n\n`

        response += `Previous Period: ${ Moment( prevStart ).format('dddd, MMM Do') } - ${ Moment( currentStart ).format('dddd, MMM Do') }\n`
        response += `Joined (${ prevReferrals.length }) - ${ prevReferrals.map( r => r.discordName ).join(", ") || "None" }\n`
        response += `Enrolled (${ prevEnrollees.length }) - ${ prevEnrollees.map( r => r.discordName ).join(", ") || "None" }\n`
        response += `Bounties - ${ prevEnrollees.reduce((acc, curr) => acc + curr.bounty, 0.0) } SOL\n`

        await message.reply({ content: response, ephemeral: true })
      }

      return false
    }

    // enroll transaction
    if (message.content.startsWith("/enroll-transaction ")) {
      const splitMsg = message.content.split(" ")
      if ( splitMsg.length !== 2 || splitMsg[1].length < 80  ) {
        await message.reply({
          content: "Invalid command",
          ephemeral: true,
        });
        return false
      }
      const discordId = message.author.id
      // validate user and wallet exists
      const user = await getUserByDiscord(discordId, discordHandleErr)
      if ( !user ) return false
      if ( !user.walletPublicKey ) {
        await message.reply({ content: "Your wallet is not set up yet please use /set-wallet first", ephemeral: true })
        return false
      }
      if ( user.isEnrolled ) {
        await message.reply({ content: "User already enrolled", ephemeral: true })
        return false
      }

      const trxAddr = splitMsg[1]
      const treasuryAddr = process.env.TREASURY_ADDRESS
      try {
        // validate recent trx
        const trx = await getSolTransaction(trxAddr)
        if ( Moment.unix(trx.blockTime).isBefore(Moment().add(-12, "hours") )) {
          await message.reply({
            content: `Invalid transaction. Transaction was sent over 12 hours ago`,
            ephemeral: true,
          });
          return false 
        }

        // validate matches user wallet
        const userBalChg = await checkBalChange(trx, user.walletPublicKey)
        if ( userBalChg >= 0 ) {
          await message.reply({
            content: `Transaction does not match wallet address`,
            ephemeral: true,
          });
          return false 
        }

        // validate payment amount
        const treasuryBalChg = await checkBalChange(trx, treasuryAddr)
        const enrollPrice = enrollment.price
        if ( treasuryBalChg < enrollPrice ) {
          await message.reply({
            content: `Transaction amount ${ treasuryBalChg } is less than fee of ${ enrollPrice }`,
            ephemeral: true,
          });
          return false 
        }

        // enrollment successful
        const updateSucc = await updateUser(
          { discordId, update: {
            isEnrolled: true,
            enrollRound: enrollment.round,
            enrolledAt: Moment(),
            transactionId: trxAddr,
            transactionAmount: treasuryBalChg,
            bounty: enrollment.defaultBounty,
          }},
          errMsg => message.reply({
            content: errMsg,
            ephemeral: true,
          }),
        )
        if (!updateSucc) return false;

        // add role
        const server = listener.guilds.cache.get(process.env.SERVER_ID);
        const msgUser = server.members.cache.get(discordId);
        await msgUser.roles.add(process.env.MEMBER_ROLE_ID)
        await message.reply({
          content: `Enrollment confirmed!`,
          ephemeral: true,
        });

        // broadcast event
        const chann = listener.channels.cache.get(process.env.CHANNEL_MEMBERSHIP)
        chann.send({ content: `${ user.discordName } just Enrolled for ${ treasuryBalChg } SOL!` });

        const channEnrolled = listener.channels.cache.get(process.env.CHANNEL_RD_MEMBERS)
        await syncEnrollment()
        const enrolledTxt = getMembershipString(enrollment)
        console.log('enrolledTxt: ', enrolledTxt)
        channEnrolled.setName(enrolledTxt)
      } catch(e) {
        await message.reply({
          content: `Error: ${e}`,
          ephemeral: true,
        });
      }
    }

    // get floor trackers
    if (message.content == "/list-floor-trackers") {
      const discordId = message.author.id

      const user = await getUserByDiscord(discordId, discordHandleErr)
      if ( !user ) {
        await message.reply({ content: "User not found. Please contact an admin.", ephemeral: true })
        return false
      }
      if ( !user.isOG && !user.isEnrolled ) {
        await message.reply({ content: "Floor tracking only available to members and OG.", ephemeral: true })
        return false
      }

      const trackers = await getUserFloorTrackers(discordId, discordHandleErr)
      if ( trackers ) {
        let content = trackers.map( (tracker,i) => `${i+1}) ${tracker.collection} floor ${tracker.isAbove ? "above" : "below"} ${tracker.floor} SOL` ).join("\n")
        if ( !content ) content = "None"
        await message.reply({ content, ephemeral: true })
      }

      return false
    }

    // delete floor tracker
    if (message.content.startsWith("/delete-floor-tracker ")) {
      const discordId = message.author.id

      const idx = parseFloat(message.content.split(" ")[1])
      if (isNaN(idx)) {
        await message.reply({ content: "Invalid command", ephemeral: true })
        return false
      }

      const user = await getUserByDiscord(discordId, discordHandleErr)
      if ( !user ) {
        await message.reply({ content: "User not found. Please contact an admin.", ephemeral: true })
        return false
      }
      if ( !user.isOG && !user.isEnrolled ) {
        await message.reply({ content: "Floor tracking only available to members and OG.", ephemeral: true })
        return false
      }

      const trackers = await getUserFloorTrackers(discordId, discordHandleErr)
      if ( trackers ) {
        if (idx > trackers.length) {
          await message.reply({ content: "Invalid tracker number", ephemeral: true })
          return false
        }
        const tracker = trackers[idx-1]
        const success = await deleteFloorTrackers(
          [tracker.id],
          async (errMsg) => await message.reply({ content: errMsg, ephemeral: true }),
        )
        if ( success ) {
          await message.reply({
            content: `* ${ tracker.collection } ${ tracker.isAbove ? "Above" : "Below" } Floor Tracker * has been deleted`,
            ephemeral: true,
          })
        }
      }

      return false
    }

    // see wallet
    if (message.content.startsWith("/see-wallet ")) {
      const splitMsg = message.content.split(" ")
      if ( splitMsg.length !== 2 || splitMsg[1].length !== 44 ) {
        await message.reply({
          content: "Invalid command",
          ephemeral: true,
        });
        return false
      }

      const discordId = message.author.id
      const user = await getUserByDiscord(discordId, discordHandleErr)
      if ( !user ) return false
      if ( !user.isOG && !user.isEnrolled ) {
        await message.reply({ content: "Floor tracking only available to members and OG.", ephemeral: true })
        return false
      }

      const walletPublicKey = splitMsg[1]
      console.log('before get wallets...')
      const wallets = await getWallets(user.id, [walletPublicKey], discordHandleErr)
      console.log('after get wallets:', wallets)

      let content = ""
      for (let i=0; i < (wallets || []).length; i++) {
        const wallet = wallets[i]
        console.log('wallet...')
        content += `\nWallet ${wallet.publicKey.slice(0,5)}...\nTracked\n`
        if ( wallet.nfts.size() > 0 ) {
          for (const nfts of wallet.nfts.values()) {
            nfts.forEach( nft => {
              console.log('nft...')
              content += `${nft.title}\n`
            })
          }
        }

        content += `Untracked:\n`
        if ( wallet.untracked.size() > 0) {
          for (const [updAuth, metadatas] of wallet.untracked.entries()) {
            metadatas.forEach( metadata => {
              content += `${metadata.data.name}\n`
            })
          }
        }
      }
      if (content === "") {
        content = "Empty!"
      }

      console.log(content)

      await message.reply({ content, ephemeral: true })
      return false
    }
  });

  // subscribe coll role
  listener.on('messageReactionAdd', async (reaction, user) => {
    console.log('reaction add')
    console.log('messageId: ', reaction.message.id)
    console.log('discordId: ', user.id)
    console.log('emoji: ', reaction._emoji.name)
    const server = listener.guilds.cache.get(process.env.SERVER_ID);
    const msgUser = server.members.cache.get(user.id);

    // add ALL roles
    if ( reaction.message.id === process.env.MARKETS_PIN_ID ) {
      if ( reaction._emoji.name === "🧹" ) {
        msgUser.roles.add(process.env.ALL_FLOOR_ROLE_ID)
      } else if ( reaction._emoji.name === "📊" ) {
        msgUser.roles.add(process.env.ALL_SUGG_ROLE_ID)
      } else if ( reaction._emoji.name === "⏰" ) {
        msgUser.roles.add(process.env.ALL_PUMP_ROLE_ID)
      }
      return
    }

    let collMap = FindGlobalCollMapByPin( reaction.message.id )
    if ( !collMap ) return
  
    // create role if doesnt exist
    const hasNewRoles = await createCollRoles(server, collMap)
    if ( hasNewRoles ) collMap = GetGlobalCollMap( collMap.id )

    // add requested role to user
    if ( reaction._emoji.name === "🧹" ) {
      msgUser.roles.add(collMap.floorRole)
    } else if ( reaction._emoji.name === "📊" ) {
      msgUser.roles.add(collMap.suggestedRole)
    } else if ( reaction._emoji.name === "⏰" ) {
      msgUser.roles.add(collMap.pumpRole)
    }
  });

  // unsubscribe coll role
  listener.on('messageReactionRemove', async (reaction, user) => {
    console.log('reaction remove')
    console.log('messageId: ', reaction.message.id)
    console.log('discordId: ', user.id)
    console.log('emoji: ', reaction._emoji.name)
    const server = listener.guilds.cache.get(process.env.SERVER_ID);
    const msgUser = server.members.cache.get(user.id);

    // add ALL roles
    if ( reaction.message.id === process.env.MARKETS_PIN_ID ) {
      if ( reaction._emoji.name === "🧹" ) {
        msgUser.roles.remove(process.env.ALL_FLOOR_ROLE_ID)
      } else if ( reaction._emoji.name === "📊" ) {
        msgUser.roles.remove(process.env.ALL_SUGG_ROLE_ID)
      } else if ( reaction._emoji.name === "⏰" ) {
        msgUser.roles.remove(process.env.ALL_PUMP_ROLE_ID)
      }
      
      return
    }

    let collMap = FindGlobalCollMapByPin( reaction.message.id )
    if ( !collMap ) return

    // create role if doesnt exist
    const hasNewRoles = await createCollRoles(server, collMap)
    if ( hasNewRoles ) collMap = GetGlobalCollMap( collMap.id )

    if ( reaction._emoji.name === "🧹" ) {
      msgUser.roles.remove(collMap.floorRole)
    } else if ( reaction._emoji.name === "📊" ) {
      msgUser.roles.remove(collMap.suggestedRole)
    } else if ( reaction._emoji.name === "⏰" ) {
      msgUser.roles.remove(collMap.pumpRole)
    }
  });

  listener.login(process.env.DISCORD_BOT_TOKEN);
};

// helpers

const createCollRoles = async (server, collMap) => {
  let created = false
  // create floor role
  if ( !collMap.floorRole ) {
    const roleName = `${ collMap.collection } Floor`
    const role = await server.roles.create({
      name: roleName,
      color: 'BLUE',
    })
    console.log('New Floor Role: ', role.id)

    const updCollMap = await updateCollMap(
      collMap.id,
      { id: collMap.id, floorRole: role.id },
      errMsg => console.error(`Err updating collection map: ${ errMsg }`)
    );
    if (updCollMap) UpdateGlobalCollMap(updCollMap);
    created = true
  }

  // create sugg role
  if ( !collMap.suggestedRole ) {
    const roleName = `${ collMap.collection } Suggested`
    const role = await server.roles.create({
      name: roleName,
      color: 'YELLOW',
    })
    console.log('New Suggested Role: ', role.id)

    const updCollMap = await updateCollMap(
      collMap.id,
      { id: collMap.id, suggestedRole: role.id },
      errMsg => console.error(`Err updating collection map: ${ errMsg }`)
    );
    if (updCollMap) UpdateGlobalCollMap(updCollMap);
    created = true
  }

  // create pump role
  if ( !collMap.pumpRole ) {
    const roleName = `${ collMap.collection } Pump`
    const role = await server.roles.create({
      name: roleName,
      color: 'RED',
    })
    console.log('New Pump Role: ', role.id)

    const updCollMap = await updateCollMap(
      collMap.id,
      { id: collMap.id, pumpRole: role.id },
      errMsg => console.error(`Err updating collection map: ${ errMsg }`)
    );
    if (updCollMap) UpdateGlobalCollMap(updCollMap);
    created = true
  }

  return created
}