import { CronJob } from "cron";
import Moment from "moment";
import { Client, Snowflake, TextChannel, Webhook, Message } from "discord.js";
import { lampsInSol } from "../../../solana";
import {
  Config,
  CollectionTracker,
  Rule,
  ICollectionMapping,
  UpdateCollectionTracker,
  CollectionTrackerData,
  IUser,
  IMagicEdenActivity,
} from "../../../types";
import {
  buildMarketEmbed,
  buildBestTitle,
  buildBestEmbed,
  shouldBroadcastErr,
  buildFloorTitle,
  buildFloorEmbed,
  buildPumpTitle,
  buildPumpEmbed,
  toTokenAlertMsg,
} from "./presenters";
import {
  deleteFloorTrackers,
  getUsersTrackingMESales,
  getCollectionMappings,
  getMarketListings,
  getTokenAlerts,
  resetTokenAlerts,
  syncSubscriptions,
  updateTracker,
  updateCollMap,
  getMagicEdenSales,
} from "../../../api";
import {
  GetGlobalCollMaps,
  SetGlobalCollMaps,
  UpdateGlobalCollMap,
} from "../../../collMappings";
import config from "../config.json";

class CronBot {
  client: Client;
  rule: Rule;
  broadcasts: Map<string, Moment.Moment>;
  usersActivity: Map<string, Moment.Moment | undefined>;
  errCounts: Map<string, number>;
  lastOvrBest: CollectionTracker | undefined;
  lastTokenAlert: Moment.Moment | undefined;

  constructor(client: Client, rule: Rule) {
    this.client = client;
    this.rule = rule;
    this.broadcasts = new Map();
    this.usersActivity = new Map();
    this.errCounts = new Map();
    this.setCollectionMappings();
  }

  async handleBot(): Promise<Promise<void>> {
    this.sendMessages();
    const min = Moment().minute();
    if (min % 30 === 0) {
      syncSubscriptions(this.sendErrMsg("sync-subs-err"));
      // this.checkTokenAlerts(); // disable token trackers for now
    }
    if (min % 15 === 0) {
      this.syncMEWalletActivity();
    }
  }

  async sendDm(userId: string, message: string) {
    const user = await this.client.users.fetch(userId);
    user.send(message);
    console.log(`sentDm: ${userId} ${message}`);
  }

  // error handling

  async postTrackerErr(message: string) {
    const webhook = await this._getWebhook(
      process.env.CHANNEL_TRACKER_ERRS as string
    );
    await webhook.send({
      content: message,
      username: "Degen Bible Bot",
    });
    console.error(`Error: ${message}`);
  }

  sendErrMsg = (castKey: string) => async (message: string) => {
    const lastErrCast = this.broadcasts.get(castKey);
    const lastErr = lastErrCast ? `Last Err: ${lastErrCast.format()} - ` : "";
    console.error(
      `sending err "${message}" - Last Cast: ${
        lastErrCast?.format() || "never"
      }`
    );
    if (shouldBroadcastErr(lastErrCast)) {
      this.postTrackerErr(`${lastErr}${message}`);
      this.broadcasts.set(castKey, Moment());
    }
  };

  // controllers

  async setCollectionMappings(): Promise<void> {
    const collMaps = await getCollectionMappings(
      this.sendErrMsg("setCollMaps")
    );
    if (collMaps) {
      SetGlobalCollMaps(collMaps);
      console.log(`${collMaps.size} Collection Mappings set.`);
    } else {
      throw Error("Unable to load collection mappings");
    }
  }

