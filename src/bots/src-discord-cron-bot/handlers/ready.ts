import { CronJob } from "cron";
import Moment from "moment";
import { Client, Snowflake, TextChannel, Webhook, Message } from "discord.js";
import { Config, CollectionTracker, Rule } from "../types";
import {
  buildMarketEmbed,
  buildBestEmbed,
  getMarketListings,
  shouldBroadcast,
  shouldBroadcastErr,
  buildAllMarketsEmbed,
  syncSubscriptions,
  updateTracker,
} from "../helpers";
import config from "../config.json";

class CronBot {
  client: Client;
  rule: Rule;
  broadcasts: Map<string, Moment.Moment>;
  lastOvrBest: CollectionTracker | undefined;

  constructor(client: Client, rule: Rule) {
    this.client = client;
    this.rule = rule;
    this.broadcasts = new Map();
  }

  handleBot(): void {
    this.sendMessages();
    syncSubscriptions(this.sendErrMsg("sync-subs-err"));
  }

  async sendAdminDm(message: string) {
    const user = await this.client.users.fetch(
      process.env.ADMIN_USER_ID as string
    );
    user.send(message);
    console.log(`Error: ${message}`);
  }

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

  async handleMessage(
    apiColl: string,
    channelId: string
  ): Promise<CollectionTracker | undefined> {
    console.log(
      `sending ${apiColl} msg to channel ${channelId} @ ${Moment().format()}`
    );
    const webhook = await this._getWebhook(channelId);

    // get data
    const tracker = await getMarketListings(
      apiColl,
      this.sendErrMsg(apiColl + "-err")
    );
    if (!tracker) {
      return;
    }

    // broadcast best
    if (tracker.currentBest.isNew) {
      const bestEmbed = buildBestEmbed(tracker, apiColl);
      await webhook.send({
        content: "New Best",
        username: "Degen Bible Bot",
        embeds: [bestEmbed],
      });
    }

    const lastBroadcastAt = tracker.lastBroadcastAt
      ? Moment(tracker.lastBroadcastAt)
      : undefined;

    // send / update market msg
    if (shouldBroadcast(lastBroadcastAt)) {
      const mktEmbed = buildMarketEmbed(tracker, apiColl);
      const mktMsg = {
        content: "Market Summary",
        username: "Degen Bible Bot",
        embeds: [mktEmbed],
      };

      const pinMsgId = tracker.pinnedMsgId;
      if (pinMsgId) {
        console.log(`updating ${apiColl} pin...`);
        await webhook.editMessage(pinMsgId, mktMsg);
        console.log(`updated ${apiColl} pin!`);
      } else {
        const sentMsg = await webhook.send(mktMsg);
        const msg: Message = (await webhook.fetchMessage(
          sentMsg.id
        )) as Message;
        await msg.pin();

        // update pinned msg id
        await updateTracker(
          apiColl,
          {
            id: tracker.id,
            pinnedMsgId: msg.id,
          },
          this.sendErrMsg(apiColl + "-update-err")
        );
      }

      // update last broadcast at
      await updateTracker(
        apiColl,
        {
          id: tracker.id,
          lastBroadcastAt: Moment().format(),
        },
        this.sendErrMsg(apiColl + "-update-err")
      );
    }

    tracker.apiColl = apiColl;
    return tracker;
  }

