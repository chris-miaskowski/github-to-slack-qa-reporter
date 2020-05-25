import * as fs from 'fs';
import { Octokit } from '@octokit/rest';
// @ts-ignore
import * as Slack from 'slack-notify';

const token = fs.readFileSync(`${__dirname}/../.ghtoken`, { encoding: 'utf8' });
const webhook = fs.readFileSync(`${__dirname}/../.slackwh`, { encoding: 'utf8' });

// https://octokit.github.io/
const octokit = new Octokit({
  auth: token,
  userAgent: 'gh2slackqareporter v0.0.0',
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

const slack = Slack(webhook);

// https://help.github.com/en/github/searching-for-information-on-github/searching-issues-and-pull-requests
octokit.search.issuesAndPullRequests({
  q: 'repo:chris-miaskowski/github-to-slack-qa-reporter+label:bug+type:issue+created:2020-05-24..2020-05-24'
}).then(response => {
  // https://www.npmjs.com/package/slack-notify
  slack.bug(`Bugs reported: ${response.data.total_count}`);
});

