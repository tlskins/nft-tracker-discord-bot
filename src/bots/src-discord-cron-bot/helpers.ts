import { MarketListing, FloorPrice } from "./types";

export const getTopAttrsTxt = (listing: MarketListing): string => {
  let topAttrs =
    listing.topAttributes?.map((attr) => attr.value).join(", ") || "";
  if (topAttrs) topAttrs = `(${topAttrs})`;

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
