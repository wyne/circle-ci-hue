/*
 * Usage:
 *  node circle-hue.js [ -ucpb ]
 *    -u {hue_username}
 *    -c {circle_token}
 *    -p {circle_project}
 *    -b {circle_branch}
 *
 *  Set tokens in a .env file like:
 *    CIRCLE_API_TOKEN={token here}
 *    HUE_USERNAME={hubot username}
 */

var parseArgs = require('minimist')
var dotenv    = require('dotenv');
var request   = require('request');
var hue       = require("node-hue-api");

dotenv.load();
var argv = parseArgs(process.argv.slice(2));

var api = null;
var lastBuildNum = null;

var circle_token   = process.env.CIRCLE_API_TOKEN;
var hue_username   = process.env.HUE_USERNAME;
var circle_project = argv['p'];
var circle_branch  = argv['b'];

var circle_base    = 'https://circleci.com/api/v1/project/';
var circle_url     = circle_base + circle_project + '/tree/' + circle_branch + '?circle-token=' + circle_token + '&limit=1';

var HueApi = hue.HueApi;
var lightState = hue.lightState;

// Fail is red with ten flashes
// Success is green with one flash
// No change is decrement brightness of previous state
var failState      = lightState.create().on().rgb(255, 0, 0).brightness(100).longAlert();
var successState   = lightState.create().on().rgb(0, 100, 0).brightness(100).shortAlert();
var unchangedState = lightState.create().on().bri_inc(-10);

var displayResult = function(result) {
  return console.log(JSON.stringify(result, null, 2));
};

var displayBridges = function(bridge) {
  var host, username;
  console.log("Hue Bridges Found: " + JSON.stringify(bridge));
  host = bridge[0].ipaddress;
  return api = new HueApi(host, hue_username);
};

var displayLights = function(results) {
  return api.lights().then(displayResult).done();
};

var fetchBuildStatus = function() {
  request({
    url: circle_url,
    headers: {
      'Accept': 'application/json'
    }
  }, function(error, response, body) {
    var build = JSON.parse(body)[0];
    var buildNum = build.build_num;

    console.log(buildNum + ": status=" + build.status + ", outcome=" + build.outcome + ", last=" + lastBuildNum);

    if (buildNum == lastBuildNum) {
      api.setLightState(1, unchangedState);
      return;
    }

    if (build.status == "running") {
      api.setLightState(1, unchangedState);
      return;
    }

    if (build.outcome === "failed") {
      api.setLightState(1, failState).done();
    } else {
      api.setLightState(1, successState).done();
    }

    lastBuildNum = buildNum

    return;
  });
  return setTimeout(fetchBuildStatus, 60. * 1000);
};

hue
  .nupnpSearch()
  .then(displayBridges)
  .then(displayLights)
  .then(fetchBuildStatus)
  .done();
