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
import axios, { AxiosError } from "axios";

import Moment from "moment";

type ServerError = { message: string };

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
  } catch (e) {
    if (axios.isAxiosError(e)) {
      const serverrError = e as AxiosError<ServerError>;
      const errMsg = `error getting collection mappings: ${serverrError.response?.data?.message}`;
      console.error(errMsg);
      handleErr(errMsg);
    } else {
      console.error(e);
    }
  }
};

export const getMarketListings = async (
  collection: string,
  handleErr: (msg: string) => Promise<void>
): Promise<CollectionTracker | undefined> => {
  const startTime = Moment();
  try {
    const collectionData = (await rest.post(
      `collections/${collection}`
    )) as CollectionTrackerResp;

    return collectionData.data.tracker;
  } catch (e) {
    if (Moment().diff(startTime, "seconds") >= 6.9) {
      console.error(
        `Request for ${collection} timedout - supressing error broadcast`
      );
      return;
    }
    if (axios.isAxiosError(e)) {
      const serverErr = e as AxiosError<ServerError>;
      const errMsg = `error getting ${collection} market listings: ${serverErr.response?.data?.message}`;
      console.error(errMsg);
      handleErr(errMsg);
    } else {
      console.error(e);
    }
  }
};

export const syncSubscriptions = async (
  handleErr: (msg: string) => Promise<void>
): Promise<void> => {
  console.log("syncing subscriptions...");
  try {
    await rest.post("/subscriptions/sync");
  } catch (e) {
    if (axios.isAxiosError(e)) {
      const serverErr = e as AxiosError<ServerError>;
      const errMsg = `error syncing subs: ${serverErr.response?.data?.message}`;
      console.error(errMsg);
      handleErr(errMsg);
    } else {
      console.error(e);
    }
  }
};

export const getTokenAlerts = async (
  handleErr: (msg: string) => Promise<void>
): Promise<[ITokenTracker] | undefined> => {
  console.log("getting token alerts...");
  try {
    const resp: GetTokenAlertsResp = await rest.get("/alert-token-trackers");

    return resp.data?.trackers;
  } catch (e) {
    if (axios.isAxiosError(e)) {
      const serverErr = e as AxiosError<ServerError>;
      const errMsg = `error getting token alerts: ${serverErr.response?.data?.message}`;
      console.error(errMsg);
      handleErr(errMsg);
    } else {
      console.error(e);
    }
  }
};

export const resetTokenAlerts = async (
  ids: string[],
  handleErr: (msg: string) => Promise<void>
): Promise<void> => {
  console.log("resetting token alerts...", ids);
  try {
    await rest.delete("/alert-token-trackers", { data: { ids } });
  } catch (e) {
    if (axios.isAxiosError(e)) {
      const serverErr = e as AxiosError<ServerError>;
      const errMsg = `error resetting token alerts: ${serverErr.response?.data?.message}`;
      console.error(errMsg);
      handleErr(errMsg);
    } else {
      console.error(e);
    }
  }
};

export const updateTracker = async (
  collection: string,
  req: UpdateCollectionTracker,
  handleErr: (msg: string) => Promise<void>
): Promise<CollectionTracker | undefined> => {
  try {
    const collectionData = (await rest.put(
      `collections/${collection}`,
      req
    )) as CollectionTrackerResp;

    return collectionData.data.tracker;
  } catch (e) {
    if (axios.isAxiosError(e)) {
      const serverErr = e as AxiosError<ServerError>;
      const errMsg = `error updating ${collection} tracker: ${serverErr.response?.data?.message}`;
      console.error(errMsg);
      handleErr(errMsg);
    } else {
      console.error(e);
    }
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
  } catch (e) {
    if (axios.isAxiosError(e)) {
      const serverErr = e as AxiosError<ServerError>;
      const errMsg = `error updating ${collId} mapping: ${serverErr.response?.data?.message}`;
      console.error(errMsg);
      handleErr(errMsg);
    } else {
      console.error(e);
    }
  }
};
