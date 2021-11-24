import {
  MarketListing,
  CollectionTrackerResp,
  CollectionTracker,
  MarketSummary,
  UpdateCollectionTracker,
} from "./types";
import rest from "./rest";

import { MessageEmbed } from "discord.js";
import Moment from "moment";

export const getTopAttrsTxt = (listing: MarketListing): string => {
  let topAttrs =
    listing.topAttributes
      ?.map((attr) => attr.value)
      .slice(0, 4)
      .join(", ") || "";
  if (topAttrs) topAttrs = `(${topAttrs})`;

  return topAttrs;
};

export const getBestRankTxt = (listing: MarketListing): string => {
  const dayBestRk = listing.dailyBestScoreRank
    ? `Day#${listing.dailyBestScoreRank}`
    : "";
  const weekBestRk = listing.weeklyBestScoreRank
    ? `Wk#${listing.weeklyBestScoreRank}`
    : "";
  let bestRk = "";
  if (dayBestRk) bestRk += dayBestRk;
  if (weekBestRk) bestRk += bestRk ? ` | ${weekBestRk}` : weekBestRk;
  if (bestRk) bestRk = `(${bestRk})`;

  return bestRk;
};

export const getPrice = (listing: MarketListing): string => {
  return `${listing.price.toFixed(2)} SOL`;
};

export const getSuggestedPriceTxt = (listing: MarketListing): string => {
  return (listing.suggestedPrice || 0.0).toFixed(2);
};

export const getFloorPriceTxt = (mktSum: MarketSummary): string => {
  const {
    hourMarketSummary: {
      listingFloor: floorHour,
      listingFloorChange: floorChgHour,
    },
    dayMarketSummary: {
      listingFloor: floorDay,
      listingFloorChange: floorChgDay,
    },
    weekMarketSummary: {
      listingFloor: floorWeek,
      listingFloorChange: floorChgWeek,
    },
  } = mktSum;

  return `Floors: Now ${getNumChgStr(
    floorHour,
    floorChgHour
  )} | Day ${getNumChgStr(floorDay, floorChgDay)} | Week ${getNumChgStr(
    floorWeek,
    floorChgWeek
  )}`;
};

const getNumChgStr = (num: number, chg: number): string => {
  return `${num.toFixed(2)} ${chg < 0 ? "-" : "+"}%${Math.abs(chg).toFixed(0)}`;
};

export const getSalesSumTxt = (mktSum: MarketSummary): string => {
  const {
    dayMarketSummary: {
      totalSales,
      totalSalesChange,
      avgSalePrice,
      avgSalePriceChange,
    },
  } = mktSum;

  const hourlySales = totalSales / 12;
  return `Hourly Sales ${getNumChgStr(
    hourlySales,
    totalSalesChange
  )} | Avg Sale ${getNumChgStr(avgSalePrice, avgSalePriceChange)}`;
};

export const getShortListing = (listing: MarketListing): string => {
  const topAttrs = getTopAttrsTxt(listing);
  const suggPrice = getSuggestedPriceTxt(listing);
  const prefix = getListingPrefix(listing);
  const listPrice = getPrice(listing);

  return `${prefix} @ ${listPrice} ${topAttrs} (SUGG ${suggPrice})`;
};

export const getShortListingUrl = (listing: MarketListing): string => {
  return `[${listing.title} Listing](<${listing.url}>)`;
};

export const getBestListing = (listing: MarketListing): string => {
  const topAttrs = getTopAttrsTxt(listing);
  const bestRk = getBestRankTxt(listing);
  const suggPrice = getSuggestedPriceTxt(listing);
  const prefix = getListingPrefix(listing);
  const listPrice = getPrice(listing);

  return `${prefix} @ ${listPrice} ${topAttrs} ${bestRk} ${suggPrice}`;
};

export const getListingPrefix = (listing: MarketListing): string => {
  let listPrefix = `${listing.rarity}`;
  if (listing.rank) listPrefix += ` | Rank ${listing.rank}`;

  return listPrefix;
};

export const getListingLink = (listing: MarketListing): string => {
  const topAttrs = getTopAttrsTxt(listing);
  const bestRk = getBestRankTxt(listing);
  const suggPrice = getSuggestedPriceTxt(listing);
  const prefix = getListingPrefix(listing);
  const listPrice = listing.price.toFixed(2);

  // eslint-disable-next-line prettier/prettier
  return `[${prefix} @ ${listPrice} SOL ${topAttrs} ${bestRk} ${suggPrice}](<${listing.url}>)`;
};

export const getBibleLink = (path: string): string => {
  return `https://www.degenbible.com/collections/${path}`;
};

