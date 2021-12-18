import {
  MarketListing,
  CollectionTracker,
  MarketSummary,
  ITokenTracker,
  ICollectionMapping,
  BestTraitListing,
} from "../../../types";

import { MessageEmbed, EmbedFieldData } from "discord.js";
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
  let listPrefix = `${listing.rarity || ""}`;
  if (listing.rank) listPrefix += ` | Rank ${listing.rank}`;
  if (!listPrefix) listPrefix = listing.title;

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

export const buildBestTitle = (
  tracker: CollectionTracker,
  mapping: ICollectionMapping
): string => {
  let mentions = `<@&${process.env.ALL_SUGG_ROLE_ID}> `;
  if (mapping.suggestedRole) {
    mentions += `<@&${mapping.suggestedRole}> `;
  }
  return `${mentions}New Best ROI by Rank / Attr - Price @ ${
    tracker.currentBest.price?.toFixed(2) || "?"
  } SOL`;
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

export const buildPumpTitle = (
  tracker: CollectionTracker,
  mapping: ICollectionMapping,
  incMentions: boolean
): string => {
  let mentions = "";
  if (incMentions) {
    mentions = `<@&${process.env.ALL_PUMP_ROLE_ID}> `;
    if (mapping.pumpRole) {
      mentions += `<@&${mapping.pumpRole}> `;
    }
  }
  const { saleCounts, predictedFloor } = tracker.marketSummary;
  let descrip = "0 sold @ 0 mins";
  if (saleCounts.length > 0) {
    const count = saleCounts[0].count;
    const mins = Moment().diff(Moment(saleCounts[0].time), "minutes");
    descrip = `${count} sold @ ${mins} mins`;
  }
  let floor = "Floor @ 0";
  if (tracker.currentFloor) {
    floor = `Floor @ ${tracker.currentFloor.price.toFixed(2)}`;
  }
  return `${mentions}Floor Pump Alert! - Now: ${floor} Pred: ${predictedFloor.toFixed(
    2
  )}  | ${descrip}`;
};

export const buildBestTraitEmbedFields = (
  bestTraitListings: [BestTraitListing]
): EmbedFieldData[] => {
  return [
    ...bestTraitListings.map((bestTraitListing) => {
      const { priceDiff, floorListing, attribute, count } = bestTraitListing;
      return {
        name: `Snipe Trait ${attribute} (Count ${count}) - Floor @ ${floorListing.price.toFixed(
          2
        )} SOL (Profit +${priceDiff.toFixed(2)})`,
        value: `${floorListing.url}`,
        inline: false,
      };
    }),
  ];
};

export const buildMarketEmbedFields = (
  marketSummary: MarketSummary
): EmbedFieldData[] => {
  const {
    floorCounts,
    floorCountSlope,
    floorHistory,
    floorHistorySlope,
    saleCounts,
    saleCountSlope,
    listingCountSlope,
    listingCounts,
    hourMarketSummary,
    predictedFloor,
  } = marketSummary;
  const now = Moment();

  const diff = predictedFloor - hourMarketSummary.listingFloor;
  const diffStr = diff < 0 ? `-${diff.toFixed(2)}` : `+${diff.toFixed(2)}`;

  return [
    {
      name: "Predicted Floor 1 Hr",
      value: `${predictedFloor.toFixed(2)} SOL (${diffStr})`,
      inline: false,
    },
    {
      name: `Floor Counts (Slope ${floorCountSlope.toFixed(2)})`,
      value:
        floorCounts.map((cnt) => `${cnt.count}@${cnt.price}`).join(" | ") ||
        "None",
      inline: true,
    },
    {
      name: `Floor History (Slope ${floorHistorySlope.toFixed(2)})`,
      value:
        floorHistory
          .map(
            (hist) =>
              `${hist.floor.toFixed(2)}@${now.diff(
                Moment(hist.time),
                "minutes"
              )}mins`
          )
          .join(" | ") || "None",
      inline: true,
    },
    {
      name: `Sales Counts (Slope ${saleCountSlope.toFixed(2)})`,
      value:
        saleCounts
          .slice(0, 5)
          .map(
            (cnt) => `${cnt.count}@${now.diff(Moment(cnt.time), "minutes")}mins`
          )
          .join(" | ") || "None",
      inline: true,
    },
    {
      name: `Listing Counts (Slope ${listingCountSlope.toFixed(2)})`,
      value:
        listingCounts
          .filter((_, i) => i % 2 === 0)
          .map(
            (cnt) =>
              `${cnt.count}@${Moment().diff(Moment(cnt.time), "minutes")}mins`
          )
          .join(" | ") || "None",
      inline: true,
    },
  ] as EmbedFieldData[];
};

export const buildPumpEmbed = (tracker: CollectionTracker): MessageEmbed => {
  const { collection, currentFloor, marketSummary } = tracker;
  const { predictedFloor } = marketSummary;
  const diff = predictedFloor - currentFloor.price;
  const diffStr = diff < 0 ? `${diff.toFixed(2)}` : `+${diff.toFixed(2)}`;

  const embed = new MessageEmbed()
    .setColor("#ff0000")
    .setTitle(`${collection} Pump Alert`)
    .setAuthor("Degen Bible Bot")
    .setDescription(`Predicted floor in 1hr: ${diffStr}`)
    .addFields(...buildMarketEmbedFields(marketSummary))
    .setImage(currentFloor.image)
    .setFooter(currentFloor.url)
    .setURL(currentFloor.url)
    .setTimestamp();

  return embed;
};

export const buildFloorTitle = (
  tracker: CollectionTracker,
  mapping: ICollectionMapping
): string => {
  let mentions = `<@&${process.env.ALL_FLOOR_ROLE_ID}> `;
  if (mapping.floorRole) {
    mentions += `<@&${mapping.floorRole}> `;
  }
  return `${mentions}New Floor @ ${
    tracker.currentFloor.price?.toFixed(2) || "?"
  } SOL`;
};

export const buildFloorEmbed = (tracker: CollectionTracker): MessageEmbed => {
  const { collection, currentFloor, marketSummary } = tracker;

  const embed = new MessageEmbed()
    .setColor("#ffff00")
    .setTitle(`${collection} Floor Listing`)
    .setURL(currentFloor.url)
    .setAuthor("Degen Bible Bot")
    .setDescription(
      `${getListingPrefix(currentFloor)} @ ${getPrice(currentFloor)}`
    )
    .addFields(
      {
        name: `Floor Listing`,
        value: `${currentFloor.title}`,
        inline: false,
      },
      ...buildMarketEmbedFields(marketSummary)
    )
    .setImage(currentFloor.image)
    .setFooter(`Listing: ${currentFloor.url}`)
    .setTimestamp();

  return embed;
};

export const buildTraitTitle = (
  bestTraitLists: [BestTraitListing],
  mapping: ICollectionMapping
): string => {
  const { traitRole, collection } = mapping;
  let mentions = `<@&${process.env.ALL_TRAIT_ROLE_ID}> `;
  if (traitRole) {
    mentions += `<@&${traitRole}> `;
  }
  const bestTrait = bestTraitLists[0];
  return `${mentions}New Best ${collection} Trait Snipe ${
    bestTrait.attribute
  } (Rank ${
    bestTrait.floorListing.rank
  }) @ ${bestTrait.floorListing.price?.toFixed(
    2
  )} SOL (Next ${bestTrait.nextListing.price?.toFixed(2)})`;
};

export const buildTraitEmbed = (
  bestTraitLists: [BestTraitListing]
): MessageEmbed => {
  const bestTrait = bestTraitLists[0];

  const embed = new MessageEmbed()
    .setColor("#00ff00")
    .setTitle(`${bestTrait.floorListing.collection} Trait Snipe Listing`)
    .setURL(bestTrait.floorListing.url)
    .setAuthor("Degen Bible Bot")
    .setDescription(
      `${getListingPrefix(bestTrait.floorListing)} @ ${getPrice(
        bestTrait.floorListing
      )}`
    )
    .addFields(...buildBestTraitEmbedFields(bestTraitLists))
    .setImage(bestTrait.floorListing.image)
    .setFooter(`Listing: ${bestTrait.floorListing.url}`)
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
  const { collection, currentListings, marketSummary, bestTraitListings } =
    tracker;
  const description = marketSumStr(marketSummary);

  const embed = new MessageEmbed()
    .setColor("#0099ff")
    .setTitle(`${collection} Market Summary`)
    .setURL(getBibleLink(path))
    .setAuthor("Degen Bible Bot")
    .setDescription(description)
    .addFields(...buildMarketEmbedFields(marketSummary))
    .addFields(...buildBestTraitEmbedFields(bestTraitListings))
    .setTimestamp();

  currentListings.slice(0, 4).forEach((listing) => {
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

export const toTokenAlertMsg = (t: ITokenTracker): string => {
  const trackType = t.tokenTrackerType;
  const tknVal =
    trackType === "Floor" ? t.token?.floorPrice : t.token?.suggestedPrice;
  const tokenValue = tknVal?.toFixed(2) || 0.0;
  let comp = "below";
  let compValue = t.below?.toFixed(2) || 0.0;
  if (tokenValue > t.above) {
    comp = "above";
    compValue = t.above?.toFixed(2) || 0.0;
  }
  const walletAddr = t.walletAddress.slice(0, 6) + "...";
  return `${t.token?.title} ${trackType} ${tokenValue} ${comp} ${compValue} SOL in Wallet ${walletAddr}`;
};
