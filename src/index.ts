import "dotenv/config";
import path from "path";
import { Intents } from "discord.js";
import { CoreClient } from "discord-bot-core-client";

const client = new CoreClient({
  token: process.env.DISCORD_BOT_TOKEN as string,
});

client.registerBotsIn(path.resolve(__dirname, "bots")).start();
