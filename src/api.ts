import {
  CollectionTrackerResp,
  CollectionTracker,
  GetTokenAlertsResp,
  UpdateCollectionTracker,
  ICreateUser,
  ITokenTracker,
  ILandingResp,
  ICollectionMapping,
  ICollectionMappingResp,
  IUpsertCollectionMapping,
  IDiscordUpdateUser,
  IUser,
  IUserResp,
  IReferralsResp,
  IReferrals,
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
    let lastColl: ICollectionMapping | undefined;
    const out = (resp.data?.collections || []).reduce((maps, collMap) => {
      maps.set(collMap.id, collMap);
      if (!lastColl) lastColl = collMap;
      return maps;
    }, new Map() as Map<string, ICollectionMapping>);
    console.log(`Last collection: ${lastColl?.collection}`);

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

export const updateUser = async (
  update: IDiscordUpdateUser,
  handleErr: (msg: string) => Promise<void>
): Promise<boolean> => {
  console.log("Updating user...");
  try {
    await rest.put("/users/admin-update", update);
  } catch (e) {
    if (axios.isAxiosError(e)) {
      const serverErr = e as AxiosError<ServerError>;
      const errMsg = `Error updating user: ${serverErr.response?.data?.message}`;
      console.error(errMsg);
      handleErr(errMsg);
    } else {
      console.error(e);
    }
    return false;
  }

  return true;
};

export const createUser = async (
  create: ICreateUser,
  handleErr: (msg: string) => Promise<void>
): Promise<IUser | undefined> => {
  console.log("Creating user...");
  try {
    const resp = (await rest.post("/users", create)) as IUserResp;

    return resp.data.user;
  } catch (e) {
    if (axios.isAxiosError(e)) {
      const serverErr = e as AxiosError<ServerError>;
      const errMsg = `Error updating user: ${serverErr.response?.data?.message}`;
      console.error(errMsg);
      handleErr(errMsg);
    } else {
      console.error(e);
    }
    return;
  }
};

export const getReferrals = async (
  discordId: string,
  handleErr: (msg: string) => Promise<void>
): Promise<IReferrals | undefined> => {
  console.log("Getting referrals...");
  try {
    const resp = (await rest.get(
      `/users/referrals/${discordId}`
    )) as IReferralsResp;

    return resp.data.referrals;
  } catch (e) {
    if (axios.isAxiosError(e)) {
      const serverErr = e as AxiosError<ServerError>;
      const errMsg = `Error getting referrals: ${serverErr.response?.data?.message}`;
      console.error(errMsg);
      handleErr(errMsg);
    } else {
      console.error(e);
    }
    return;
  }
};

export const getUserByDiscord = async (
  discordId: string,
  handleErr: (msg: string) => Promise<void>
): Promise<IUser | undefined> => {
  console.log(`Getting user by discord ${discordId}...`);
  try {
    const resp: IUserResp = await rest.get(
      `/users/find-by-discord/${discordId}`
    );

    return resp.data.user;
  } catch (e) {
    if (axios.isAxiosError(e)) {
      const serverErr = e as AxiosError<ServerError>;
      const errMsg = `Error finding user: ${serverErr.response?.data?.message}`;
      console.error(errMsg);
      handleErr(errMsg);
    } else {
      console.error(e);
    }
    return undefined;
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
