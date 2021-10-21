import { CronJob } from "cron";
import rest from "../rest";
import Moment from "moment";
import { Client, Snowflake, TextChannel, Webhook } from "discord.js";
import {
  Config,
  CronRuleItem,
  Policy,
  Rule,
  CollectionTrackerResp,
  MarketListing,
} from "../types";
import {
  getTopAttrsTxt,
  getBestRankTxt,
  getSuggestedPriceTxt,
  getFloorPriceTxt,
} from "../helpers";
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
  lastRogueSharksBroadcast: Moment.Moment | undefined;

  constructor(client: Client, rule: Rule) {
    this.client = client;
    this.rule = rule;
  }

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
      return `[Rank ${listing.rank.toFixed(0)} | Score ${listing.score.toFixed(2)} @ ${listing.price.toFixed(2)} ${bestRk}](<${listing.url}>)`;
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

    let collectionData: CollectionTrackerResp;
    try {
      collectionData = (await rest.get(
        "/rogue-sharks"
      )) as CollectionTrackerResp;
    } catch (err) {
      console.log(err);
      const catsHook = await this._getWebhook(channelId);
      await catsHook.send("@timchi Error getting Rogue Sharks data!");

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
          hourlySales,
          averageSalePrice,
        },
      },
    } = collectionData;

    const getRogueSharksLink = (listing: MarketListing): string => {
      const topAttrs = getTopAttrsTxt(listing);
      const bestRk = getBestRankTxt(listing);
      const suggPrice = getSuggestedPriceTxt(listing);

      // eslint-disable-next-line prettier/prettier
      return `[Score ${listing.score.toFixed(2)} @ ${listing.price.toFixed(2)} ${topAttrs} ${bestRk} ${suggPrice}](<${listing.url}>)`;
    };

    // eslint-disable-next-line prettier/prettier
    let sharksMsg = `${currentBest.isNew ? "@everyone \nNew Best " : "Best "} ${collection} ${getRogueSharksLink(currentBest)}\n`;
    sharksMsg += getFloorPriceTxt(floorPrice, lastDayFloor, lastWeekFloor);
    // eslint-disable-next-line prettier/prettier
    sharksMsg += `Hourly Sales ${hourlySales?.toFixed(2) || "?"} | Avg Sale ${averageSalePrice?.toFixed(2) || "?"}\n\n`;
    currentListings.forEach((listing) => {
      sharksMsg += `${getRogueSharksLink(listing)}\n`;
    });

    // eslint-disable-next-line prettier/prettier
    if ( !currentBest.isNew && !!this.lastRogueSharksBroadcast && this.lastRogueSharksBroadcast.isAfter(Moment().add(-1, "hours"))) {
      return;
    }

    const sharksHook = await this._getWebhook(channelId);
    await sharksHook.send(sharksMsg);
    this.lastRogueSharksBroadcast = Moment();
  }

  async sendJungleCatsMessage(channelId: string): Promise<void> {
    console.log(
      `sending jungle cats msg to channel ${channelId} @ ${Moment().format()}`
    );

    let collectionData: CollectionTrackerResp;
    try {
      collectionData = (await rest.get(
        "/jungle-cats"
      )) as CollectionTrackerResp;
    } catch (err) {
      console.log(err);
      const catsHook = await this._getWebhook(channelId);
      await catsHook.send("@timchi Error getting Jungle Cats data!");

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
          hourlySales,
          averageSalePrice,
        },
      },
    } = collectionData;

    const getCatsLink = (listing: MarketListing): string => {
      const topAttrs = getTopAttrsTxt(listing);
      const bestRk = getBestRankTxt(listing);
      const suggPrice = getSuggestedPriceTxt(listing);

      // eslint-disable-next-line prettier/prettier
      return `[Score ${listing.score.toFixed(2)} @ ${listing.price.toFixed(2)} ${topAttrs} ${bestRk} ${suggPrice}](<${listing.url}>)`;
    };

    // eslint-disable-next-line prettier/prettier
    let catsMsg = `${currentBest.isNew ? "@everyone \nNew Best " : "Best "} ${collection} ${getCatsLink(currentBest)}\n`;
    catsMsg += getFloorPriceTxt(floorPrice, lastDayFloor, lastWeekFloor);
    // eslint-disable-next-line prettier/prettier
    catsMsg += `Hourly Sales ${hourlySales?.toFixed(2) || "?"} | Avg Sale ${averageSalePrice?.toFixed(2) || "?"}\n\n`;
    currentListings.forEach((listing) => {
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
    this.sendRogueSharksMessage(channelIds[2]);
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
