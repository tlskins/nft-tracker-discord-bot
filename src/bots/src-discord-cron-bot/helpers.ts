import {
  MarketListing,
  FloorPrice,
  CollectionTrackerResp,
  CollectionTracker,
} from "./types";
import rest from "./rest";

import Moment from "moment";

export const getTopAttrsTxt = (listing: MarketListing): string => {
  let topAttrs =
    listing.topAttributes?.map((attr) => attr.value).join(", ") || "";
  const rarity = listing.rarity ? `${listing.rarity}: ` : "";
  if (topAttrs) topAttrs = `${rarity}(${topAttrs})`;

  return topAttrs;
};

export const getBestRankTxt = (listing: MarketListing): string => {
  const dayBestRk = listing.dailyBestScoreRank
    ? `Day#${listing.dailyBestScoreRank}`
    : "";
  const weekBestRk = listing.weeklyBestScoreRank
    ? `Week#${listing.weeklyBestScoreRank}`
    : "";
  let bestRk = "";
  if (dayBestRk) bestRk += dayBestRk;
  if (weekBestRk) bestRk += bestRk ? `|${weekBestRk}` : weekBestRk;
  if (bestRk) bestRk = `(${bestRk})`;

  return bestRk;
};

export const getSuggestedPriceTxt = (listing: MarketListing): string => {
  return listing.suggestedPrice
    ? `(SuggPrice?${listing.suggestedPrice.toFixed(2)})`
    : "";
};

export const getFloorPriceTxt = (
  floorPrice: FloorPrice,
  lastDayFloor: FloorPrice,
  lastWeekFloor: FloorPrice
): string => {
  // eslint-disable-next-line prettier/prettier
  return `Floors: Now ${floorPrice.floorPrice.toFixed(2)} ${floorPrice.percentChange ? `%${floorPrice.percentChange.toFixed(2)}` : ""} | Day ${lastDayFloor.floorPrice.toFixed(2)} | Week ${lastWeekFloor.floorPrice.toFixed(2)}\n`;
};

export const getListingLink = (listing: MarketListing): string => {
  const topAttrs = getTopAttrsTxt(listing);
  const bestRk = getBestRankTxt(listing);
  const suggPrice = getSuggestedPriceTxt(listing);
  let listPrefix = `Score ${listing.score.toFixed(2)}`;
  if (listing.rank) listPrefix = `Rank ${listing.rank} `;

  // eslint-disable-next-line prettier/prettier
    return `[${listPrefix} @ ${listing.price.toFixed(2)} ${topAttrs} ${bestRk} ${suggPrice}](<${listing.url}>)`;
};

export const getMarketListings = async (
  collection: string,
  webhook: any,
  lastBroadCastErr: Moment.Moment | undefined
): Promise<CollectionTracker | undefined> => {
  try {
    const collectionData = (await rest.get(
      `/${collection}`
    )) as CollectionTrackerResp;

    return collectionData.data.tracker;
  } catch (err) {
    console.log(err);
    if (shouldBroadcastErr(lastBroadCastErr)) {
      await webhook.send(`@timchi#0831 Error getting ${collection} data!`);
    }

    return undefined;
  }
};

export const buildMessage = (tracker: CollectionTracker): string => {
  const {
    collection,
    currentBest,
    currentListings,
    floorPrice,
    lastDayFloor,
    lastWeekFloor,
    hourlySales,
    averageSalePrice,
  } = tracker;

  // eslint-disable-next-line prettier/prettier
let msg = `${currentBest.isNew ? "@everyone \nNew Best " : "Best "} ${collection} ${getListingLink(currentBest)}\n`;
  msg += getFloorPriceTxt(floorPrice, lastDayFloor, lastWeekFloor);
  // eslint-disable-next-line prettier/prettier
  msg += `Hourly Sales ${hourlySales?.toFixed(2) || "?"} | Avg Sale ${averageSalePrice?.toFixed(2) || "?"}\n\n`;
  currentListings.forEach((listing) => (msg += `${getListingLink(listing)}\n`));

  return msg;
};

export const shouldBroadcast = (
  tracker: CollectionTracker,
  lastBroadCast: Moment.Moment | undefined
): boolean => {
  const { currentBest } = tracker;

  if (
    !currentBest.isNew &&
    !!lastBroadCast &&
    lastBroadCast.isAfter(Moment().add(-1, "hours"))
  ) {
    return false;
  }
  return true;
};

const shouldBroadcastErr = (
  lastBroadCast: Moment.Moment | undefined
): boolean => {
  if (!!lastBroadCast && lastBroadCast.isAfter(Moment().add(-2, "hours"))) {
    return false;
  }
  return true;
};
