import { OctokitResponse, SearchIssuesAndPullRequestsResponseData } from '@octokit/types';
import { Octokit } from '@octokit/rest';
import * as moment from 'moment';
// @ts-ignore
import * as Slack from 'slack-notify';

export async function dailyReport(options: { ghToken: string; ghRepo: string; slackWebhook: string }, bugLabel: string, sections: string[][]) {
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
  const today = moment().format(FORMAT);
  const firstDayOfThisMonth = moment().startOf('month').format(FORMAT);
  const firstDayOfPrevMonth = moment().subtract(1, 'months').startOf('month').format(FORMAT);
  const lastDayOfPrevMonth = moment().subtract(1, 'months').endOf('month').format(FORMAT);

  async function queryGH(from: string, to: string) {
    const q = `repo:${options.ghRepo}+label:${bugLabel}+type:issue+created:${from}..${to}`;
    console.log('Query', q);
    return octokit.search.issuesAndPullRequests({ q });
  }

  // https://help.github.com/en/github/searching-for-information-on-github/searching-issues-and-pull-requests
  const lastMonth = await queryGH(firstDayOfPrevMonth, lastDayOfPrevMonth);
  const thisMonth = await queryGH(firstDayOfThisMonth, today);

  slack.note({
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: 'Howdy bug chasers! :wave:'
        }
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `Here is your daily bug report for \`${options.ghRepo}\` repository.`
        }
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `_We compare this month (${firstDayOfThisMonth} - ${today}) to the entire previous month (${firstDayOfPrevMonth} - ${lastDayOfPrevMonth})._`
        }
      },
      ...sections.map(section => {
        return {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: stats(section, thisMonth, lastMonth)
          }
        };
      })
    ]
  });
}

function stats(labels: string[], issuesThisMonth: OctokitResponse<SearchIssuesAndPullRequestsResponseData>, issuesLastMonth: OctokitResponse<SearchIssuesAndPullRequestsResponseData>) {
  const totalThisMonth = issuesThisMonth.data.items.filter(item => labels.every(label => item.labels.map(l => l.name).includes(label)));
  const totalLastMonth = issuesLastMonth.data.items.filter(item => labels.every(label => item.labels.map(l => l.name).includes(label)));
  const closedThisMonth = totalThisMonth.filter(item => item.state === 'closed');
  const closedLastMonth = totalLastMonth.filter(item => item.state === 'closed');

  return `*\`${labels.join(' ')}\` issues:*

  • total: \`${totalThisMonth.length}\` vs. \`${totalLastMonth.length}\`
  • closed: \`${closedThisMonth.length}\` vs. \`${closedLastMonth.length}\``
}
