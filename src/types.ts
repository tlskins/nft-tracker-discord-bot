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

  currentFloor: MarketListing;
  currentBest: MarketListing;
  lastDayBest: MarketListing;
  lastWeekBest: MarketListing;
  currentListings: [MarketListing];

  apiColl?: string;
}

export interface UpdateCollectionTracker {
  id: string;

  pinnedMsgId?: string;
  lastBroadcastAt?: string;
  lastErrCastAt?: string;
}

export interface IUpsertCollectionMapping {
  id: string;

  pinMsgId?: string;
  floorRole?: string;
  suggestedRole?: string;
}

export interface MarketSummary {
  id: string;
  collection: string;
  time: string;
  timeStr: string;

  hourMarketSummary: MarketWindowSummary;
  dayMarketSummary: MarketWindowSummary;
  weekMarketSummary: MarketWindowSummary;

  saleCounts: ISaleCount[];
  floorCounts: IFloorCount[];
  listingCounts: IListingCount[];

  saleCountSlope: number;
  floorCountSlope: number;
  listingCountSlope: number;
}

export interface ISaleCount {
  time: string;
  count: number;
}

export interface IListingCount {
  time: string;
  count: number;
}

export interface IFloorCount {
  price: number;
  count: number;
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

// wallets

export interface GetTokenAlertsResp {
  data: GetTokenAlertsData;
}

export interface GetTokenAlertsData {
  trackers: [ITokenTracker];
}

export interface ITokenTracker {
  id: string;
  lastSync: string;
  tokenAddress: string;
  walletAddress: string;
  userId: string;
  active: boolean;
  tokenTrackerType: string;
  lastAlertAt: string;
  above: number;
  below: number;

  token: IToken;
  discordId: string;
}

export interface IToken {
  id: string;
  updatedAt: string;
  title: string;
  image: string;
  tokenAddress: string;
  tokenNumber: number;
  collection: string;

  rank?: number;
  price?: number;
  rarity?: string;
  lastSoldPrice?: number;
  score?: number;
  floorPrice?: number;
  suggestedPrice?: number;
  lastCalcAt?: string;

  attributes: [TokenAttributes];
  topAttributes: [TokenAttributes];
}

export interface IUser {
  id: string;
  discordId: string;
  discordName: string;
  verified: boolean;
  isOG: boolean;
  inactiveDate?: string;
  trialEnd: string;
  trackedWallets: [string];
  hasWalletTracker: boolean;
}

export interface GetTokenAlertsResp {
  data: GetTokenAlertsData;
}

export interface GetTokenAlertsData {
  trackers: [ITokenTracker];
}

export interface ILandingResp {
  data: ILandingData;
}

export interface ILandingData {
  collections: [ICollectionMapping];
}

export interface ICollectionMappingResp {
  data: ICollectionMappingData;
}

export interface ICollectionMappingData {
  mapping: ICollectionMapping;
}

export interface ICollectionMapping {
  id: string;
  collection: string;
  rankType: string;
  apiPath: string;
  channelId: string;
  pinMsgId: string;
  floorRole: string;
  suggestedRole: string;
  pumpRole: string;
  totalSupply: number;
  updateAuthority: string;
}