  async syncMEWalletActivity(): Promise<void> {
    console.log("syncing wallet activity...");

    // getting users who are tracking ME sales
    const users = await getUsersTrackingMESales(
      this.sendErrMsg("getUsersTrackingMESales")
    );
    if (!users) return;
    console.log(`found ${users?.length || 0} users tracking ME sales...`);

    // get current wallet sales
    for (let i = 0; i < users.length; i++) {
      const user = users[i];
      console.log(`syncing wallet activity for ${user.discordName}...`);
      const sales = await getMagicEdenSales(
        user.walletPublicKey,
        this.sendErrMsg("get-me-activity")
      );
      const currActivity = {
        lastCheck: Moment().format(),
        user,
        sales: sales || [],
      };
      console.log(
        `${user.discordName} last sale at ${
          currActivity.sales[0]?.createdAt || "None"
        }...`
      );

      const lastActivity = this.usersActivity.get(user.id);
      if (lastActivity) {
        const newSales = currActivity.sales.filter((sale) => {
          return Moment(sale.createdAt).isAfter(lastActivity);
        });
        console.log(`${newSales.length} new sales found `);
        if (newSales.length > 0) {
          await this.sendDm(
            user.discordId,
            `* New Magic Eden Sale * ${newSales.map(
              (sale) =>
                `${sale.collection_symbol
                  .replaceAll("_", " ")
                  .toLowerCase()} @ ${
                  sale.parsedTransaction.seller_fee_amount / lampsInSol
                }`
            )}`
          );
        }
      }

      this.usersActivity.set(user.id, Moment());
    }
  }

  async checkTokenAlerts(): Promise<void> {
    if (this.lastTokenAlert?.isAfter(Moment().add(-1, "hour"))) {
      console.log("not yet time to check token alerts...");
      return;
    }
    const tokenAlerts = await getTokenAlerts(this.sendErrMsg("tokenAlertErrs"));
    if (!tokenAlerts) {
      console.log("no token alerts");
      return;
    }

    // aggregate alerts by user
    const userAlerts = new Map() as Map<string, string[]>;
    const discordIds = [] as string[];
    tokenAlerts.forEach((tokenTracker) => {
      console.log(`aggregating ${tokenTracker.id}`);
      const { discordId } = tokenTracker;
      if (discordId) {
        const currAlerts = userAlerts.get(discordId);
        if (currAlerts === undefined) {
          discordIds.push(discordId);
        }
        userAlerts.set(discordId, [
          ...(currAlerts || []),
          toTokenAlertMsg(tokenTracker),
        ]);
      }
    });

    // send dms
    discordIds.forEach((discordId) => {
      console.log(`sending dm to ${discordId}`);
      const alertMsgs = userAlerts.get(discordId);
      if (alertMsgs) {
        this.sendDm(discordId, alertMsgs?.join("\n"));
      }
    });

    // reset alerts
    await resetTokenAlerts(
      (tokenAlerts || []).map((a) => a.id),
      this.sendErrMsg("tokenAlertErrs")
    );

    // update last broadcast
    this.lastTokenAlert = Moment();
  }

