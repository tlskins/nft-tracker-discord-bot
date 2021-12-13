import {
  CollectionTrackerResp,
  CollectionTracker,
  GetTokenAlertsResp,
  UpdateCollectionTracker,
  ITokenTracker,
  ILandingResp,
  ICollectionMapping,
  ICollectionMappingResp,
  IUpsertCollectionMapping,
} from "./types";
import rest from "./bots/src-discord-cron-bot/rest";

import Moment from "moment";

export const getCollectionMappings = async (
  handleErr: (msg: string) => Promise<void>
): Promise<Map<string, ICollectionMapping> | undefined> => {
  console.log("getting collection mappings...");
  try {
    const resp: ILandingResp = await rest.get("/landing");
    const out = (resp.data?.collections || []).reduce((maps, collMap) => {
      maps.set(collMap.id, collMap);
      return maps;
    }, new Map() as Map<string, ICollectionMapping>);

    return out;
  } catch (err) {
    const errMsg = `error getting collection mappings: ${err.response?.data?.message}`;
    console.error(errMsg);
    handleErr(errMsg);
  }
};

export const getMarketListings = async (
  collection: string,
  handleErr: (msg: string) => Promise<void>
): Promise<CollectionTracker | undefined> => {
  const startTime = Moment();
  try {
    const collectionData = (await rest.post(
      `/${collection}`
    )) as CollectionTrackerResp;

    return collectionData.data.tracker;
  } catch (err) {
    if (Moment().diff(startTime, "seconds") >= 5.9) {
      console.log(
        `Request for ${collection} timedout - supressing error broadcast`
      );
      return;
    }
    const errMsg = `error getting ${collection} market listings: ${err.response?.data?.message}`;
    console.error(errMsg);
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
    const errMsg = `error syncing subs: ${err.response?.data?.message}`;
    console.error(errMsg);
    handleErr(errMsg);
  }
};

export const getTokenAlerts = async (
  handleErr: (msg: string) => Promise<void>
): Promise<[ITokenTracker] | undefined> => {
  console.log("getting token alerts...");
  try {
    const resp: GetTokenAlertsResp = await rest.get("/alert-token-trackers");

    return resp.data?.trackers;
  } catch (err) {
    const errMsg = `error getting token alerts: ${err.response?.data?.message}`;
    console.error(errMsg);
    handleErr(errMsg);
  }
};

export const resetTokenAlerts = async (
  ids: string[],
  handleErr: (msg: string) => Promise<void>
): Promise<void> => {
  console.log("resetting token alerts...", ids);
  try {
    await rest.delete("/alert-token-trackers", { data: { ids } });
  } catch (err) {
    const errMsg = `error resetting token alerts: ${err.response?.data?.message}`;
    console.error(errMsg);
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
    const errMsg = `error updating ${collection} tracker: ${err.response?.data?.message}`;
    console.error(errMsg);
    handleErr(errMsg);
  }
};

export const updateCollMap = async (
  collId: string,
  req: IUpsertCollectionMapping,
  handleErr: (msg: string) => Promise<void>
): Promise<ICollectionMapping | undefined> => {
  try {
    const collectionData = (await rest.put(
      `/collection-mapping`,
      req
    )) as ICollectionMappingResp;

    return collectionData.data.mapping;
  } catch (err) {
    const errMsg = `error updating ${collId} mapping: ${err.response?.data?.message}`;
    console.error(errMsg);
    handleErr(errMsg);
  }
};
