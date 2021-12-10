import "dotenv/config";
import rest from "./bots/src-discord-cron-bot/rest";
const { Client, Intents } = require("discord.js");

import { updateCollMap } from "./api";
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

export const StartListener = async (listener) => {
  listener.on("ready", () => {
    console.log(`Logged in as ${listener.user.tag}!`);
  });

  // dms for /verify
  listener.on("messageCreate", async (message) => {
    if (message.author.bot) return false;

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

    let collMap = FindGlobalCollMapByPin( reaction.message.id )
    if ( !collMap ) return
  
    const server = listener.guilds.cache.get(process.env.SERVER_ID);
    const msgUser = server.members.cache.get(user.id);

    // create role if doesnt exist
    const hasNewRoles = await createCollRoles(server, collMap)
    if ( hasNewRoles ) collMap = GetGlobalCollMap( collMap.id )

    // add requested role to user
    if ( reaction._emoji.name === "🧹" ) {
      msgUser.roles.add(collMap.floorRole)
    } else if ( reaction._emoji.name === "📊" ) {
      msgUser.roles.add(collMap.suggestedRole)
    } else if ( reaction._emoji.name === "🚨" ) {
      msgUser.roles.add(collMap.pumpRole)
    }
  });

  // unsubscribe coll role
  listener.on('messageReactionRemove', async (reaction, user) => {
    console.log('reaction remove')
    console.log('messageId: ', reaction.message.id)
    console.log('discordId: ', user.id)
    console.log('emoji: ', reaction._emoji.name)

    let collMap = FindGlobalCollMapByPin( reaction.message.id )
    if ( !collMap ) return

    const server = listener.guilds.cache.get(process.env.SERVER_ID);
    const msgUser = server.members.cache.get(user.id);

    // create role if doesnt exist
    const hasNewRoles = await createCollRoles(server, collMap)
    if ( hasNewRoles ) collMap = GetGlobalCollMap( collMap.id )

    if ( reaction._emoji.name === "🧹" ) {
      msgUser.roles.remove(collMap.floorRole)
    } else if ( reaction._emoji.name === "📊" ) {
      msgUser.roles.remove(collMap.suggestedRole)
    } else if ( reaction._emoji.name === "🚨" ) {
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
    console.log("error getting verification: ", err.response?.data)
  }
};

const updateRole = async ({ discordId, isOG }) => {
  console.log("sync og role...");
  try {
    await rest.put("/subscriptions/sync", { discordId, isOG });
  } catch( err ) {
    console.log("error syncing og role: ", err.response?.data)
  }
};

const syncAllMembershipRoles = async () => {
  console.log("sync membership roles...");
  try {
    await rest.post("/subscriptions/sync");
  } catch( err ) {
    console.log("error sync membership roles: ", err.response?.data)
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
      errMsg => console.log(`Err updating collection map: ${ errMsg }`)
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
      errMsg => console.log(`Err updating collection map: ${ errMsg }`)
    );
    if (updCollMap) UpdateGlobalCollMap(updCollMap);
    created = true
  }

  // create pump role
  if ( !collMap.suggestedRole ) {
    const roleName = `${ collMap.collection } Pump`
    const role = await server.roles.create({
      name: roleName,
      color: 'GREEN',
    })
    console.log('New Pump Role: ', role.id)

    const updCollMap = await updateCollMap(
      collMap.id,
      { id: collMap.id, pumpRole: role.id },
      errMsg => console.log(`Err updating collection map: ${ errMsg }`)
    );
    if (updCollMap) UpdateGlobalCollMap(updCollMap);
    created = true
  }

  return created
}