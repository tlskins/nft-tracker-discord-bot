import {
  MarketListing,
  CollectionTrackerResp,
  CollectionTracker,
} from "./types";
import rest from "./rest";

import Moment from "moment";

export const getTopAttrsTxt = (listing: MarketListing): string => {
  let topAttrs =
    listing.topAttributes
      ?.map((attr) => attr.value)
      .slice(0, 4)
      .join(", ") || "";
  const rarity = listing.rarity ? `Rarity: ${listing.rarity}: ` : "";
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
  floorPrice: number,
  floorChange: number,
  lastDayFloor: number,
  lastWeekFloor: number
): string => {
  // eslint-disable-next-line prettier/prettier
  return `Floors: Now ${floorPrice.toFixed(2)} ${floorChange ? `%${floorChange.toFixed(0)}` : ""} | Day ${lastDayFloor.toFixed(2)} | Week ${lastWeekFloor.toFixed(2)}\n`;
};

export const getListingLink = (listing: MarketListing): string => {
  const topAttrs = getTopAttrsTxt(listing);
  const bestRk = getBestRankTxt(listing);
  const suggPrice = getSuggestedPriceTxt(listing);
  let listPrefix = `Score ${listing.score.toFixed(2)}`;
  if (listing.rank) listPrefix += `| Rank ${listing.rank} `;

  // eslint-disable-next-line prettier/prettier
    return `[${listPrefix} @ ${listing.price.toFixed(2)} SOL ${topAttrs} ${bestRk} ${suggPrice}](<${listing.url}>)`;
};

export const getBibleLink = (collection: string, path: string): string => {
  // eslint-disable-next-line prettier/prettier
    return `[${collection} Bible Verse](<${`https://degenbible.vercel.app/collections/${path}`}>)`;
};

export const getMarketListings = async (
  collection: string
): Promise<CollectionTracker | Error> => {
  try {
    const collectionData = (await rest.post(
      `/${collection}`
    )) as CollectionTrackerResp;

    return collectionData.data.tracker;
  } catch (err) {
    return err as Error;
  }
};

export const buildMessage = (
  tracker: CollectionTracker,
  path: string
): string => {
  const {
    collection,
    currentBest,
    currentListings,
    marketSummary: {
      hourMarketSummary: { listingFloor: floorPrice, listingFloorChange },
      dayMarketSummary: {
        listingFloor: lastDayFloor,
        totalSales,
        avgSalePrice,
      },
      weekMarketSummary: { listingFloor: lastWeekFloor },
    },
  } = tracker;

  const hourlySales = totalSales / 12;

  // eslint-disable-next-line prettier/prettier
let msg = `${currentBest.isNew ? "@everyone \nNew Best " : "Best "}${collection} ${getListingLink(currentBest)}\n`;
  msg += getFloorPriceTxt(
    floorPrice,
    listingFloorChange,
    lastDayFloor,
    lastWeekFloor
  );
  // eslint-disable-next-line prettier/prettier
  msg += `Hourly Sales ${hourlySales?.toFixed(2) || "?"} | Avg Sale ${avgSalePrice?.toFixed(2) || "?"}\n`;
  msg += getBibleLink(currentBest.collection, path) + "\n\n";
  currentListings.forEach((listing) => (msg += `${getListingLink(listing)}\n`));

  return msg.substring(0, 2000);
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

export const shouldBroadcastErr = (
  lastBroadCast: Moment.Moment | undefined
): boolean => {
  if (!!lastBroadCast && lastBroadCast.isAfter(Moment().add(-2, "hours"))) {
    return false;
  }
  return true;
};
