import { EmojiResolvable, Snowflake, WebhookMessageOptions } from "discord.js";
import internal from "stream";

export interface Config {
  timezone: string;
  rules: Rule[];
}

export interface Rule {
  cronExpression: string;
  channelPolicy: Policy;
  messagePolicy: Policy;
  reactionPolicy?: Policy;
  channelIds: Snowflake[];
  messages: WebhookMessageOptions[];
  reactions?: EmojiResolvable[];
}

export type Policy = "all" | "random" | "single";

export type CronRuleItem = Snowflake | WebhookMessageOptions | EmojiResolvable;

// Collection Tracker Types
export interface CollectionTrackerResp {
  data: CollectionTrackerData;
}

export interface CollectionTrackerData {
  tracker: CollectionTracker;
}

export interface CollectionTracker {
  id: string;
  collection: string;
  floorPrice: FloorPrice;
  lastDayFloor: FloorPrice;
  lastWeekFloor: FloorPrice;
  lastUpdated: string;

  currentBest: MarketListing;
  lastDayBest: MarketListing;
  lastWeekBest: MarketListing;

  currentListings: [MarketListing];
  floors: [FloorPrice];
}

export interface FloorPrice {
  floorPrice: number;
  time: string;
  percentChange: number | undefined;
}

export interface MarketListing {
  id: string;
  createdAt: string;
  title: string;
  image: string;
  url: string;
  collection: string;
  marketplace: string;
  rank: number;
  price: number;
  marketFloor: number | undefined;
  score: number;
  scorePercentChange: number | undefined;
  listedForSale: boolean;
  isNew: boolean;

  topAttributes: [TokenAttributes] | undefined;
}

export interface TokenAttributes {
  name: string;
  value: string;
  score: number;
}
