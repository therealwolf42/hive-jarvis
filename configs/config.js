const convict = require('convict')

let config = convict({
  RPC_NODES: {
    doc: 'Array of RPC-Nodes',
    format: '*',
    default: [],
    arg: 'rpc',
  },
  STEEM_ENGINE_API: {
    doc: 'API Endpoint for Steem Engine',
    format: '*',
    default: 'https://scot-api.steem-engine.com',
  },
  GENERAL: {
    default: {
      minimum_hive_for_powerup: 0,
      minimum_hive_for_transfer: 0,
      minimum_hive_for_delegation: 2,
      interval_in_minutes: 10,
      test_mode: false,
    },
  },
  ACCOUNTS: [],
  KEY_PAIRS: [],
})

config.loadFile('./configs/config.json')
config.validate({allowed: 'strict'})

module.exports = config
