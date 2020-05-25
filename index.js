const core = require('@actions/core');
const fs = require('fs');
const fetch = require("node-fetch");
const moment = require("moment");

const dataDir = `./.github/actioncloud/issue-tracker`;
if (!fs.existsSync(dataDir)){
  fs.mkdirSync(dataDir, { recursive: true });
}
const dataFilePath = dataDir + '/data.json'
let issueData = [];
fs.readFile(dataFilePath, 'utf8', (err, data) => {
  if (!err) {
    var jsonObj = JSON.parse(data);
    if (typeof jsonObj === "object") {
      issueData = jsonObj
    }
  }
});

const githubToken = core.getInput('github-token');
const repo = process.env.GITHUB_REPOSITORY;
const repoInfo = repo.split("/");
const repoOwner = repoInfo[0];
const repoName = repoInfo[1];

const body = state =>
  JSON.stringify({
    query: `
        query {
            repository(owner:"${repoOwner}", name:"${repoName}") {
                issues(states:${state}) {
                  totalCount
                }
              }
        }`
  });

function getIssues(body) {
  console.log("BODY", body)
  const url = "https://api.github.com/graphql";
  const options = {
    method: "POST",
    body: body,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `bearer ${githubToken}`
    }
  };

  return fetch(url, options)
    .then(resp => resp.json())
    .then(data => {
      console.log("DATA", data)

      return data.data.repository.issues.totalCount;
    }).catch((err) => {console.log(err)});
}

function getOpenIssues() {
  return getIssues(body("OPEN"));
}

function storeData(record) {
  issueData.push(record);
}

function dumpData() {
  const jsonData = JSON.stringify(issueData);
  fs.writeFile(dataFilePath, jsonData, (err) => {
    if (err) throw err;
  });
}

async function run() {
  var openIssues = await getOpenIssues();
  const now = moment().unix();

  storeData({
    timestamp: now,
    openIssues: openIssues,
    closedIssues: closedIssues
  });

  dumpData();
}

run();
