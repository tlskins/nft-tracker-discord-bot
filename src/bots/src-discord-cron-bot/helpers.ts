import {
  MarketListing,
  CollectionTrackerResp,
  CollectionTracker,
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

export const getFloorPriceTxt = (
  floorHour: number,
  floorChgHour: number,
  floorDay: number,
  floorChgDay: number,
  floorWeek: number,
  floorChgWeek: number
): string => {
  const floorStr = (floor: number, chg: number): string =>
    `${floor} ${chg < 0 ? "-" : "+"}%${Math.abs(chg).toFixed(0)}`;
  return `Floors: Now ${floorStr(floorHour, floorChgHour)} | Day ${floorStr(
    floorDay,
    floorChgDay
  )} | Week ${floorStr(floorWeek, floorChgWeek)}\n`;
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
  return `https://degenbible.vercel.app/collections/${path}`;
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

export const buildMarketEmbed = (
  tracker: CollectionTracker,
  path: string
): MessageEmbed => {
  const {
    collection,
    currentListings,
    marketSummary: {
      hourMarketSummary: {
        listingFloor: floorHour,
        listingFloorChange: floorChgHour,
      },
      dayMarketSummary: {
        listingFloor: floorDay,
        listingFloorChange: floorChgDay,
        totalSales,
        avgSalePrice,
      },
      weekMarketSummary: {
        listingFloor: floorWeek,
        listingFloorChange: floorChgWeek,
      },
    },
  } = tracker;

  const hourlySales = totalSales / 12;
  const floorStats = getFloorPriceTxt(
    floorHour,
    floorChgHour,
    floorDay,
    floorChgDay,
    floorWeek,
    floorChgWeek
  );
  const salesStats = `Hourly Sales ${
    hourlySales?.toFixed(2) || "?"
  } | Avg Sale ${avgSalePrice?.toFixed(2) || "?"}`;
  const description = `${floorStats}\n${salesStats}\n`;

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
  if (!!lastBroadCast && lastBroadCast.isAfter(Moment().add(-119, "minutes"))) {
    return false;
  }
  return true;
};
