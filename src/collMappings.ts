import { ICollectionMapping } from "./types";

let collMaps = new Map<string, ICollectionMapping>();

export const GetCollMaps = (): Map<string, ICollectionMapping> => collMaps;

export const SetCollMaps = (maps: Map<string, ICollectionMapping>): void => {
  collMaps = maps;
};

export const UpdateCollMap = (collMap: ICollectionMapping): void => {
  collMaps.set(collMap.id, collMap);
};

export const FindCollMapByPinId = (
  pinMsgId: string
): ICollectionMapping | undefined => {
  collMaps.forEach((collMap: ICollectionMapping) => {
    if (collMap.pinMsgId === pinMsgId) {
      return collMap;
    }
  });

  return undefined;
};
