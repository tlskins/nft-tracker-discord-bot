import "dotenv/config";
import rest from "./bots/src-discord-cron-bot/rest";
import Moment from "moment";
const { Client, Intents } = require("discord.js");

import { updateCollMap, updateUser, getUserByDiscord } from "./api";
import { checkBalChange, getSolTransaction } from "./solana";
import { FindGlobalCollMapByPin, GetGlobalCollMap, UpdateGlobalCollMap } from "./collMappings"

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
    ],
    partials: ["MESSAGE", "CHANNEL", "REACTION", "USER", "GUILD_MEMBER"],
  });
};

const discordHandleErr = async (content) => {
  await message.reply({ content, ephemeral: true });
}

export const StartListener = async (listener) => {
  listener.on("ready", () => {
    console.log(`Logged in as ${listener.user.tag}!`);
  });

  // handle bot comman ds
  listener.on("messageCreate", async (message) => {
    if (message.author.bot) return false;
    if (message.channel.type !== "DM") return false;

    // verify
    if (message.content === "/verify") {
      const verifyCode = generateCode();
      await startVerification({
        discordId: message.author.id,
        discordName: `${message.author.username}#${message.author.discriminator}`,
        verifyCode,
      });
      await message.reply({
        content: `Verification Code: ${verifyCode}`,
        ephemeral: true,
      });
      return false
    }

    // get enroll price
    if (message.content == "/enroll-price") {
      const enrollPrice = process.env.ENROLL_PRICE_SOL
      await message.reply({ content: `Current enrollment price: ${ enrollPrice } sol`, ephemeral: true })
      return false
    }

    // get wallet address
    if (message.content == "/get-wallet") {
      const discordId = message.author.id
      const user = await getUserByDiscord(discordId, discordHandleErr)
      if ( user ) {
        await message.reply({ content: `Wallet: ${user.walletPublicKey}`, ephemeral: true })
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
      const user = await getUserByDiscord(discordId, discordHandleErr)
      if ( !user ) return false

      const walletPublicKey = splitMsg[1]
      const discordId = message.author.id
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
        const enrollPrice = process.env.ENROLL_PRICE_SOL
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
            transactionId: trxAddr,
            transactionAmount: treasuryBalChg,
          }},
          discordHandleErr,
        )
        if ( updateSucc ) {
          const server = listener.guilds.cache.get(process.env.SERVER_ID);
          const msgUser = server.members.cache.get(discordId);
          await msgUser.roles.add(process.env.MEMBER_ROLE_ID)
          await message.reply({
            content: `Enrollment confirmed!`,
            ephemeral: true,
          });
        }
      } catch(e) {
        await message.reply({
          content: `Error: ${e}`,
          ephemeral: true,
        });
      }
    }
  });

  // role synchronization with db
  listener.on("guildMemberUpdate", async (oldMember, newMember) => {
    listener.users.cache.get(newMember.id)

    const discordId = newMember.user.id
    const isOG = newMember._roles.includes( process.env.OG_ROLE_ID )
    const wasOG = oldMember._roles.includes( process.env.OG_ROLE_ID )
    console.log("is OG", discordId, isOG, wasOG)
    if ( isOG !== wasOG ) {
      console.log('updating og role ', isOG, discordId)
      await updateRole({ discordId, isOG })
    }
  });

  // new member
  listener.on("guildMemberAdd", async (newMember) => {
    console.log("newMember", newMember);
    await syncAllMembershipRoles()
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

// controllers

const startVerification = async (req) => {
  console.log("startVerification...");
  try {
    await rest.put("/users/verify", req);
  } catch( err ) {
    console.error("error getting verification: ", err.response?.data)
  }
};

const updateRole = async ({ discordId, isOG }) => {
  console.log("sync og role...");
  try {
    await rest.put("/subscriptions/sync", { discordId, isOG });
  } catch( err ) {
    console.error("error syncing og role: ", err.response?.data)
  }
};

const syncAllMembershipRoles = async () => {
  console.log("sync membership roles...");
  try {
    await rest.post("/subscriptions/sync");
  } catch( err ) {
    console.error("error sync membership roles: ", err.response?.data)
  }
};

// helpers

const generateCode = () => {
  const min = 100000;
  const max = 999999;
  //The maximum is exclusive and the minimum is inclusive
  return Math.floor(Math.random() * (max - min) + min);
};

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