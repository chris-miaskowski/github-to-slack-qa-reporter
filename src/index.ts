import * as fs from 'fs';
import { Octokit } from '@octokit/rest';
import * as Slack from 'slack-notify';
import * as dotenv from 'dotenv';
import * as moment from 'moment';

dotenv.config();

const { GH_TOKEN, GH_REPO, SLACK_WEBHOOK } = process.env;

// https://octokit.github.io/
const octokit = new Octokit({
  auth: GH_TOKEN,
  userAgent: 'gh2slackbugreporter v0.0.0',
  previews: ['jean-grey'],
  timeZone: 'Europe/Warsaw',
  baseUrl: 'https://api.github.com',
  log: {
    debug: () => {},
    info: () => {},
    warn: console.warn,
    error: console.error
  },
});

const slack = Slack(SLACK_WEBHOOK);

async function dailyReport() {
  const FORMAT = 'YYYY-MM-DD';
  const yesterday = moment().subtract(1, 'days').format(FORMAT);
  const ago2Days = moment().subtract(2, 'days').format(FORMAT);
  const ago7Days = moment().subtract(7, 'days').format(FORMAT);
  const ago14Days = moment().subtract(14, 'days').format(FORMAT);
  const ago30days = moment().subtract(30, 'days').format(FORMAT);
  const ago60days = moment().subtract(60, 'days').format(FORMAT);
  const today = moment().format(FORMAT);

  // https://help.github.com/en/github/searching-for-information-on-github/searching-issues-and-pull-requests
  const daily = await octokit.search.issuesAndPullRequests({
    q: `repo:${GH_REPO}+label:bug+type:issue+created:${yesterday}..${today}`
  });

  const dailyPrev = await octokit.search.issuesAndPullRequests({
    q: `repo:${GH_REPO}+label:bug+type:issue+created:${ago2Days}..${yesterday}`
  });

  const last7Days = await octokit.search.issuesAndPullRequests({
    q: `repo:${GH_REPO}+label:bug+type:issue+created:${ago7Days}..${today}`
  });

  const last7DaysPrev = await octokit.search.issuesAndPullRequests({
    q: `repo:${GH_REPO}+label:bug+type:issue+created:${ago14Days}..${ago7Days}`
  });

  const last30Day = await octokit.search.issuesAndPullRequests({
    q: `repo:${GH_REPO}+label:bug+type:issue+created:${ago30days}..${today}`
  });

  const last30DayPrev = await octokit.search.issuesAndPullRequests({
    q: `repo:${GH_REPO}+label:bug+type:issue+created:${ago60days}..${ago30days}`
  });

  // https://www.npmjs.com/package/slack-notify
  slack.note({
    text: `QA Daily Bug Report. Bugs since (vs past period):`,
    fields: {
      'Yesterday': `${daily.data.total_count} (dailyPrev.data.total_count})`,
      '7 days ago': `${last7Days.data.total_count} (${last7DaysPrev.data.total_count})`,
      '30 days ago': `${last30Day.data.total_count} (${last30DayPrev.data.total_count})`,
    },
  });
}

dailyReport();
