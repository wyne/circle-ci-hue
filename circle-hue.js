/*
 *  Usage:
 *    node circle-hue.js [ -pb ]
 *      -p {circle_project}
 *      -b {circle_branch}
 *
 *  Set tokens in a .env file like:
 *    CIRCLE_API_TOKEN={token here}
 *    HUE_USERNAME={hubot username}
 *
 *  Example:
 *    node circle-hue.js -p username/project -b master
 */

var parseArgs = require('minimist')
var dotenv    = require('dotenv');
var request   = require('request');
var hue       = require("node-hue-api");

dotenv.load();
var argv = parseArgs(process.argv.slice(2));

var api = null;
var lastBuild = {};

/*
 * Configuration
 */
var circle_token   = process.env.CIRCLE_API_TOKEN;
var hue_username   = process.env.HUE_USERNAME;
var circle_project = argv['p'];
var circle_branch  = argv['b'] || 'master';

var circle_base    = 'https://circleci.com/api/v1/project/';
var circle_url     = circle_base + circle_project + '/tree/' + circle_branch + '?circle-token=' + circle_token + '&limit=1';

var HueApi = hue.HueApi;
var newOnState = function() {
  return hue.lightState.create().on();
}

/*
 * Light States
 */
var defaultBrightness     = 75;
var failState             = newOnState().rgb(150,   0,   0).brightness(defaultBrightness).longAlert();  // Red, 10 flashes
var successState          = newOnState().rgb(240, 192, 128).brightness(defaultBrightness).shortAlert(); // White, 1 flash
var runningOnSuccessState = newOnState().rgb(  0,   0, 150);                              // Blue
var runningOnFailState    = newOnState().rgb(242, 121,  53);                              // Orange
var unchangedState        = newOnState().bri_inc(-10);

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
    var build;
    try {
      build = JSON.parse(body)[0];
    } catch (err) {
      console.log("Error! " + err.message);
    }
    var buildNum = build.build_num;

    console.log(buildNum + ": status=" + build.status + ", outcome=" + build.outcome + ", last=" + lastBuild.number);

    if (buildNum == lastBuild.number) {
      return;
    }

    if (build.status == "running") {
      api.setLightState(1, unchangedState);

      if (lastBuild.outcome === "failed") {
        api.setLightState(1, runningOnFailState);
      } else {
        api.setLightState(1, runningOnSuccessState);
      }

      return;
    }

    if (build.outcome === "failed") {
      api.setLightState(1, failState).done();
    } else {
      api.setLightState(1, successState).done();
    }

    lastBuild.number = buildNum
    lastBuild.outcome = build.outcome

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
