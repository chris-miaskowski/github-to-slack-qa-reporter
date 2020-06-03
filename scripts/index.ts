import * as dotenv from 'dotenv';
import { dailyReport } from "../src";

dotenv.config();

const { GH_TOKEN, GH_REPO, SLACK_WEBHOOK } = process.env;

dailyReport({
  ghRepo: GH_REPO!,
  ghToken: GH_TOKEN!,
  slackWebhook: SLACK_WEBHOOK!,
});