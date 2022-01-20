import {
  CollectionTrackerResp,
  CollectionTracker,
  GetTokenAlertsResp,
  UpdateCollectionTracker,
  ICreateUser,
  ITokenTracker,
  ILandingResp,
  CollectionTrackerData,
  ICollectionMapping,
  ICollectionMappingResp,
  IUpsertCollectionMapping,
  IDiscordUpdateUser,
  IUser,
  IUserResp,
  IUsersResp,
  IReferralsResp,
  IReferrals,
  IEnrollmentResp,
  IEnrollment,
  IFloorTrackersResp,
  IFloorTrackerResp,
  IFloorTracker,
  IMagicEdenSalesResp,
  IMagicEdenSale,
  IMetadata,
  IMetadataResp,
  IWalletUpsert,
  IWallet,
  IWalletResp,
  MarketListing,
  IHatchTracker,
  NetworkResp,
  IStopTracker,
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

export const getCollectionListings = async (
  apiPath: string,
  handleErr: (msg: string) => Promise<void>
): Promise<MarketListing[] | undefined> => {
  console.log("getting collection mappings...");
  try {
    const resp: NetworkResp<MarketListing[]> = await rest.get(
      `/current-listings/${apiPath}`
    );

    return resp.data;
  } catch (e) {
    if (axios.isAxiosError(e)) {
      const serverrError = e as AxiosError<ServerError>;
      const errMsg = `error getting collection listings: ${serverrError.response?.data?.message}`;
      console.error(errMsg);
      handleErr(errMsg);
    } else {
      console.error(e);
    }
  }
};

export const getHatchTrackers = async (
  addrs: string[],
  handleErr: (msg: string) => Promise<void>
): Promise<IHatchTracker[] | undefined> => {
  console.log("getting hatch trackerse...");
  try {
    const resp: NetworkResp<IHatchTracker[]> = await rest.get(
      `/hatch-trackers/${addrs.join(",")}`
    );

    return resp.data;
  } catch (e) {
    if (axios.isAxiosError(e)) {
      const serverrError = e as AxiosError<ServerError>;
      const errMsg = `error getting collection listings: ${serverrError.response?.data?.message}`;
      console.error(errMsg);
      handleErr(errMsg);
    } else {
      console.error(e);
    }
  }
};

export const upsertHatchTracker = async (
  upsert: IHatchTracker,
  handleErr: (msg: string) => Promise<void>
): Promise<IHatchTracker | undefined> => {
  console.log("upsert hatch tracker...");
  try {
    const resp: NetworkResp<IHatchTracker> = await rest.post(
      `/hatch-trackers`,
      {
        params: upsert,
      }
    );

    return resp.data;
  } catch (e) {
    if (axios.isAxiosError(e)) {
      const serverrError = e as AxiosError<ServerError>;
      const errMsg = `error upserting hatch tracker: ${serverrError.response?.data?.message}`;
      console.error(errMsg);
      handleErr(errMsg);
    } else {
      console.error(e);
    }
  }
};

export const getStopTrackers = async (
  handleErr: (msg: string) => Promise<void>
): Promise<IStopTracker[] | undefined> => {
  console.log("getting stop trackerse...");
  try {
    const resp: NetworkResp<IStopTracker[]> = await rest.get(`/stop-trackers`);

    return resp.data;
  } catch (e) {
    if (axios.isAxiosError(e)) {
      const serverrError = e as AxiosError<ServerError>;
      const errMsg = `error getting stop trackers: ${serverrError.response?.data?.message}`;
      console.error(errMsg);
      handleErr(errMsg);
    } else {
      console.error(e);
    }
  }
};

export const upsertStopTracker = async (
  upsert: IStopTracker,
  handleErr: (msg: string) => Promise<void>
): Promise<IStopTracker | undefined> => {
  console.log("upsert stop tracker...", upsert);
  try {
    const resp: NetworkResp<IStopTracker> = await rest.post(
      `/stop-trackers`,
      upsert
    );

    return resp.data;
  } catch (e) {
    if (axios.isAxiosError(e)) {
      const serverrError = e as AxiosError<ServerError>;
      const errMsg = `error upserting stop tracker: ${serverrError.response?.data?.message}`;
      console.error(errMsg);
      handleErr(errMsg);
    } else {
      console.error(e);
    }
  }
};

export const deleteStopTracker = async (
  id: string,
  handleErr: (msg: string) => Promise<void>
): Promise<boolean> => {
  console.log("deleting stop tracker...");
  try {
    await rest.delete(`/stop-trackers/${id}`);
  } catch (e) {
    if (axios.isAxiosError(e)) {
      const serverrError = e as AxiosError<ServerError>;
      const errMsg = `error deleting stop tracker: ${serverrError.response?.data?.message}`;
      console.error(errMsg);
      handleErr(errMsg);
      return false;
    } else {
      console.error(e);
    }
  }
  return true;
};

export const getMarketListings = async (
  collection: string,
  handleErr: (msg: string) => Promise<void>
): Promise<CollectionTrackerData | undefined> => {
  const startTime = Moment();
  try {
    const collectionData = (await rest.post(
      `collections/${collection}`
    )) as CollectionTrackerResp;

    return collectionData.data;
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
  console.log("*** syncing subscriptions...");
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
  console.log("*** subscriptions sync complete...");
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

export const getUsersTrackingMESales = async (
  handleErr: (msg: string) => Promise<void>
): Promise<IUser[] | undefined> => {
  console.log(`Getting users tracking ME sales...`);
  try {
    const resp: IUsersResp = await rest.get(`/magic-eden/sales-tracking/users`);

    return resp.data.users;
  } catch (e) {
    if (axios.isAxiosError(e)) {
      const serverErr = e as AxiosError<ServerError>;
      const errMsg = `Error getting users tracking ME sales: ${serverErr.response?.data?.message}`;
      console.error(errMsg);
      handleErr(errMsg);
    } else {
      console.error(e);
    }
    return undefined;
  }
};

export const getMagicEdenSales = async (
  address: string,
  handleErr: (msg: string) => Promise<void>
): Promise<IMagicEdenSale[] | undefined> => {
  console.log(`Getting users ME sales...`);
  try {
    const resp: IMagicEdenSalesResp = await rest.get(
      `/magic-eden/sales/${address}`
    );

    return resp.data.sales;
  } catch (e) {
    if (axios.isAxiosError(e)) {
      const serverErr = e as AxiosError<ServerError>;
      const errMsg = `Error getting users ME sales: ${serverErr.response?.data?.message}`;
      console.error(errMsg);
      handleErr(errMsg);
    } else {
      console.error(e);
    }
    return undefined;
  }
};

export const getEnrollment = async (
  handleErr: (msg: string) => Promise<void>
): Promise<IEnrollment | undefined> => {
  console.log(`Getting enrollment data...`);
  try {
    const resp: IEnrollmentResp = await rest.get("/enrollment");

    return resp.data.enrollment;
  } catch (e) {
    if (axios.isAxiosError(e)) {
      const serverErr = e as AxiosError<ServerError>;
      const errMsg = `Error getting enrollment data: ${serverErr.response?.data?.message}`;
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

export const deleteFloorTrackers = async (
  ids: [string],
  handleErr: (msg: string) => Promise<void>
): Promise<boolean> => {
  try {
    await rest.delete(`/floor-tracker`, { data: { ids } });
    return true;
  } catch (e) {
    if (axios.isAxiosError(e)) {
      const serverErr = e as AxiosError<ServerError>;
      const errMsg = `error deleting tracker: ${serverErr.response?.data?.message}`;
      console.error(errMsg);
      handleErr(errMsg);
    } else {
      console.error(e);
    }
    return false;
  }
};

export const createFloorTracker = async (
  req: IFloorTracker,
  handleErr: (msg: string) => Promise<void>
): Promise<IFloorTracker | undefined> => {
  try {
    const trackerResp = (await rest.post(
      `/floor-tracker`,
      req
    )) as IFloorTrackerResp;

    return trackerResp.data.tracker;
  } catch (e) {
    if (axios.isAxiosError(e)) {
      const serverErr = e as AxiosError<ServerError>;
      const errMsg = `error creating tracker: ${serverErr.response?.data?.message}`;
      console.error(errMsg);
      handleErr(errMsg);
    } else {
      console.error(e);
    }
  }
};

export const getUserFloorTrackers = async (
  discordId: string,
  handleErr: (msg: string) => Promise<void>
): Promise<IFloorTracker[] | undefined> => {
  try {
    const trackersResp = (await rest.get(
      `/floor-tracker/${discordId}`
    )) as IFloorTrackersResp;

    return trackersResp.data.trackers;
  } catch (e) {
    if (axios.isAxiosError(e)) {
      const serverErr = e as AxiosError<ServerError>;
      const errMsg = `error getting user floor trackers: ${serverErr.response?.data?.message}`;
      console.error(errMsg);
      handleErr(errMsg);
    } else {
      console.error(e);
    }
  }
};

export const getMetadatas = async (
  ids: string[],
  handleErr: (msg: string) => Promise<void>
): Promise<IMetadata[] | undefined> => {
  try {
    const resp = (await rest.get(
      `/metadata/${ids.join(",")}`
    )) as IMetadataResp;

    return resp.data.metadata;
  } catch (e) {
    if (axios.isAxiosError(e)) {
      const serverErr = e as AxiosError<ServerError>;
      const errMsg = `error getting metadata: ${serverErr.response?.data?.message}`;
      console.error(errMsg);
      handleErr(errMsg);
    } else {
      console.error(e);
    }
  }
};

export const upsertMetadatas = async (
  metadata: IMetadata[],
  handleErr: (msg: string) => Promise<void>
): Promise<boolean> => {
  try {
    await rest.post(`/metadata`, { metadata });

    return true;
  } catch (e) {
    if (axios.isAxiosError(e)) {
      const serverErr = e as AxiosError<ServerError>;
      const errMsg = `error upserting metadata: ${serverErr.response?.data?.message}`;
      console.error(errMsg);
      handleErr(errMsg);
    } else {
      console.error(e);
    }
    return false;
  }
};

// wallets

export const upsertWallet = async (
  upsert: IWalletUpsert,
  handleErr: (msg: string) => Promise<void>
): Promise<IWallet | undefined> => {
  try {
    const resp = (await rest.post(`/wallet`, upsert)) as IWalletResp;

    return resp.data.wallet;
  } catch (e) {
    if (axios.isAxiosError(e)) {
      const serverErr = e as AxiosError<ServerError>;
      const errMsg = `error upserting wallet: ${serverErr.response?.data?.message}`;
      console.error(errMsg);
      handleErr(errMsg);
    } else {
      console.error(e);
    }
  }
};
