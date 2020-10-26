import * as dhive from '@hiveio/dhive'

export let config = require('../configs/config.js').get() // tslint:disable-line

export let client: dhive.Client = new dhive.Client(config.RPC_NODES, {
  timeout: 2 * 1000,
  rebrandedApi: true,
  consoleOnFailover: true,
}) // TESTNET: dhive.Client.testnet({ timeout: 8 * 1000 })

export let wait_sec = async (sec) => {
  return await Promise.all([timeout(sec * 1000)])
}

export let wait_hour = async (hour) => {
  return await Promise.all([timeout(hour * 60 * 60 * 1000)])
}

const timeout = (ms: any) => {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export let properties = {
  total_vesting_fund: 0,
  total_vesting_shares: 0,
  hive_per_mvests: 0,
}
