import { INftData } from "./types";

export const isHatched = (data: INftData): boolean => {
  const noAttrs = data.attributes.length === 0;
  const noReveal = data.attributes.some(
    (attr) => attr.value === "Not revealed"
  );

  return noAttrs || noReveal ? false : true;
};
