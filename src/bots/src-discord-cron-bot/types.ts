import { EmojiResolvable, Snowflake, WebhookMessageOptions } from "discord.js";

// Cron Types
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
  lastUpdated: string;
  marketSummary: MarketSummary;

  pinnedMsgId: string;
  lastBroadcastAt: string;
  lastErrCastAt: string;

  currentBest: MarketListing;
  lastDayBest: MarketListing;
  lastWeekBest: MarketListing;
  currentListings: [MarketListing];
}

export interface UpdateCollectionTracker {
  id: string;

  pinnedMsgId?: string;
  lastBroadcastAt?: string;
  lastErrCastAt?: string;
}

export interface MarketSummary {
  id: string;
  collection: string;
  time: string;
  timeStr: string;

  hourMarketSummary: MarketWindowSummary;
  dayMarketSummary: MarketWindowSummary;
  weekMarketSummary: MarketWindowSummary;
}

export interface MarketWindowSummary {
  id: string;

  // listing summaries
  listingFloor: number;
  avgListPrice: number;
  totalListings: number;

  // sales summaries
  salesFloor: number;
  salesCeiling: number;
  avgSalePrice: number;
  totalSales: number;
  totalSalesVolume: number;

  // deltas
  listingFloorChange: number;
  avgListPriceChange: number;
  totalListingsChange: number;

  salesFloorChange: number;
  salesCeilingChange: number;
  avgSalePriceChange: number;
  totalSalesChange: number;
  totalSalesVolumeChange: number;
}

export interface MarketListing {
  id: string;
  updatedAt: string;
  title: string;
  image: string;
  url: string;
  tokenAddress: string;
  tokenNumber: string;
  collection: string;
  marketplace: string;
  rank: number | undefined;
  price: number;
  rarity: string | undefined;
  suggestedPrice: number | undefined;
  marketFloor: number | undefined;
  lastSoldPrice: number | undefined;
  score: number;
  scorePercentChange: number | undefined;
  listedForSale: boolean;
  isNew: boolean;
  isBest: boolean;
  dailyBestScoreRank: number | undefined;
  weeklyBestScoreRank: number | undefined;

  attributes: [TokenAttributes] | undefined;
  topAttributes: [TokenAttributes] | undefined;
}

export interface TokenAttributes {
  name: string;
  value: string;
  score: number;
  rarity: string;
}
