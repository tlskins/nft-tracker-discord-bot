import { CronJob } from "cron";
import rest from "../rest";
import Moment from "moment";
import { Client, Snowflake, TextChannel, Webhook } from "discord.js";
import { Config, Rule, CollectionTrackerResp, MarketListing } from "../types";
import {
  buildMessage,
  getMarketListings,
  getBestRankTxt,
  getFloorPriceTxt,
  shouldBroadcast,
} from "../helpers";
import config from "../config.json";

class CronBot {
  client: Client;
  rule: Rule;
  lastDegodsBroadcast: Moment.Moment | undefined;
  lastDegodsErrBroadcast: Moment.Moment | undefined;
  lastJungleCatsBroadcast: Moment.Moment | undefined;
  lastJungleCatsErrBroadcast: Moment.Moment | undefined;
  lastRogueSharksBroadcast: Moment.Moment | undefined;
  lastRogueSharksErrBroadcast: Moment.Moment | undefined;
  lastMeerkatsBroadcast: Moment.Moment | undefined;
  lastMeerkatsErrBroadcast: Moment.Moment | undefined;
  lastFamousFoxBroadcast: Moment.Moment | undefined;
  lastFamousFoxErrBroadcast: Moment.Moment | undefined;

  constructor(client: Client, rule: Rule) {
    this.client = client;
    this.rule = rule;
  }

  // legacy degods implementation from alpha art
  async sendDegodsMessage(channelId: string): Promise<void> {
    console.log(
      `sending degods msg to channel ${channelId} @ ${Moment().format()}`
    );

    let collectionData: CollectionTrackerResp;
    try {
      collectionData = (await rest.get("/degods")) as CollectionTrackerResp;
    } catch (err) {
      console.log(err);
      const degodsHook = await this._getWebhook(channelId);
      await degodsHook.send("@timchi Error getting degods data!");

      return;
    }

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
    } = collectionData;

    const getDegodsLink = (listing: MarketListing): string => {
      const bestRk = getBestRankTxt(listing);

      // eslint-disable-next-line prettier/prettier
      return `[Rank ${listing.rank?.toFixed(0)} | Score ${listing.score.toFixed(2)} @ ${listing.price.toFixed(2)} ${bestRk}](<${listing.url}>)`;
    };

    // eslint-disable-next-line prettier/prettier
    let degodsMsg = `${currentBest.isNew ? "@everyone\nNew Best" : "Best"} ${collection} ${getDegodsLink(currentBest)}\n`;
    degodsMsg +=
      getFloorPriceTxt(floorPrice, lastDayFloor, lastWeekFloor) + "\n";
    currentListings.forEach((listing) => {
      degodsMsg += `${getDegodsLink(listing)}\n`;
    });

    // eslint-disable-next-line prettier/prettier
    if ( !currentBest.isNew && !!this.lastDegodsBroadcast && this.lastDegodsBroadcast.isAfter(Moment().add(-1, "hours"))) {
      return;
    }

    const degodsHook = await this._getWebhook(channelId);
    await degodsHook.send(degodsMsg);
    this.lastDegodsBroadcast = Moment();
  }

  async sendRogueSharksMessage(channelId: string): Promise<void> {
    console.log(
      `sending rogue sharks msg to channel ${channelId} @ ${Moment().format()}`
    );

    const webhook = await this._getWebhook(channelId);
    const tracker = await getMarketListings(
      "rogue-sharks",
      webhook,
      this.lastRogueSharksErrBroadcast
    );
    if (!tracker) {
      this.lastRogueSharksErrBroadcast = Moment();
      return;
    }
    const msg = buildMessage(tracker);
    if (shouldBroadcast(tracker, this.lastRogueSharksBroadcast)) {
      await webhook.send(msg);
      this.lastRogueSharksBroadcast = Moment();
    }
  }

  async sendJungleCatsMessage(channelId: string): Promise<void> {
    console.log(
      `sending jungle cats msg to channel ${channelId} @ ${Moment().format()}`
    );

    const webhook = await this._getWebhook(channelId);
    const tracker = await getMarketListings(
      "jungle-cats",
      webhook,
      this.lastJungleCatsErrBroadcast
    );
    if (!tracker) {
      this.lastJungleCatsErrBroadcast = Moment();
      return;
    }
    const msg = buildMessage(tracker);
    if (shouldBroadcast(tracker, this.lastJungleCatsBroadcast)) {
      await webhook.send(msg);
      this.lastJungleCatsBroadcast = Moment();
    }
  }

  async sendMeerkatsMessage(channelId: string): Promise<void> {
    console.log(
      `sending meerkats msg to channel ${channelId} @ ${Moment().format()}`
    );

    const webhook = await this._getWebhook(channelId);
    const tracker = await getMarketListings(
      "meerkat-millionaires-cc",
      webhook,
      this.lastMeerkatsErrBroadcast
    );
    if (!tracker) {
      this.lastMeerkatsErrBroadcast = Moment();
      return;
    }
    const msg = buildMessage(tracker);
    if (shouldBroadcast(tracker, this.lastMeerkatsBroadcast)) {
      await webhook.send(msg);
      this.lastMeerkatsBroadcast = Moment();
    }
  }

  async sendFamousFoxMessage(channelId: string): Promise<void> {
    console.log(
      `sending famous fox msg to channel ${channelId} @ ${Moment().format()}`
    );

    const webhook = await this._getWebhook(channelId);
    const tracker = await getMarketListings(
      "famous-fox-federation",
      webhook,
      this.lastFamousFoxErrBroadcast
    );
    if (!tracker) {
      this.lastFamousFoxErrBroadcast = Moment();
      return;
    }
    const msg = buildMessage(tracker);
    if (shouldBroadcast(tracker, this.lastFamousFoxBroadcast)) {
      await webhook.send(msg);
      this.lastFamousFoxBroadcast = Moment();
    }
  }

  async sendMessages(): Promise<void> {
    const { channelIds } = this.rule;

    this.sendDegodsMessage(channelIds[0]);
    this.sendJungleCatsMessage(channelIds[1]);
    this.sendRogueSharksMessage(channelIds[2]);
    this.sendMeerkatsMessage(channelIds[3]);
    this.sendFamousFoxMessage(channelIds[4]);
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
