import { EmojiResolvable, Snowflake, WebhookMessageOptions } from "discord.js";
import internal from "stream";

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

export interface NetworkResp<T> {
  data: T;
}

// Collection Tracker Types
export interface CollectionTrackerResp {
  data: CollectionTrackerData;
}

export interface CollectionTrackerData {
  tracker: CollectionTracker;
  floorTrackers: IFloorTracker[];
}

export interface CollectionTracker {
  id: string;
  collection: string;
  lastUpdated: string;
  marketSummary: MarketSummary;

  lastBroadcastAt: string;
  lastErrCastAt: string;

  currentFloor: MarketListing;
  currentBest: MarketListing;
  lastDayBest: MarketListing;
  lastWeekBest: MarketListing;
  currentListings: [MarketListing];
  bestTraitListings: [BestTraitListing];

  apiColl?: string;
}

export interface BestTraitListing {
  attribute: string;
  nextHigherPrice: number;
  priceDiff: number;
  count: number;
  roi: number;
  isNew: boolean;
  floorListing: MarketListing;
  nextListing: MarketListing;
}

export interface UpdateCollectionTracker {
  id: string;

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
  floorHistory: IFloorHistory[];

  saleCountSlope: number;
  floorCountSlope: number;
  listingCountSlope: number;
  floorHistorySlope: number;

  predictedFloor: number;
  predWindowMins: number;
  numNewListings: number;
  recentFloorChange: number;
  isPump: boolean;
}

export interface ISaleCount {
  time: string;
  count: number;
  avgSale: number;
}

export interface IListingCount {
  time: string;
  count: number;
}

export interface IFloorCount {
  price: number;
  count: number;
}

export interface IFloorHistory {
  time: string;
  floor: number;
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

export interface IUserResp {
  data: IUserData;
}

export interface IUsersResp {
  data: IUsersData;
}

export interface IUserData {
  user: IUser;
}

export interface IUsersData {
  users: IUser[];
}

export interface IUser {
  id: string;
  discordId: string;
  discordName: string;
  verified: boolean;
  isOG: boolean;
  isEnrolled: boolean;
  enrolledAt?: string;
  inactiveDate?: string;
  lastJoined: string;
  lastLeft?: string;
  trialEnd: string;
  trackedWallets: [string];
  hasWalletTracker: boolean;
  walletPublicKey: string;
  trackMagicEdenSales: boolean;

  referrerDiscordId: string;
  inviteId: string;
  bounty: number;
}

export interface ICreateUser {
  discordId: string;
  discordName: string;
  referrerDiscordId: string;
  inviteId: string;
  lastJoined: string;
}

export interface IUpdateUser {
  walletPublicKey?: string;

  isEnrolled?: boolean;
  transactionId?: string;
  transactionAmount?: number;
  enrolledAt?: string;

  trackMagicEdenSales?: boolean;
  referrerDiscordId?: string;
  inviteId?: string;
  lastJoined?: string;
  lastLeft?: string;
  bounty?: number;
}

export interface IDiscordUpdateUser {
  discordId: string;
  update: IUpdateUser;
}

export interface IReferralsResp {
  data: IReferralsData;
}

export interface IReferralsData {
  referrals: IReferrals;
}

export interface IReferrals {
  currentEnd: string;
  currentStart: string;
  prevStart: string;

  currentReferrals: IUser[];
  currentEnrollees: IUser[];
  prevReferrals: IUser[];
  prevEnrollees: IUser[];
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
  runAllCyclesEnd?: string;
}

export interface IEnrollmentResp {
  data: IEnrollmentData;
}

export interface IEnrollmentData {
  enrollment: IEnrollment;
}

export interface IEnrollment {
  id: string;
  round: number;
  limit: number;
  price: number;
  time: string;
  currentCount: number;
  defaultBounty: number;
}

export interface IFloorTrackerResp {
  data: IFloorTrackerData;
}

export interface IFloorTrackerData {
  tracker: IFloorTracker;
}

export interface IFloorTrackersResp {
  data: IFloorTrackersData;
}

export interface IFloorTrackersData {
  trackers: IFloorTracker[];
}

export interface IFloorTracker {
  id: string;
  updatedAt: string;
  userId: string;
  discordId: string;
  collection: string;
  isAbove: boolean;
  floor: number;
}

// Magic eden

export interface IMagicEdenSalesResp {
  data: IMagicEdenSalesData;
}

export interface IMagicEdenSalesData {
  sales: IMagicEdenSale[];
}

export interface IMagicEdenActivity {
  lastCheck: string;
  user: IUser;
  sales: IMagicEdenSale[];
}

export interface IMagicEdenSale {
  createdAt: string;
  blockTime: number;
  slot: number;
  source: string;
  collection_symbol: string;
  mint: string;
  buyer_address: string;
  seller_address: string;
  transaction_id: string;
  txType: string;
  parsedTransaction: IParsedTransaction;
}

export interface IParsedTransaction {
  blocktime: string;
  buyer_address: string;
  collection_symbol: string;
  creator_fees_amount: string;
  mint: string;
  platform_fees_amount: number;
  seller_address: string;
  seller_fee_amount: number;
  slot: number;
  total_amount: number;
  transaction_id: string;
  TxType: string;
}

// stop tracker

export interface IStopTracker {
  id?: string;
  collection: string;
  userId: string;
  stopTrackerType: string;
  deltaValue: number;
  initPrice: number;
}

export interface IHatchTracker {
  id: string;
  address: string;
  apiPath: string;
  listing: MarketListing;
  tokenData: IMetadata;
  nftData: INftData;
}

export interface INftData {
  name: string;
  symbol: string;
  description: string;
  seller_fee_basis_points: number;
  image: string;
  external_url: string;
  attributes: NftAttribute[];
  collection: NftCollection;
  properties: NftProperty[];
}

interface NftAttribute {
  trait_type: string;
  value: string;
}

interface NftCollection {
  name: string;
  family: string;
}

interface NftFile {
  type: string;
  uri: string;
}
interface NftCreator {
  address: string;
  share: number;
}

interface NftProperty {
  category: string;
  files: NftFile[];
  creators: NftCreator[];
}

// metaplex

export interface IMetadataResp {
  data: IMetadataData;
}

export interface IMetadataData {
  metadata: IMetadata[];
}

export interface IMetadata {
  key: number;
  updateAuthority: string;
  mint: string;
  primarySaleHappened: number;
  isMutable: number;
  editionNonce: number | null;
  data: IMetaplexData;
}

export interface IMetaplexData {
  name: string;
  symbol: string;
  uri: string;
  sellerFeeBasisPoints: number;
  creators: IMetaplexCreator[] | null;
}

export interface IMetaplexCreator {
  address: string;
  verified: number;
  share: number;
}

// wallet
export interface IWalletResp {
  data: IWalletData;
}
export interface IWalletData {
  wallet: IWallet;
}

export interface IWalletUpsert {
  id: string;
  lastSynced: string;
  publicKey: string;
  userId: string;
  metadata: IMetadata[];
}

export interface IWallet {
  id: string;
  lastSynced: string;
  publicKey: string;
  userId: string;
  metadata: IMetadata[];
  mappings: Map<string, ICollectionMapping[]>;
  nfts: Map<string, IToken[]>;
  untracked: Map<string, IMetadata[]>;
}
