# Jarvis - Your personal assistant for Hive

Jarvis (for Hive) is a script that automates essential functions for your Hive account[s], which includes:

- Transfer HBD & HIVE to a specified account
- Power-up HIVE to your specified account
- Delegate HIVEPOWER to a specified account[s]
- Claim HBD, HIVE & HIVEPOWER rewards

## Getting Started

### Docker Installation (Recommended)

It is recommended to use Docker.

```
git clone https://github.com/therealwolf42/hive-jarvis.git
cd hive-jarvis

# Scripts needs special rights
chmod +x run.sh

# If you haven't installed Docket yet
./run.sh install_docker

# Do you have a config already from steem-jarvis? Copy it now
# Make sure you use the correct folder names
cp steem-jarvis/configs/config.json hive-jarvis/configs/config.json

# Choose MODE (Default: development => testing-mode without broadcasts to blockchain)
# For example: ./run.sh build production
# If you haven't run it yet (especially the new Hive version)
# then please run development first to test if everything works
./run.sh build MODE # MODE is either production OR development

# To (re-)start the scripts
./run.sh restart

# To get a list of possible commands, use: ./run.sh help
```

### Manual Installation

However, you can also run node manually, with PM2 or your favourite program.

```
Requirement: Node >= 10
sudo apt update
sudo apt install -y curl software-properties-common gnupg build-essential libssl-dev
curl -sL https://deb.nodesource.com/setup_13.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm i npm@latest -g
```

##### 1.) Clone Repository and install packages

```
git clone https://github.com/therealwolf42/hive-jarvis.git
cd -jarvis
npm i
```

#### 2.) Edit your Config

```
# There are 3 different example configs
# config.example.json (clean version)
# config.example.detailed.json (detailed version)
cp configs/config.example.json configs/config.json
nano configs/config.json
```

#### Config Detailed Example

```
{
  "RPC_NODES": [
    "https://anyx.io",
    "https://api.hivekings.com",
    "https://api.hive.blog",
    "https://api.openhive.network"
  ],
  "STEEM_ENGINE_API": "https://scot-api.-engine.com",
  "KEY_PAIRS": [
    {
      "name": "veryuniqueaccount2",
      "type": "posting",
      "key": "5HFAKSS"
    },
    {
      "name": "veryuniqueaccount2",
      "type": "active",
      "key": "5JFJSFD"
    },
    {
      "name": "veryuniqueaccount2",
      "type": "memo",
      "key": "5JFJSFD"
    }
  ],
  "GENERAL": {
    "minimum_hive_for_powerup": 0,
    "minimum_hive_for_transfer": 0,
    "minimum_hive_for_delegation": 2,
    "interval_in_minutes": 30,
    "test_mode": false
  },
  "ACCOUNTS": [
    {
      "name": "veryuniqueaccount1",
      "claim_rewards": true,
      "key_account": "veryuniqueaccount2",
      "actions": [
        {
          "action_type": "powerup",
          "to": "veryuniqueaccount2",
          "asset": "HIVE",
          "keep": 5,
          "memo": "yourmemo"
        },
        {
          "action_type": "transfer",
          "to": "veryuniqueexchange",
          "asset": "HBD",
          "memo": "12345yourexchangeid",
          "encrypted": true
        },
        {
          "action_type": "delegate",
          "to": ["veryuniqueaccount2", "veryuniqueaccount3"],
          "keep": 5,
          "percentage": [60, 40]
        }

      ]
    },
    {
      "name": "veryuniqueaccount2",
      "claim_rewards": true,
      "key_account": "veryuniqueaccount2",
      "actions": [
        {
          "action_type": "delegate",
          "to": "veryuniqueaccount3",
          "percentage": 100
        }

      ]
    },
    {
      "name": "veryuniqueaccount3",
      "claim_rewards": true,
      "key_account": "veryuniqueaccount2",
      "actions": []
    }
  ]
}
```

---

### Config Explanation

In the example above, I added all possible paths of using Jarvis so this should give you an idea, how to configure it, but here is the explanation in detail.

- Key Pairs => Array of object

  - name => Your account name
  - type => either active or posting or memo
  - key => private key

- General => General settings

  - minimum_hive_for_powerup => threshold for powerups
  - minimum_hive_for_transfer => threshold for transfers
  - minimum_hive_for_delegation => threshold for delegations
  - interval_in_minutes => how much time should pass between intervals of checking for work
  - test_mode => whether test mode should be forced (no actual transactions will be made)

- ACCOUNTS => List your accounts here

  - name => Account name
  - claims_rewards => Whether rewards should be claimed (requires posting key)
  - claim_accounts => Whether accounts should be claimed (requires active key)
  - keep_rc => How much RC in percentage should be kept (e.g. 80 for 80% of RC)
  - claim_amount => How many accounts should be claimed at once - e.g. 1 (only change this if you have more than enough Hivepower)
  - key_account => If the key_authority should be used from another account (
  - actions => Array of actions, see below

- Action =>
  - action_type => can be transfer, powerup or delegate
  - to => account[s] that should be targeted i.e: where transfer/powerup/delegation should go to
  - asset => can be HIVE or HBD - only required for transfer & powerup (has to be HIVE for powerup)
  - keep => how much of the asset should be kept in the account
  - memo => only usable by transfers
  - encrypted => if the given memo should be encrypted (requires memo key as key-pair)
  - percentage => only required for delegate, how much of your total Hivepower should go towards the user (has to be same order as to field)

---

### Start

You can either run it directly with npm start or by using PM2.

```
sudo npm install pm2 -g # if you haven't installed it yet

pm2 start ecosystem.config.js --env production
```

### Testing

You can either set the test_mode inside the config to force the test-mode or start the program in development mode

```
npm run dev
# or
# pm2 start ecosystem.config.js
```

## Support

Developed by <a href="https://therealwolf.me">@therealwolf</a>

**Disclaimer: This software has been developed with rigor and cautiousness, but I'm not taking any responsibility for possible bugs or misuse/mistakes from the user. If you're using this software, you're accepting full responsibility for your own funds & accounts.**
