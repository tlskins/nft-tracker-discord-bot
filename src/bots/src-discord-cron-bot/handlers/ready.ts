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
  MarketListing,
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
  lastDegodsBroadcast: Moment.Moment | undefined;
  lastJungleCatsBroadcast: Moment.Moment | undefined;

  constructor(client: Client, rule: Rule) {
    this.client = client;
    this.rule = rule;
  }

  async sendDegodsMessage(channelId: string): Promise<void> {
    console.log(
      `sending degods msg to channel ${channelId} @ ${Moment().format()}`
    );
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
    let degodsMsg = `${currentBest.isNew ? "@everyone\nNew Best " : ""}${collection} [Rank ${currentBest.rank} @ ${currentBest.price.toFixed(2)}](<${currentBest.url}>)\n`;
    // eslint-disable-next-line prettier/prettier
    degodsMsg += `Floors: Now ${floorPrice.floorPrice.toFixed(2)} ${ floorPrice.percentChange ? `%${floorPrice.percentChange.toFixed(2)}` : ""} | Day ${lastDayFloor.floorPrice.toFixed(2)} | Week ${lastWeekFloor.floorPrice.toFixed(2)}\n\n`;
    currentListings.forEach((listing) => {
      // eslint-disable-next-line prettier/prettier
      degodsMsg += `[${listing.rank} @ ${listing.price.toFixed(2)}](<${listing.url}>)\n`;
    });

    // eslint-disable-next-line prettier/prettier
    if ( !currentBest.isNew && !!this.lastDegodsBroadcast && this.lastDegodsBroadcast.isAfter(Moment().add(-1, "hours"))) {
      return;
    }

    const degodsHook = await this._getWebhook(channelId);
    await degodsHook.send(degodsMsg);
    this.lastDegodsBroadcast = Moment();
  }

  async sendJungleCatsMessage(channelId: string): Promise<void> {
    console.log(
      `sending jungle cats msg to channel ${channelId} @ ${Moment().format()}`
    );
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
    } = (await rest.get("/jungle-cats")) as CollectionTrackerResp;

    const getCatsLink = (listing: MarketListing): string => {
      // eslint-disable-next-line prettier/prettier
      const topAttrs = listing.topAttributes?.map( attr => attr.value ).join(", ") || "";
      // eslint-disable-next-line prettier/prettier
      return `[Score ${listing.rank} @ ${listing.price.toFixed(2)} (${topAttrs})](<${listing.url}>)`;
    };

    // eslint-disable-next-line prettier/prettier
    let catsMsg = `${currentBest.isNew ? "@everyone \nNew Best " : ""}${collection} ${getCatsLink(currentBest)}\n`;
    // eslint-disable-next-line prettier/prettier
    catsMsg += `Floors: Now ${floorPrice.floorPrice.toFixed(2)} ${ floorPrice.percentChange ? `%${floorPrice.percentChange.toFixed(2)}` : ""} | Day ${lastDayFloor.floorPrice.toFixed(2)} | Week ${lastWeekFloor.floorPrice.toFixed(2)}\n\n`;
    currentListings.forEach((listing) => {
      // eslint-disable-next-line prettier/prettier
      catsMsg += `${getCatsLink(listing)}\n`;
    });

    // eslint-disable-next-line prettier/prettier
    if ( !currentBest.isNew && !!this.lastJungleCatsBroadcast && this.lastJungleCatsBroadcast.isAfter(Moment().add(-1, "hours"))) {
      return;
    }

    const catsHook = await this._getWebhook(channelId);
    await catsHook.send(catsMsg);
    this.lastJungleCatsBroadcast = Moment();
  }

  async sendMessages(): Promise<void> {
    const channelIds = this._applyPolicyToList(
      this.rule.channelPolicy,
      this.rule.channelIds
    ) as Snowflake[];

    this.sendDegodsMessage(channelIds[0]);
    this.sendJungleCatsMessage(channelIds[1]);
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
