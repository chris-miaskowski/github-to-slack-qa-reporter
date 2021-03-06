import { Octokit } from '@octokit/rest';
import * as moment from 'moment';
// @ts-ignore
import * as Slack from 'slack-notify';

const FORMAT = 'YYYY-MM-DD';
const today = moment().format(FORMAT);
const firstDayOfThisWeek = moment().subtract(6, 'days').format(FORMAT);
const firstDayOfPrevWeek = moment().subtract(13, 'days').format(FORMAT);
const lastDayOfPrevWeek = moment().subtract(7, 'days').format(FORMAT);

type Icons = { good: string; bad: string; neutral: string } | undefined;

export async function dailyReport(options: { ghToken: string; ghRepo: string; slackWebhook: string, icons: Icons }, bugLabel: string, sections: string[][]) {
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


  const queryGH  = {
    async created(from: string, to: string) {
      const q = `repo:${options.ghRepo}+label:${bugLabel}+type:issue+created:${from}..${to}`;
      console.log('Query', q);
      return octokit.paginate(octokit.search.issuesAndPullRequests, {
        q
      })
    },

    async backlog(before: string) {
      const q = `repo:${options.ghRepo}+label:${bugLabel}+type:issue+is:open+created:<${before}`;
      console.log('Query', q);
      return octokit.paginate(octokit.search.issuesAndPullRequests, {
        q
      })
    },
    
    async closed(from: string, to: string) {
      const q = `repo:${options.ghRepo}+label:${bugLabel}+type:issue+closed:${from}..${to}`;
      console.log('Query', q);
      return octokit.paginate(octokit.search.issuesAndPullRequests, {
        q
      })
    },

    async openedAndClosed(from: string, to: string) {
      const q = `repo:${options.ghRepo}+label:${bugLabel}+type:issue+created:${from}..${to}+closed:${from}..${to}`;
      console.log('Query', q);
      return octokit.paginate(octokit.search.issuesAndPullRequests, {
        q
      })
    }
  }

  // https://help.github.com/en/github/searching-for-information-on-github/searching-issues-and-pull-requests
  const createdThisWeek = await queryGH.created(firstDayOfThisWeek, today);
  const createdLastWeek = await queryGH.created(firstDayOfPrevWeek, lastDayOfPrevWeek);

  const closedThisWeek = await queryGH.closed(firstDayOfThisWeek, today);
  const closedLastWeek = await queryGH.closed(firstDayOfPrevWeek, firstDayOfThisWeek);

  const openedAndClosedThisWeek = await queryGH.openedAndClosed(firstDayOfThisWeek, today);
  const openedAndClosedLastWeek = await queryGH.openedAndClosed(firstDayOfPrevWeek, lastDayOfPrevWeek);

  const backlogThisWeek = await queryGH.backlog(today);
  const backlogLastWeek = await queryGH.backlog(lastDayOfPrevWeek);
  
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
          text: `Here is your weekly bug report for \`${options.ghRepo}\` repository.`
        }
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `_We compare previous week (${firstDayOfPrevWeek} - ${lastDayOfPrevWeek}) to this week (${firstDayOfThisWeek} - ${today})._`
        }
      },
      ...sections.map(section => {
        return {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: weeklyStats(options.ghRepo, section, createdThisWeek, createdLastWeek, closedThisWeek, closedLastWeek, openedAndClosedThisWeek, openedAndClosedLastWeek, backlogThisWeek, backlogLastWeek, options.icons)
          }
        };
      })
    ]
  });
}

