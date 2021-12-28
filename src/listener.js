import "dotenv/config";
import Moment from "moment";
const { Client, Intents } = require("discord.js");

import {
  updateCollMap,
  updateUser,
  geEnrolledCount,
  getReferrals,
  getUserByDiscord,
  createUser,
} from "./api";
import { checkBalChange, getSolTransaction } from "./solana";
import {
  FindGlobalCollMapByPin,
  GetGlobalCollMap,
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

const currentRoundEnrolled = async () => {
  const enrollRd = parseInt(process.env.ENROLL_ROUND)
  const enrollRdMax = process.env.ENROLL_ROUND_MAX
  const enrollData = await geEnrolledCount( enrollRd, msg => console.log(msg) )
  console.log('enrollata: ', enrollData)

  return `Rd ${enrollRd} - Members ${enrollData?.count || 0}/${enrollRdMax}`
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
    const enrollRd = parseInt(process.env.ENROLL_ROUND)
    const enrollPrice = process.env.ENROLL_PRICE
    const channPrice = listener.channels.cache.get(process.env.CHANNEL_ENROLL_PRICE)
    channPrice.setName(`Rd ${enrollRd} - Enroll Price: ${enrollPrice} SOL`)

    const channEnrolled = listener.channels.cache.get(process.env.CHANNEL_RD_MEMBERS)
    const enrolledTxt = await currentRoundEnrolled()
    console.log('enrolledTxt: ', enrolledTxt)
    channEnrolled.setName(enrolledTxt)
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
  });

  // handle bot commands
  listener.on("messageCreate", async (message) => {
    if (message.author.bot) return false;
    if (message.channel.type !== "DM") return false;

    // list commands
    if (message.content == "/commands") {
      let commands = "/enroll-price - Current price of enrollment\n"
      commands += "/status - Current membership status\n"
      commands += "/get-referrer - User's referrer\n"
      commands += "/get-referrals - View status of current and recent referrals and bounties\n"
      commands += "/get-wallet - Users's associated wallet\n"
      commands += "/set-wallet <PUB_KEY> - Associate user's wallet public key\n"
      commands += "/enroll-transaction <TRX_ID> - Verify membership payment to degenbible.sol with payment transaction id & gain membership\n"

      await message.reply({ content: commands, ephemeral: true })
      return false
    }

    // get enroll price
    if (message.content == "/enroll-price") {
      const enrollPrice = process.env.ENROLL_PRICE
      await message.reply({ content: `Current enrollment price: ${ enrollPrice } sol\nTreasury Address: degenbible.sol`, ephemeral: true })
      return false
    }

    // get status
    if (message.content == "/status") {
      const discordId = message.author.id
      const user = await getUserByDiscord(discordId, discordHandleErr)
      if ( user ) {
        let status = `Trial - Active until ${ Moment( user.trialEnd ).format('dddd, MMM Do h:mm a zz') }`
        if ( user.isEnrolled ) status = `Member - Enrolled on ${ Moment( user.enrolledAt ).format('dddd, MMM Do h:mm a zz') }`
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
      if ( !user.isOG || !user.isEnrolled ) {
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

        let response = `Current Period: ${ Moment( currentStart ).format('dddd, MMM Do h:mm a zz') } - ${ Moment( currentEnd ).format('dddd, MMM Do h:mm a zz') }\n`
        response += `Joined (${ currentReferrals.length }) - ${ currentReferrals.map( r => r.discordName ).join(", ") || "None" }\n`
        response += `Enrolled (${ currentEnrollees.length }) - ${ currentEnrollees.map( r => r.discordName ).join(", ") || "None" }\n`
        response += `Bounties - ${ currentEnrollees.reduce((prev, curr) => prev.bounty + curr.bounty, 0.0) } SOL\n\n`

        response += `Previous Period: ${ Moment( prevStart ).format('dddd, MMM Do h:mm a zz') } - ${ Moment( currentStart ).format('dddd, MMM Do h:mm a zz') }\n`
        response += `Joined (${ prevReferrals.length }) - ${ prevReferrals.map( r => r.discordName ).join(", ") || "None" }\n`
        response += `Enrolled (${ prevEnrollees.length }) - ${ prevEnrollees.map( r => r.discordName ).join(", ") || "None" }\n`
        response += `Bounties - ${ prevEnrollees.reduce((prev, curr) => prev.bounty + curr.bounty, 0.0) } SOL\n`

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
        const enrollPrice = process.env.ENROLL_PRICE
        if ( treasuryBalChg < enrollPrice ) {
          await message.reply({
            content: `Transaction amount ${ treasuryBalChg } is less than fee of ${ enrollPrice }`,
            ephemeral: true,
          });
          return false 
        }

        // enrollment successful
        const enrollRound = parseInt(process.env.ENROLL_ROUND)
        const updateSucc = await updateUser(
          { discordId, update: {
            isEnrolled: true,
            enrollRound,
            enrolledAt: Moment(),
            transactionId: trxAddr,
            transactionAmount: treasuryBalChg,
            bounty: parseFloat( process.env.BOUNTY_PRICE ),
          }},
          discordHandleErr,
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
        const enrolledTxt = await currentRoundEnrolled()
        console.log('enrolledTxt: ', enrolledTxt)
        channEnrolled.setName(enrolledTxt)
      } catch(e) {
        await message.reply({
          content: `Error: ${e}`,
          ephemeral: true,
        });
      }
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