import { CronJob } from "cron";
import Moment from "moment";
import { Client, Snowflake, TextChannel, Webhook } from "discord.js";
import { Config, Rule } from "../types";
import {
  buildMessage,
  getMarketListings,
  shouldBroadcast,
  shouldBroadcastErr,
} from "../helpers";
import config from "../config.json";

class CronBot {
  client: Client;
  rule: Rule;
  broadcasts: Map<string, Moment.Moment>;

  constructor(client: Client, rule: Rule) {
    this.client = client;
    this.rule = rule;
    this.broadcasts = new Map();
  }

  async handleMessage(apiColl: string, channelId: string): Promise<void> {
    console.log(
      `sending ${apiColl} msg to channel ${channelId} @ ${Moment().format()}`
    );

    const errBroadcastKey = apiColl + "-err";
    const webhook = await this._getWebhook(channelId);

    // get data
    const tracker = await getMarketListings(apiColl);
    if (tracker instanceof Error) {
      if (shouldBroadcastErr(this.broadcasts.get(errBroadcastKey))) {
        await webhook.send(`@timchi Error getting ${apiColl} data!`);
        this.broadcasts.set(errBroadcastKey, Moment());
      }
      return;
    }

    // send msg
    const msg = buildMessage(tracker, apiColl);
    if (shouldBroadcast(tracker, this.broadcasts.get(apiColl))) {
      await webhook.send(msg);
      this.broadcasts.set(apiColl, Moment());
    }
  }

  async sendMessages(): Promise<void> {
    this.handleMessage(
      process.env.API_PATH_DEGODS as string,
      process.env.CHANNEL_DEGODS as string
    );
    this.handleMessage(
      process.env.API_PATH_JUNGLE_CATS as string,
      process.env.CHANNEL_JUNGLE_CATS as string
    );
    this.handleMessage(
      process.env.API_PATH_ROGUE_SHARKS as string,
      process.env.CHANNEL_ROGUE_SHARKS as string
    );
    this.handleMessage(
      process.env.API_PATH_FAMOUS_FOX as string,
      process.env.CHANNEL_FAMOUS_FOX as string
    );
    this.handleMessage(
      process.env.API_PATH_GRIM_SYNDICATE as string,
      process.env.CHANNEL_GRIM_SYNDICATE as string
    );
    this.handleMessage(
      process.env.API_PATH_SOLSTEADS as string,
      process.env.CHANNEL_SOLSTEADS as string
    );
    this.handleMessage(
      process.env.API_PATH_AURORY as string,
      process.env.CHANNEL_AURORY as string
    );
    this.handleMessage(
      process.env.API_PATH_PESKY_PENGUINS as string,
      process.env.CHANNEL_PESKY_PENGUINS as string
    );

    // this.handleMessage(
    //   process.env.API_PATH_MEERKAT as string,
    //   process.env.CHANNEL_MEERKAT as string
    // );
  }

  private async _getWebhook(channelId: Snowflake): Promise<Webhook> {
    const channel = (await this.client.channels.fetch(
      channelId
    )) as TextChannel;
    const webhooks = await channel.fetchWebhooks();

    return !webhooks.size
      ? channel.createWebhook(this.client.user?.username || "📢")
      : (webhooks.first() as Webhook);
  }
}

module.exports = async (client: Client): Promise<void> => {
  console.log(__dirname.split("\\").slice(-2)[0]);

  (config as Config).rules.forEach((rule) => {
    const bot = new CronBot(client, rule);
    new CronJob(
      rule.cronExpression,
      () => bot.sendMessages(),
      null,
      true,
      config.timezone
    );
  });
};
