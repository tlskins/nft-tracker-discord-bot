import "dotenv/config";
import path from "path";
import { CoreClient } from "discord-bot-core-client";
const keepAlive = require("./server")

const client = new CoreClient({
  token: process.env.DISCORD_BOT_TOKEN as string,
});

keepAlive()

client.registerBotsIn(path.resolve(__dirname, "bots")).start();
