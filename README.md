# Philips Hue connector for Circle CI

## Setup

Create `.env` file with hue and circle tokens:

```
HUE_USERNAME={username here}
CIRCLE_API_TOKEN={token here}
```

## Run

    node circle-hue.js -p {user/project} -b {branch}

    node circle-hue.js -p user/project -b master
