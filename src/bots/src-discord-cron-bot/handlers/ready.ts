import { CronJob } from "cron";
import rest from "../rest";
import Moment from "moment";
import {
  Client,
  EmojiResolvable,
  Message,
  Snowflake,
  TextChannel,
  Webhook,
  WebhookMessageOptions,
} from "discord.js";
import {
  Config,
  CronRuleItem,
  Policy,
  Rule,
  CollectionTrackerResp,
} from "../types";
import config from "../config.json";

const getRandomInt = (min: number, max: number): number => {
  min = Math.ceil(min);
  max = Math.floor(max);

  return Math.floor(Math.random() * (max - min) + min);
};

class CronBot {
  client: Client;
  rule: Rule;
  lastBroadcast: Moment.Moment | undefined;

  constructor(client: Client, rule: Rule) {
    this.client = client;
    this.rule = rule;
  }

  async sendMessages(): Promise<void> {
    const channelIds = this._applyPolicyToList(
      this.rule.channelPolicy,
      this.rule.channelIds
    ) as Snowflake[];

    const {
      data: {
        tracker: {
          collection,
          currentBest,
          currentListings,
          floorPrice,
          lastDayFloor,
          lastWeekFloor,
        },
      },
    } = (await rest.get("/degods")) as CollectionTrackerResp;

    // eslint-disable-next-line prettier/prettier
    let msg = `${currentBest.isNew ? "@everyone " : ""} ${collection} [${currentBest.rank} @ ${currentBest.price}](<${currentBest.url}>)\n`;
    // eslint-disable-next-line prettier/prettier
    msg += `Current Floor: ${floorPrice.floorPrice.toFixed(2)} ${ floorPrice.percentChange ? `%${floorPrice.percentChange.toFixed(2)}` : ""}\n`;
    // eslint-disable-next-line prettier/prettier
    msg += `Past Floors: Day ${lastDayFloor.floorPrice.toFixed(2)} | Week ${lastWeekFloor.floorPrice.toFixed(2)}\n\n`;
    currentListings.forEach((listing) => {
      msg += `[${listing.rank} @ ${listing.price}](<${listing.url}>)\n`;
    });

    if (
      !currentBest.isNew &&
      !!this.lastBroadcast &&
      this.lastBroadcast.isAfter(Moment().add(-1, "hours"))
    ) {
      return;
    }

    channelIds.forEach(async (channelId) => {
      const webhook = await this._getWebhook(channelId);

      await webhook.send(msg);
    });

    this.lastBroadcast = Moment();
  }

  private _applyPolicyToList(
    policy?: Policy,
    list?: CronRuleItem[]
  ): CronRuleItem[] {
    if (!policy || !list || list.length === 0) {
      return [];
    }

    switch (policy) {
      case "all":
        return list;
      case "random":
        return [list[getRandomInt(0, list.length)]];
      case "single":
      default:
        return [list[0]];
    }
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
