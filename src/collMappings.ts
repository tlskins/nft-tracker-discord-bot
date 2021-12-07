import { ICollectionMapping } from "./types";

let collMaps = new Map<string, ICollectionMapping>();

export const GetGlobalCollMaps = (): Map<string, ICollectionMapping> =>
  collMaps;

export const GetGlobalCollMap = (id: string): ICollectionMapping | undefined =>
  collMaps.get(id);

export const SetGlobalCollMaps = (
  maps: Map<string, ICollectionMapping>
): void => {
  collMaps = maps;
};

export const UpdateGlobalCollMap = (collMap: ICollectionMapping): void => {
  collMaps.set(collMap.id, collMap);
};

export const FindGlobalCollMapByPin = (
  pinMsgId: string
): ICollectionMapping | undefined => {
  for (const collMap of collMaps.values()) {
    if (collMap.pinMsgId === pinMsgId) {
      return collMap;
    }
  }

  return undefined;
};