  async handleMessage(
    collMap: ICollectionMapping
  ): Promise<CollectionTracker | undefined> {
    const { id, collection, channelId, apiPath } = collMap;
    console.log(
      `sending ${collection} msg to channel ${channelId} @ ${Moment().format()}`
    );
    const webhook = await this._getWebhook(channelId);

    // get data
    const marketResp = await getMarketListings(
      apiPath,
      this.sendErrMsg(apiPath + "-err")
    );
    if (!marketResp) {
      return;
    }
    const { tracker, floorTrackers } = marketResp as CollectionTrackerData;
    const { currentBest, currentFloor, marketSummary } = tracker;
    const { isPump } = marketSummary;

    // broadcast best
    if (currentBest?.isNew) {
      const bestEmbed = buildBestEmbed(tracker);
      const bestTitle = buildBestTitle(tracker, collMap);
      await webhook.send({
        content: bestTitle,
        username: "Degen Bible Bot",
        embeds: [bestEmbed],
      });
    }

    // broadcast floor
    if (currentFloor?.isNew) {
      const floorEmbed = buildFloorEmbed(tracker);
      const floorTitle = buildFloorTitle(tracker, collMap);
      await webhook.send({
        content: floorTitle,
        username: "Degen Bible Bot",
        embeds: [floorEmbed],
      });
    }

    // broadcast pump alert
    if (isPump) {
      const pumpEmbed = buildPumpEmbed(tracker);
      // send to collection channel
      await webhook.send({
        content: buildPumpTitle(tracker, collMap, true),
        username: "Degen Bible Bot",
        embeds: [pumpEmbed],
      });

      // send to market sum
      const mktSumHook = await this._getWebhook(
        process.env.CHANNEL_ALL_PUMPS as string
      );
      await mktSumHook.send({
        content: buildPumpTitle(tracker, collMap, false),
        username: "Degen Bible Bot",
        embeds: [pumpEmbed],
      });
    }

    // send / update pinned msg
    const mktEmbed = buildMarketEmbed(tracker);
    const mktMsg = {
      content: "Collection Metrics Snapshot",
      username: "Degen Bible Bot",
      embeds: [mktEmbed],
    };

    const trackerUpds = { id: tracker.id } as UpdateCollectionTracker;
    const pinMsgId = collMap.pinMsgId;
    if (pinMsgId) {
      console.log(`updating ${apiPath} pinid ${pinMsgId}...`);
      await webhook.editMessage(pinMsgId, mktMsg);

      // temp add new role emojis
      // const msg: Message = (await webhook.fetchMessage(pinMsgId)) as Message;
      // msg.react("🃏");
    } else {
      console.log(`new pin for ${apiPath}...`);
      const sentMsg = await webhook.send(mktMsg);
      const msg: Message = (await webhook.fetchMessage(sentMsg.id)) as Message;
      await msg.pin();
      msg.react("🧹");
      msg.react("📊");
      msg.react("⏰");
      // msg.react("🃏");

      // update pinned msg id
      const updCollMap = await updateCollMap(
        id,
        { id, pinMsgId: msg.id },
        this.sendErrMsg(apiPath + "-update-err")
      );
      if (updCollMap) UpdateGlobalCollMap(updCollMap);

      // broadcast to new collections channel
      const newCollChann = process.env.CHANNEL_NEW_COLLS as string;
      const newCollWebhook = await this._getWebhook(newCollChann);
      await newCollWebhook.send({
        content: `* ${updCollMap?.collection} - Added *`,
        username: "Degen Bible Bot",
      });

      // update last broadcast at
      trackerUpds.lastBroadcastAt = Moment().format();
      await updateTracker(
        apiPath,
        trackerUpds,
        this.sendErrMsg(apiPath + "-update-err")
      );
    }

    tracker.apiColl = apiPath;

    // send floor tracker alerts
    (floorTrackers || []).forEach(async (tracker) => {
      const trackType = tracker.isAbove ? "above" : "below";
      const currFloor = currentFloor.marketFloor?.toFixed(2);
      const floorMsg = `* Floor Alert * ${tracker.collection} current floor ${currFloor} SOL ${trackType} ${tracker.floor}`;
      await this.sendDm(tracker.discordId, floorMsg);
      console.log(`Alerted ${tracker.discordId}: ${floorMsg}`);
      deleteFloorTrackers(
        [tracker.id],
        this.sendErrMsg(apiPath + "-update-err")
      );
    });

    return tracker;
  }

  async sendMessages(): Promise<void> {
    const min = Moment().minute();
    const batch = min % 5;
    const promiseArr = [] as Promise<CollectionTracker | undefined>[];
    let idx = 0;
    const now = Moment();
    GetGlobalCollMaps().forEach((collMap) => {
      const isRunAll =
        collMap.runAllCyclesEnd &&
        now.isBefore(Moment(collMap.runAllCyclesEnd));
      if (idx % 5 === batch || isRunAll) {
        promiseArr.push(this.handleMessage(collMap));
      }
      idx++;
    });
    console.log(
      `*** Processing batch ${batch} with size ${promiseArr.length}...`
    );
    Promise.all(promiseArr);
  }

  private async _getWebhook(channelId: Snowflake): Promise<Webhook> {
    const channel = (await this.client.channels.fetch(
      channelId
    )) as TextChannel;
    const webhooks = await channel.fetchWebhooks();

    return !webhooks.size
      ? channel.createWebhook(this.client.user?.username || "📢")
      : (webhooks.first() as Webhook);
  }
}

module.exports = async (client: Client): Promise<void> => {
  console.log(__dirname.split("\\").slice(-2)[0]);

  (config as Config).rules.forEach((rule) => {
    const bot = new CronBot(client, rule);
    new CronJob(
      rule.cronExpression,
      () => bot.handleBot(),
      null,
      true,
      config.timezone
    );
  });
};
