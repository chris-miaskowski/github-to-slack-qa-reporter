import * as dotenv from 'dotenv';
import { dailyReport } from "../src";

dotenv.config();

const { GH_TOKEN, GH_REPO, SLACK_WEBHOOK } = process.env;
const bug = 't/bug';

dailyReport({
  ghRepo: GH_REPO!,
  ghToken: GH_TOKEN!,
  slackWebhook: SLACK_WEBHOOK!,
}, bug, [
  [bug],
  [bug, 'cs/reported'],
  [bug, 'p/urgent'],
]);