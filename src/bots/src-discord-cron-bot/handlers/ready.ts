import { CronJob } from "cron";
import Moment from "moment";
import { Client, Snowflake, TextChannel, Webhook, Message } from "discord.js";
import {
  Config,
  CollectionTracker,
  Rule,
  ICollectionMapping,
  UpdateCollectionTracker,
} from "../../../types";
import {
  buildMarketEmbed,
  buildBestTitle,
  buildBestEmbed,
  shouldBroadcast,
  shouldBroadcastErr,
  buildAllMarketsEmbed,
  buildFloorTitle,
  buildFloorEmbed,
  buildPumpTitle,
  buildPumpEmbed,
  toTokenAlertMsg,
} from "./presenters";
import {
  getCollectionMappings,
  getMarketListings,
  getTokenAlerts,
  resetTokenAlerts,
  syncSubscriptions,
  updateTracker,
  updateCollMap,
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
  lastOvrBest: CollectionTracker | undefined;
  lastTokenAlert: Moment.Moment | undefined;

  constructor(client: Client, rule: Rule) {
    this.client = client;
    this.rule = rule;
    this.broadcasts = new Map();
    this.setCollectionMappings();
  }

  handleBot(): void {
    syncSubscriptions(this.sendErrMsg("sync-subs-err"));
    this.sendMessages();
    this.checkTokenAlerts();
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
    console.log(`Error: ${message}`);
  }

  sendErrMsg = (castKey: string) => async (message: string) => {
    const lastErrCast = this.broadcasts.get(castKey);
    console.log(`sending err "${message}" - lastAt ${lastErrCast?.format()}`);
    if (shouldBroadcastErr(lastErrCast)) {
      this.postTrackerErr(message);
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
    const tracker = await getMarketListings(
      apiPath,
      this.sendErrMsg(apiPath + "-err")
    );
    if (!tracker) {
      return;
    }

    const { currentBest, currentFloor, marketSummary } = tracker;
    const { saleCountSlope, floorCountSlope, listingCountSlope } =
      marketSummary;

    // broadcast best
    if (currentBest.isNew) {
      const bestEmbed = buildBestEmbed(tracker, apiPath);
      const bestTitle = buildBestTitle(tracker, collMap);
      await webhook.send({
        content: bestTitle,
        username: "Degen Bible Bot",
        embeds: [bestEmbed],
      });
    }

    // broadcast floor
    if (currentFloor.isNew) {
      const floorEmbed = buildFloorEmbed(tracker);
      const floorTitle = buildFloorTitle(tracker, collMap);
      await webhook.send({
        content: floorTitle,
        username: "Degen Bible Bot",
        embeds: [floorEmbed],
      });
    }

    // broadcast pump alert
    if (
      saleCountSlope < 0 && // sales are increasing
      floorCountSlope > 0 && // lower floors are thinner
      listingCountSlope > 0 // listings are decreasing
    ) {
      const pumpTitle = buildPumpTitle(tracker, collMap);
      const pumpEmbed = buildPumpEmbed(tracker);
      await webhook.send({
        content: pumpTitle,
        username: "Degen Bible Bot",
        embeds: [pumpEmbed],
      });

      // temp dm me all pumps
      this.sendDm(
        "709266899602505740",
        `Pump detected for ${collMap.collection}`
      );
    }

    const lastBroadcastAt = tracker.lastBroadcastAt
      ? Moment(tracker.lastBroadcastAt)
      : undefined;

    // send / update pinned msg
    if (shouldBroadcast(lastBroadcastAt)) {
      const mktEmbed = buildMarketEmbed(tracker, apiPath);
      const mktMsg = {
        content: "Market Summary",
        username: "Degen Bible Bot",
        embeds: [mktEmbed],
      };

      const trackerUpds = { id: tracker.id } as UpdateCollectionTracker;
      const pinMsgId = tracker.pinnedMsgId;
      if (pinMsgId) {
        console.log(`updating ${apiPath} pin...`);
        await webhook.editMessage(pinMsgId, mktMsg);
        console.log(`updated ${apiPath} pin!`);

        // temp add new role emojis
        const msg: Message = (await webhook.fetchMessage(pinMsgId)) as Message;
        msg.react("⏰");
      } else {
        const sentMsg = await webhook.send(mktMsg);
        const msg: Message = (await webhook.fetchMessage(
          sentMsg.id
        )) as Message;
        await msg.pin();
        msg.react("🧹");
        msg.react("📊");
        msg.react("⏰");

        // update pinned msg id
        trackerUpds.pinnedMsgId = msg.id;
        const updCollMap = await updateCollMap(
          id,
          { id, pinMsgId: msg.id },
          this.sendErrMsg(apiPath + "-update-err")
        );
        if (updCollMap) UpdateGlobalCollMap(updCollMap);
      }

      // update last broadcast at
      trackerUpds.lastBroadcastAt = Moment().format();
      await updateTracker(
        apiPath,
        trackerUpds,
        this.sendErrMsg(apiPath + "-update-err")
      );
    }

    tracker.apiColl = apiPath;
    return tracker;
  }

  async sendMessages(): Promise<void> {
    const promiseArr = [] as Promise<CollectionTracker | undefined>[];
    GetGlobalCollMaps().forEach((collMap) => {
      promiseArr.push(this.handleMessage(collMap));
    });
    const promises = Promise.all(promiseArr);

    const trackers = await promises;
    const mktSums = trackers
      .map((tracker) => tracker?.marketSummary)
      .filter((sum) => !!sum);
    const mktSumKey = "mktSummaries";

    // get overall best listing
    // const skippedColls = [] as string[];
    // let newOvrBest = undefined as CollectionTracker | undefined;
    // trackers.forEach((tracker) => {
    //   if (
    //     !skippedColls.includes(tracker?.collection || "") &&
    //     tracker &&
    //     (!newOvrBest ||
    //       tracker.currentBest?.score > newOvrBest.currentBest.score)
    //   ) {
    //     newOvrBest = tracker;
    //   }
    // });

    // if new overall best post to market summary
    // if (
    //   !!newOvrBest &&
    //   (!this.lastOvrBest ||
    //     newOvrBest.currentBest?.title !== this.lastOvrBest.currentBest?.title)
    // ) {
    //   const ovrBestHook = await this._getWebhook(
    //     process.env.CHANNEL_MKT_SUMMARY as string
    //   );
    //   const embed = buildBestEmbed(newOvrBest, newOvrBest?.apiColl || "");
    //   await ovrBestHook.send({
    //     content: "New Overall Best",
    //     username: "Degen Bible Bot",
    //     embeds: [embed],
    //   });
    //   this.lastOvrBest = newOvrBest;
    // }

    // send / update market msg
    if (shouldBroadcast(this.broadcasts.get(mktSumKey))) {
      const mktSumEmbed = buildAllMarketsEmbed(mktSums);
      if (mktSumEmbed === undefined) {
        return;
      }
      const mktMsg = {
        content: "Market Summary",
        username: "Degen Bible Bot",
        embeds: [mktSumEmbed],
      };

      const webhook = await this._getWebhook(
        process.env.CHANNEL_MKT_SUMMARY as string
      );

      // update pin or send to channel
      const pinMsgId = process.env.MARKETS_PIN_ID;
      if (pinMsgId) {
        console.log(`updating markets pin...`);
        await webhook.editMessage(pinMsgId, mktMsg);
        console.log(`updated markets pin!`);
      } else {
        console.log(`markets pin not found sending to channel...`);
        const sentMsg = await webhook.send(mktMsg);
        await webhook.fetchMessage(sentMsg.id);
      }
      this.broadcasts.set(mktSumKey, Moment());
    }
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