export const buildBestEmbed = (
  tracker: CollectionTracker,
  path: string
): MessageEmbed => {
  const { collection, currentBest } = tracker;

  const embed = new MessageEmbed()
    .setColor("#0099ff")
    .setTitle(`${collection} Best Listing`)
    .setURL(currentBest.url)
    .setAuthor("Degen Bible Bot")
    .setDescription(
      `${getListingPrefix(currentBest)} @ ${getPrice(currentBest)}`
    )
    .addFields(
      {
        name: `Analysis`,
        value: getBibleLink(path),
      },
      {
        name: `Best Listing`,
        value: `${currentBest.title}`,
        inline: true,
      },
      {
        name: `Compare Best`,
        value: getBestRankTxt(currentBest),
        inline: true,
      },
      {
        name: `Sugg Price`,
        value: getSuggestedPriceTxt(currentBest),
        inline: true,
      },
      {
        name: `Top Traits`,
        value: getTopAttrsTxt(currentBest),
        inline: true,
      }
    )
    .setImage(currentBest.image)
    .setFooter(`Listing: ${currentBest.url}`)
    .setTimestamp();

  return embed;
};

export const marketSumStr = (mktSum: MarketSummary): string => {
  const floorStats = getFloorPriceTxt(mktSum);
  const salesStats = getSalesSumTxt(mktSum);

  return `${floorStats}\n${salesStats}\n\n`;
};

export const buildMarketEmbed = (
  tracker: CollectionTracker,
  path: string
): MessageEmbed => {
  const { collection, currentListings, marketSummary } = tracker;
  const description = marketSumStr(marketSummary);
  const embed = new MessageEmbed()
    .setColor("#0099ff")
    .setTitle(`${collection} Market Summary`)
    .setURL(getBibleLink(path))
    .setAuthor("Degen Bible Bot")
    .setDescription(description)
    .setTimestamp();

  currentListings.forEach((listing) => {
    embed.addField(getShortListingUrl(listing), getShortListing(listing));
  });

  return embed;
};

export const buildAllMarketsEmbed = (
  mktSums: (MarketSummary | undefined)[]
): MessageEmbed | undefined => {
  const embed = new MessageEmbed()
    .setColor("#0099ff")
    .setTitle(`All Market Summary`)
    .setAuthor("Degen Bible Bot")
    .setTimestamp();

  mktSums.forEach((mktSum) => {
    if (
      Math.abs(mktSum?.dayMarketSummary?.listingFloorChange || 0.0) > 15.0 ||
      Math.abs(mktSum?.dayMarketSummary.avgSalePriceChange || 0.0) > 25.0
    ) {
      if (mktSum) {
        embed.addField(
          `${mktSum?.collection} Market Summary`,
          marketSumStr(mktSum)
        );
      }
    }
  });

  if (embed.fields.length === 0) {
    return;
  }

  return embed;
};

export const shouldBroadcast = (
  lastBroadCast: Moment.Moment | undefined
): boolean => {
  if (!!lastBroadCast && lastBroadCast.isAfter(Moment().add(-4, "minutes"))) {
    return false;
  }
  return true;
};

export const shouldBroadcastErr = (
  lastBroadCast: Moment.Moment | undefined
): boolean => {
  if (!!lastBroadCast && lastBroadCast.isAfter(Moment().add(-59, "minutes"))) {
    return false;
  }
  return true;
};

// controllers

export const getMarketListings = async (
  collection: string,
  handleErr: (msg: string) => Promise<void>
): Promise<CollectionTracker | undefined> => {
  try {
    const collectionData = (await rest.post(
      `/${collection}`
    )) as CollectionTrackerResp;

    return collectionData.data.tracker;
  } catch (err) {
    const errMsg = `error getting ${collection} market listings: ${err.response?.data}`;
    console.log(errMsg);
    handleErr(errMsg);
  }
};

export const syncSubscriptions = async (
  handleErr: (msg: string) => Promise<void>
): Promise<void> => {
  console.log("syncing subscriptions...");
  try {
    await rest.post("/subscriptions/sync");
  } catch (err) {
    const errMsg = `error syncing subs: ${err.response?.data}`;
    console.log(errMsg);
    handleErr(errMsg);
  }
};

export const updateTracker = async (
  collection: string,
  req: UpdateCollectionTracker,
  handleErr: (msg: string) => Promise<void>
): Promise<CollectionTracker | undefined> => {
  try {
    const collectionData = (await rest.put(
      `/${collection}`,
      req
    )) as CollectionTrackerResp;

    return collectionData.data.tracker;
  } catch (err) {
    const errMsg = `error updating ${collection} tracker: ${err.response?.data}`;
    console.log(errMsg);
    handleErr(errMsg);
  }
};
