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
    ],
    partials: ["MESSAGE", "CHANNEL", "REACTION", "USER"],
  });
};

export const StartListener = (listener) => {
  listener.on("ready", () => {
    console.log(`Logged in as ${listener.user.tag}!`);
  });

  listener.on("messageCreate", async (message) => {
    console.log("messageCreate ", message);
    if (message.author.bot) return false;

    console.log(`Message from ${message.author.username}: ${message.content}`);

    if (message.content === "/verify") {
      const verifyCode = generateCode()
      await startVerification({
        discordId: message.author.id,
        discordName: `${message.author.username}#${message.author.discriminator}`,
        verifyCode,
      })
      await message.reply({ content: `Verification Code: ${verifyCode}`, ephemeral: true });
    }

  });

  listener.login(process.env.DISCORD_BOT_TOKEN);
};

// controllers

const startVerification = async (req) => {
  console.log("startVerification...");
  await rest.put("/users/verify", req);
};

// helpers

const generateCode = () => {
  const min = 100000;
  const max = 999999;
    //The maximum is exclusive and the minimum is inclusive
  return Math.floor(Math.random() * (max - min) + min);
}