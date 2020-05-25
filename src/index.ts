import * as fs from 'fs';
import { Octokit } from '@octokit/rest';

const token = fs.readFileSync(`${__dirname}/../.env`, { encoding: 'utf8' });

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

// https://help.github.com/en/github/searching-for-information-on-github/searching-issues-and-pull-requests
octokit.search.issuesAndPullRequests({
  q: 'repo:chris-miaskowski/github-to-slack-qa-reporter+label:bug+type:issue'
}).then(response => {
  console.log('Bugs reported:', response.data.total_count);
});
