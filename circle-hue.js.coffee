dotenv = require('dotenv')
dotenv.load()

token = 'cb0b56a4e6fff9978290d5696ccd571c4ff238f0'
request = require('request')
hue = require("node-hue-api")

HueApi = hue.HueApi
lightState = hue.lightState

# Set light state to 'on' with warm white value of 500 and brightness set to 100%
white = lightState.create().on().bri_inc(-10)
red   = lightState.create().on().rgb(255, 0, 0).brightness(100).longAlert()
green = lightState.create().on().rgb(0, 100, 0).brightness(100).shortAlert()

api = null
buildNum = null

displayResult = (result) ->
  console.log(JSON.stringify(result, null, 2))

displayBridges = (bridge) ->
  console.log("Hue Bridges Found: " + JSON.stringify(bridge))
  host = bridge[0].ipaddress
  username = '1678c462220328d732bea77e3c751ee3' # process.env.HUE_USERNAME
  api = new HueApi(host, username)

displayLights = (results) ->
  api.lights().then(displayResult).done()

fetchBuildStatus = ->
  circlePollUrl = "https://circleci.com/api/v1/project/PulseSoftwareInc/pulse360/tree/develop?circle-token=#{token}&limit=1"
  request { url: circlePollUrl, headers: { 'Accept': 'application/json' } }, (error, response, body) ->
    build = JSON.parse(body)[0]
    if build.build_num != buildNum
      if build.outcome == "failed"
        console.log "failed"
        api.setLightState(1, red).done()
      else
        console.log "success"
        api.setLightState(1, green).done()
      buildNum = build.build_num
    else
      api.setLightState(1, white)
      console.log "noop"

  setTimeout(fetchBuildStatus, (60) * 1000)

hue
  .nupnpSearch()
  .then(displayBridges)
  .then(displayLights)
  .then(fetchBuildStatus)
  .done()