  async sendMessages(): Promise<void> {
    const promises = Promise.all([
      this.handleMessage(
        process.env.API_PATH_DEGODS as string,
        process.env.CHANNEL_DEGODS as string
      ),
      this.handleMessage(
        process.env.API_PATH_JUNGLE_CATS as string,
        process.env.CHANNEL_JUNGLE_CATS as string
      ),
      this.handleMessage(
        process.env.API_PATH_ROGUE_SHARKS as string,
        process.env.CHANNEL_ROGUE_SHARKS as string
      ),
      this.handleMessage(
        process.env.API_PATH_FAMOUS_FOX as string,
        process.env.CHANNEL_FAMOUS_FOX as string
      ),
      this.handleMessage(
        process.env.API_PATH_GRIM_SYNDICATE as string,
        process.env.CHANNEL_GRIM_SYNDICATE as string
      ),
      this.handleMessage(
        process.env.API_PATH_SOLSTEADS as string,
        process.env.CHANNEL_SOLSTEADS as string
      ),
      this.handleMessage(
        process.env.API_PATH_AURORY as string,
        process.env.CHANNEL_AURORY as string
      ),
      this.handleMessage(
        process.env.API_PATH_PESKY_PENGUINS as string,
        process.env.CHANNEL_PESKY_PENGUINS as string
      ),
      this.handleMessage(
        process.env.API_PATH_MEERKAT as string,
        process.env.CHANNEL_MEERKAT as string
      ),
      this.handleMessage(
        process.env.API_PATH_TURTLES as string,
        process.env.CHANNEL_TURTLES as string
      ),
      this.handleMessage(
        process.env.API_PATH_TRIPPY_BUNNY as string,
        process.env.CHANNEL_TRIPPY_BUNNY as string
      ),
      this.handleMessage(
        process.env.API_PATH_BABY_APES as string,
        process.env.CHANNEL_BABY_APES as string
      ),
      this.handleMessage(
        process.env.API_PATH_GALACTIC_GECKOS_SG as string,
        process.env.CHANNEL_GALACTIC_GECKOS_SG as string
      ),
      this.handleMessage(
        process.env.API_PATH_THE_TOWER as string,
        process.env.CHANNEL_THE_TOWER as string
      ),
      this.handleMessage(
        process.env.API_PATH_PIGGY_SOL_GNG as string,
        process.env.CHANNEL_PIGGY_SOL_GNG as string
      ),
      this.handleMessage(
        process.env.API_PATH_DOGE_CAPITAL as string,
        process.env.CHANNEL_DOGE_CAPITAL as string
      ),
      this.handleMessage(
        process.env.API_PATH_NYAN_HEROES as string,
        process.env.CHANNEL_NYAN_HEROES as string
      ),
      // this.handleMessage(
      //   process.env.API_PATH_BABOLEX as string,
      //   process.env.CHANNEL_BABOLEX as string
      // ),
      this.handleMessage(
        process.env.API_PATH_ANGOMON as string,
        process.env.CHANNEL_ANGOMON as string
      ),
      this.handleMessage(
        process.env.API_PATH_BOUNTY_HUNTER_SG as string,
        process.env.CHANNEL_BOUNTY_HUNTER_SG as string
      ),
      this.handleMessage(
        process.env.API_PATH_SOLGODS as string,
        process.env.CHANNEL_SOLGODS as string
      ),
      this.handleMessage(
        process.env.API_PATH_SOL_DROID_BUS as string,
        process.env.CHANNEL_SOL_DROID_BUS as string
      ),
      this.handleMessage(
        process.env.API_PATH_SOL_MONKETTE_BUS as string,
        process.env.CHANNEL_SOL_MONKETTE_BUS as string
      ),
      this.handleMessage(
        process.env.API_PATH_NAKED_MEERKATS as string,
        process.env.CHANNEL_NAKED_MEERKATS as string
      ),
      this.handleMessage(
        process.env.API_PATH_TAIYO_ROBOTICS as string,
        process.env.CHANNEL_TAIYO_ROBOTICS as string
      ),
      this.handleMessage(
        process.env.API_PATH_PORTALS as string,
        process.env.CHANNEL_PORTALS as string
      ),
      this.handleMessage(
        process.env.API_PATH_FENIX_DANJON as string,
        process.env.CHANNEL_FENIX_DANJON as string
      ),
      this.handleMessage(
        process.env.API_PATH_KROOKS as string,
        process.env.CHANNEL_META_DRAGO as string
      ),
      this.handleMessage(
        process.env.API_PATH_META_DRAGO as string,
        process.env.CHANNEL_KROOKS as string
      ),
    ]);

    const trackers = await promises;
    const mktSums = trackers
      .map((tracker) => tracker?.marketSummary)
      .filter((sum) => !!sum);
    const mktSumKey = "mktSummaries";

    // get overall best listing
    const skippedColls = [] as string[];
    let newOvrBest = undefined as CollectionTracker | undefined;
    trackers.forEach((tracker) => {
      if (
        !skippedColls.includes(tracker?.collection || "") &&
        tracker &&
        (!newOvrBest ||
          tracker.currentBest?.score > newOvrBest.currentBest.score)
      ) {
        newOvrBest = tracker;
      }
    });

    // if new overall best post to market summary
    if (
      !!newOvrBest &&
      (!this.lastOvrBest ||
        newOvrBest.currentBest?.title !== this.lastOvrBest.currentBest?.title)
    ) {
      const ovrBestHook = await this._getWebhook(
        process.env.CHANNEL_MKT_SUMMARY as string
      );
      const embed = buildBestEmbed(newOvrBest, newOvrBest?.apiColl || "");
      await ovrBestHook.send({
        content: "New Overall Best",
        username: "Degen Bible Bot",
        embeds: [embed],
      });
      this.lastOvrBest = newOvrBest;
    }

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
