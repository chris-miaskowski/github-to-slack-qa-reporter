import { Octokit } from '@octokit/rest';
import * as moment from 'moment';
import * as Slack from 'slack-notify';

export async function dailyReport(options: { ghToken: string; ghRepo: string; slackWebhook: string }) {
  // https://octokit.github.io/
  const octokit = new Octokit({
    auth: options.ghToken,
    userAgent: 'gh2slack${label}reporter v0.0.0',
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

  const slack = Slack(options.slackWebhook);

  const FORMAT = 'YYYY-MM-DD';
  const yesterday = moment().subtract(1, 'days').format(FORMAT);
  const ago2Days = moment().subtract(2, 'days').format(FORMAT);
  const ago7Days = moment().subtract(7, 'days').format(FORMAT);
  const ago14Days = moment().subtract(14, 'days').format(FORMAT);
  const ago30days = moment().subtract(30, 'days').format(FORMAT);
  const ago60days = moment().subtract(60, 'days').format(FORMAT);
  const today = moment().format(FORMAT);
  const label = 't/bug';

  async function queryGH(from, to) {
    const q = `repo:${options.ghRepo}+label:${label}+type:issue+created:${from}..${to}`;
    console.log('Query', q);
    return octokit.search.issuesAndPullRequests({ q });
  }

  // https://help.github.com/en/github/searching-for-information-on-github/searching-issues-and-pull-requests
  const daily = await queryGH(yesterday, today);
  const dailyPrev = await queryGH(ago2Days, yesterday);
  const last7Days = await queryGH(ago7Days, today);
  const last7DaysPrev = await queryGH(ago14Days, ago7Days);
  const last30Day = await queryGH(ago30days, today);
  const last30DayPrev = await queryGH(ago60days, ago30days);

  // https://www.npmjs.com/package/slack-notify
  const dailyChange = change(dailyPrev, daily);
  const weeklyChange = change(last7DaysPrev, last7Days);
  const monthlyChange = change(last30DayPrev, last30Day);
  slack.note({
    text: `*QA's :bug: Report (${options.ghRepo})*.

Reported bugs in range (+/- previous period):
- 1 day: ${daily.data.total_count} (${dailyChange})
- 7 days: ${last7Days.data.total_count} (${weeklyChange})
- 30 days: ${last30Day.data.total_count} (${monthlyChange})`
  });
}

function change(a, b) {
  const c = b.data.total_count - a.data.total_count;
  return Math.sign(c) > 0 ? `+${c}` : (Math.sign(c) < 0 ? `-${c}` : c);
}
