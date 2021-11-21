import "dotenv/config";
import rest from "./bots/src-discord-cron-bot/rest";
const { Client, Intents } = require("discord.js");

export const BuildListener = () => {
  return new Client({
    intents: [
      Intents.FLAGS.GUILD_MESSAGES,
      Intents.FLAGS.DIRECT_MESSAGES,
      Intents.FLAGS.DIRECT_MESSAGE_REACTIONS,
      Intents.FLAGS.GUILD_MEMBERS,
      Intents.FLAGS.GUILD_MESSAGES,
      Intents.FLAGS.GUILD_PRESENCES,
    ],
    partials: ["MESSAGE", "CHANNEL", "REACTION", "USER", "GUILD_MEMBER"],
  });
};

export const StartListener = (listener) => {
  listener.on("ready", () => {
    console.log(`Logged in as ${listener.user.tag}!`);
  });

  // dms for /verify
  listener.on("messageCreate", async (message) => {
    console.log("messageCreate ", message);
    if (message.author.bot) return false;

    console.log(`Message from ${message.author.username}: ${message.content}`);

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

// helpers

const generateCode = () => {
  const min = 100000;
  const max = 999999;
  //The maximum is exclusive and the minimum is inclusive
  return Math.floor(Math.random() * (max - min) + min);
};
