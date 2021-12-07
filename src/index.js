import "dotenv/config";
import path from "path";
import { CoreClient } from "discord-bot-core-client";
import { BuildListener, StartListener } from "./listener";

// cron bot for market updates
const client = new CoreClient({
  token: process.env.DISCORD_BOT_TOKEN,
});

client.registerBotsIn(path.resolve(__dirname, "bots")).start();

// listener for user mgmt
const listener = BuildListener();
StartListener(listener);