function weeklyStats(repo: string, requestedLabels: string[], createdIssuesThis: any[], createdIssuesLast: any[], closedIssuesThis: any[], closedIssuesLast: any[], openedAndClosedThis: any[], openedAndClosedLast: any[], backlogThis: any[], backlogLast: any[], icons: Icons) {
  const totalThisWeek = createdIssuesThis.filter(item => requestedLabels.every(requestedLabel => item.labels.map((l: any) => l.name).includes(requestedLabel)));
  const totalLastWeek = createdIssuesLast.filter(item => requestedLabels.every(requestedLabel => item.labels.map((l: any) => l.name).includes(requestedLabel)));
  const closedThisWeek = closedIssuesThis.filter(item => requestedLabels.every(requestedLabel => item.labels.map((l: any) => l.name).includes(requestedLabel)));
  const closedLastWeek = closedIssuesLast.filter(item => requestedLabels.every(requestedLabel => item.labels.map((l: any) => l.name).includes(requestedLabel)));
  const openedAndClosedThisWeek = openedAndClosedThis.filter(item => requestedLabels.every(requestedLabel => item.labels.map((l: any) => l.name).includes(requestedLabel)));
  const openedAndClosedLastWeek = openedAndClosedLast.filter(item => requestedLabels.every(requestedLabel => item.labels.map((l: any) => l.name).includes(requestedLabel)));
  const backlogThisWeek = backlogThis.filter(item => requestedLabels.every(requestedLabel => item.labels.map((l: any) => l.name).includes(requestedLabel)));
  const backlogLastWeek = backlogLast.filter(item => requestedLabels.every(requestedLabel => item.labels.map((l: any) => l.name).includes(requestedLabel)));


  return `*\`${requestedLabels.join(' ')}\` issues:*

  ${createdBugsStats(totalLastWeek, totalThisWeek, repo, requestedLabels, icons)}
  ${turnoverStats(openedAndClosedLastWeek, openedAndClosedThisWeek, repo, requestedLabels, icons)}
  ${closedTotal(closedLastWeek, closedThisWeek, repo, requestedLabels, icons)}
  ${backlog(backlogLastWeek, backlogThisWeek, repo, requestedLabels, icons)}`
}

function backlog(sourcePeriod: any, targetPeriod: any, repo: string, requestedLabels: string[], icons: Icons) {
  return `${indicatorIcon(sourcePeriod, targetPeriod, icons)} backlog: <https://github.com/${repo}/issues?q=is:issue+${generateLabelFilter(requestedLabels)}+is:open+created:%3C${today}|${sourcePeriod.length}> vs. <https://github.com/${repo}/issues?q=is:issue+${generateLabelFilter(requestedLabels)}+is:open+created:%3C${lastDayOfPrevWeek}|${targetPeriod.length}>`
}

function createdBugsStats(sourcePeriod: any, targetPeriod: any, repo: string, requestedLabels: string[], icons: Icons) {
  return `${indicatorIcon(sourcePeriod, targetPeriod, icons)} created: <https://github.com/${repo}/issues?q=is:issue+${generateLabelFilter(requestedLabels)}+created:${firstDayOfThisWeek}..${today}|${sourcePeriod.length}> vs. <https://github.com/${repo}/issues?q=is:issue+${generateLabelFilter(requestedLabels)}+created:${firstDayOfPrevWeek}..${lastDayOfPrevWeek}|${targetPeriod.length}>`;
}

function turnoverStats(sourcePeriod: any, targetPeriod: any, repo: string, requestedLabels: string[], icons: Icons) {
  return `${indicatorIcon(sourcePeriod, targetPeriod, icons)} turnover: <https://github.com/${repo}/issues?q=is:issue+${generateLabelFilter(requestedLabels)}+created:${firstDayOfThisWeek}..${today}+closed:${firstDayOfThisWeek}..${today}|${sourcePeriod.length}> vs. <https://github.com/${repo}/issues?q=is:issue+${generateLabelFilter(requestedLabels)}+created:${firstDayOfPrevWeek}..${lastDayOfPrevWeek}+closed:${firstDayOfPrevWeek}..${lastDayOfPrevWeek}|${targetPeriod.length}>`;
}

function closedTotal(sourcePeriod: any, targetPeriod: any, repo: string, requestedLabels: string[], icons: Icons) {
  return `${indicatorIcon(sourcePeriod, targetPeriod, icons)} closed (total): <https://github.com/${repo}/issues?q=is:issue+${generateLabelFilter(requestedLabels)}+closed:${firstDayOfThisWeek}..${today}|${sourcePeriod.length}>  vs. <https://github.com/${repo}/issues?q=is:issue+${generateLabelFilter(requestedLabels)}+closed:${firstDayOfPrevWeek}..${lastDayOfPrevWeek}|${targetPeriod.length}>`;
}

function indicatorIcon(current: any, previous: any, icons: Icons) {
  const i = icons || { 
    good: ':thumbsup:',
    bad: ':thumbsdown:',
    neutral: ':scales:',
  };
  if (current.length > previous.length) {
    return i.good;
  } else if (current.length < previous.length) {
    return i.bad;
  } else {
    return i.neutral;
  } 
}

function generateLabelFilter(labels: string[]) {
  return labels.map(l => `label:${l}`).join('+');
}