import "dotenv/config";
import rest from "./bots/src-discord-cron-bot/rest";
const { Client, Intents } = require("discord.js");

import { getCollectionMappings } from "./api";
import { FindCollMapByPinId } from "./collMappings"

var collMaps = []

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
  // initializers
  const collMaps = await getCollectionMappings((msg) => console.log(`Err getting coll maps: ${msg}`))
  console.log(`${ collMaps.size } Collection Mappings found`);

  listener.on("ready", () => {
    console.log(`Logged in as ${listener.user.tag}!`);
  });

  // dms for /verify
  listener.on("messageCreate", async (message) => {
    console.log("messageCreate ", message);
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
  listener.on("guildMemberUpdate", async (_, newMember) => {
    console.log("newMember", newMember);

    listener.users.cache.get(newMember.id)

    const discordId = newMember.user.id
    const isOG = newMember._roles.includes( process.env.OG_ROLE_ID )
    console.log("is OG", discordId, isOG)
    await updateRole({ discordId, isOG })
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
    console.log('deleted: ', reaction.message.deleted)
    console.log('emoji: ', reaction._emoji.name)

    let collMap = FindCollMapByPinId( reaction.message.id )
    if ( !collMap ) return
  
    const server = listener.guilds.cache.get(process.env.SERVER_ID);
    const msgUser = server.members.cache.get(user.id);
    if ( reaction._emoji.name === "🧹" ) {
      msgUser.roles.add(collMap.floorRole)
    } else if ( reaction._emoji.name === "📊" ) {
      msgUser.roles.add(collMap.suggestedRole)
    }
  });

  // unsubscribe coll role
  listener.on('messageReactionRemove', async (reaction, user) => {
    console.log('reaction remove')
    console.log('messageId: ', reaction.message.id)
    console.log('discordId: ', user.id)
    console.log('deleted: ', reaction.message.deleted)
    console.log('emoji: ', reaction._emoji.name)

    let collMap = FindCollMapByPinId( reaction.message.id )
    if ( !collMap ) return

    const server = listener.guilds.cache.get(process.env.SERVER_ID);
    const msgUser = server.members.cache.get(user.id);
    if ( reaction._emoji.name === "🧹" ) {
      msgUser.roles.remove(collMap.floorRole)
    } else if ( reaction._emoji.name === "📊" ) {
      msgUser.roles.remove(collMap.suggestedRole)
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
