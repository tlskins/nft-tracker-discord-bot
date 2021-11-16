import { CronJob } from "cron";
import Moment from "moment";
import { Client, Snowflake, TextChannel, Webhook, Message } from "discord.js";
import { Config, MarketSummary, Rule } from "../types";
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

  constructor(client: Client, rule: Rule) {
    this.client = client;
    this.rule = rule;
    this.broadcasts = new Map();
  }

  handleBot(): void {
    this.sendMessages();
    syncSubscriptions();
  }

  async sendAdminDm(message: string) {
    const user = await this.client.users.fetch(
      process.env.ADMIN_USER_ID as string
    );
    user.send(message);
  }

  async sendErrMsg(message: string, castKey: string) {
    const lastErrCast = this.broadcasts.get(castKey);
    if (shouldBroadcastErr(lastErrCast)) {
      await this.sendAdminDm(message);
      this.broadcasts.set(castKey, Moment());
    }
  }

  async handleMessage(
    apiColl: string,
    channelId: string
  ): Promise<MarketSummary | undefined> {
    console.log(
      `sending ${apiColl} msg to channel ${channelId} @ ${Moment().format()}`
    );
    const webhook = await this._getWebhook(channelId);
    const errCastKey = apiColl + "-err";

    // get data
    const tracker = await getMarketListings(apiColl);
    if (tracker instanceof Error) {
      this.sendErrMsg(`Error getting ${apiColl} data!`, errCastKey);
      return;
    }

    // broadcast best
    if (tracker.currentBest.isNew) {
      const bestEmbed = buildBestEmbed(tracker, apiColl);
      await webhook.send({
        content: "@here New Best",
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
        const updatePinResp = await updateTracker(apiColl, {
          id: tracker.id,
          pinnedMsgId: msg.id,
        });
        if (updatePinResp instanceof Error) {
          this.sendErrMsg(`Error updating ${apiColl} pin msg!`, errCastKey);
        }
      }

      // update last broadcast at
      const updateTrackerResp = await updateTracker(apiColl, {
        id: tracker.id,
        lastBroadcastAt: Moment().format(),
      });
      if (updateTrackerResp instanceof Error) {
        this.sendErrMsg(
          `Error updating ${apiColl} last broadcast!`,
          errCastKey
        );
      }
    }

    return tracker.marketSummary;
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
    ]);

    const mktSums = await promises;
    const mktSumKey = "mktSummaries";

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
      const sentMsg = await webhook.send(mktMsg);
      await webhook.fetchMessage(sentMsg.id);
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
