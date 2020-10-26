import * as dotenv from 'dotenv'
dotenv.config({path: '.env'})
import axios from 'axios'
import {create} from 'domain'
import * as dhive from '@hiveio/dhive'
import {type} from 'os'
import * as hiveJS from '@hiveio/hive-js'
import _g = require('./_g')

import fs from 'fs'

export const calculate_delegation = ({
  mana_percentage,
  account,
  delegations,
  percentage = 100,
  hive_to_keep = 0,
}) => {
  const account_vesting_shares = {
    base: convertFloat(account.vesting_shares),
    received: convertFloat(account.received_vesting_shares),
    delegated: convertFloat(account.delegated_vesting_shares),
  }

  const account_hive = {
    base: vests_to_hive(
      account_vesting_shares.base,
      _g.properties.hive_per_mvests,
    ),
    received: vests_to_hive(
      account_vesting_shares.received,
      _g.properties.hive_per_mvests,
    ),
    delegated: vests_to_hive(
      account_vesting_shares.delegated,
      _g.properties.hive_per_mvests,
    ),
  }

  const asset_currently_delegated_to_account = createAsset(
    _g.properties.hive_per_mvests,
    !delegations || delegations.length <= 0
      ? 0
      : parseFloat(delegations[0].vesting_shares.replace(' VESTS', '')),
  )

  const asset_percentage = createAsset(
    _g.properties.hive_per_mvests,
    account_vesting_shares.base * (percentage / 100),
  )
  const asset_net = createAsset(
    _g.properties.hive_per_mvests,
    account_vesting_shares.base - account_vesting_shares.delegated,
  )
  const asset_tokeep = createAsset(
    _g.properties.hive_per_mvests,
    null,
    hive_to_keep,
  )
  const asset_available_for_delegation = createAsset(
    _g.properties.hive_per_mvests,
    asset_net.vests * mana_percentage,
  )

  const asset_maximum_delegation = createAsset(
    _g.properties.hive_per_mvests,
    asset_net.vests - asset_tokeep.vests + account_vesting_shares.received <
      asset_available_for_delegation.vests
      ? asset_net.vests - asset_tokeep.vests + account_vesting_shares.received
      : asset_available_for_delegation.vests,
  )

  const asset_maximum_delegation_by_percentage = createAsset(
    _g.properties.hive_per_mvests,
    asset_maximum_delegation.vests +
      asset_currently_delegated_to_account.vests <
      asset_percentage.vests
      ? asset_maximum_delegation.vests +
          asset_currently_delegated_to_account.vests
      : asset_percentage.vests,
  )

  const asset_final_delegation = createAsset(
    _g.properties.hive_per_mvests,
    asset_maximum_delegation_by_percentage.vests <
      asset_maximum_delegation.vests +
        asset_currently_delegated_to_account.vests
      ? asset_maximum_delegation_by_percentage.vests
      : asset_maximum_delegation.vests +
          asset_currently_delegated_to_account.vests,
  )

  // console.log({ account_steem, asset_tokeep, asset_currently_delegated_to_account, asset_available_for_delegation, asset_percentage, asset_net, asset_maximum_delegation, asset_maximum_delegation_by_percentage, asset_final_delegation })

  return {
    asset_final_delegation,
    asset_currently_delegated_to_account,
    asset_net,
    asset_tokeep,
    asset_available_for_delegation,
    asset_maximum_delegation_by_percentage,
    asset_maximum_delegation,
  }
}

export const update_accounts = async (
  hive_accounts,
  config_accounts,
  set_keys = true,
) => {
  const accounts = config_accounts.map((x) => {
    // Set private keys
    if (set_keys) {
      x.active_key = get_private_key(
        x.key_account ? x.key_account : x.name,
        'active',
        _g.config.KEY_PAIRS,
      )
      if (x.active_key) x.active_key = dhive.PrivateKey.from(x.active_key)
      x.posting_key = get_private_key(
        x.key_account ? x.key_account : x.name,
        'posting',
        _g.config.KEY_PAIRS,
      )
      if (x.posting_key) x.posting_key = dhive.PrivateKey.from(x.posting_key)
      x.memo_key = get_private_key(
        x.key_account ? x.key_account : x.name,
        'memo',
        _g.config.KEY_PAIRS,
      )
      if (x.memo_key) x.memo_key = dhive.PrivateKey.from(x.memo_key)
    }

    x.hive_account = hive_accounts.filter((y) => y.name === x.name)[0]
    return x
  })
  return accounts
}

export const update_properties = async () => {
  const properties = await _g.client.database.getDynamicGlobalProperties()
  _g.properties.hive_per_mvests =
    (convertFloat(properties.total_vesting_fund_hive) /
      convertFloat(properties.total_vesting_shares)) *
    1e6
  _g.properties.total_vesting_fund = convertFloat(
    properties.total_vesting_fund_hive,
  )
  _g.properties.total_vesting_shares = convertFloat(
    properties.total_vesting_shares,
  )
}

export function convertFloat(text: any) {
  text = text.toString().split(' ')[0]
  return parseFloat(parseFloat(text).toFixed(3))
}

export const createAsset = (hive_per_mvests, vests = 0, hive = 0) => {
  if (!vests && hive) {
    vests = hive_to_vests(hive, hive_per_mvests)
  } else if (!hive && vests) {
    hive = vests_to_hive(vests, hive_per_mvests)
  }
  return {hive, vests}
}

export const vests_to_hive = (vests: number, hive_per_mvests: number) => {
  if (!vests) return 0
  return parseFloat(((vests / 1e6) * hive_per_mvests).toFixed(3))
}

export const hive_to_vests = (hive: number, hive_per_mvests: number) => {
  if (!hive) return 0
  return parseFloat(((hive * 1e6) / hive_per_mvests).toFixed(3))
}

export const get_private_key = (
  name: string,
  key_type: 'active' | 'posting' | 'memo',
  key_pairs: Array<{name: string; type: 'active' | 'posting'; key: string}>,
) => {
  const key_pair = key_pairs.filter(
    (x) => x.name === name && x.type === key_type,
  )[0]
  return key_pair ? key_pair.key : null
}

export const isDryRun = () => {
  return process.env.NODE_ENV !== 'production' || _g.config.GENERAL.test_mode
}

export const encode = (
  public_memo_key,
  memo,
  private_memo_key = process.env.voting_memo,
) => {
  try {
    return hiveJS.memo.encode(private_memo_key, public_memo_key, `#${memo}`)
  } catch (e) {
    return null
  }
}

export const claim_account = async (
  creator: string,
  active_key,
  accounts_to_be_claimed: number = 1,
) => {
  try {
    const fee = dhive.Asset.fromString(`${0} HIVE`)
    const op: dhive.ClaimAccountOperation = [
      'claim_account',
      {creator, fee, extensions: []},
    ]
    const ops = []
    for (let index = 0; index < accounts_to_be_claimed; index++) {
      ops.push(op)
    }
    await _g.client.broadcast.sendOperations(ops, active_key)
    return true
  } catch (error) {
    console.log(`${error.message}`)
    return false
  }
}

export const get_pending_tokens = async (account) => {
  const pending = []
  const tokens = (
    await axios.get(
      `${_g.config.STEEM_ENGINE_API ||
        'https://scot-api.steem-engine.com'}/@${account}`,
    )
  ).data
  if (!tokens) return []
  for (const symbol in tokens) {
    if (tokens[symbol].pending_token > 0) {
      pending.push({symbol})
    }
  }
  return pending
}

export const checkOldConfig = () => {
  const config = _g.config

  // Replaces old nodes
  if (config.RPC_NODES.includes('https://api.steemit.com')) {
    config.RPC_NODES = [
      'https://anyx.io',
      'https://api.hive.blog',
      'https://api.deathwing.me',
      'https://api.followbtcnews.com',
      'https://api.hivekings.com',
      'https://api.openhive.network',
      'https://api.pharesim.me',
      'https://hive.3speak.online',
      'https://hive.roelandp.nl',
      'https://hived.hive-engine.com',
      'https://hived.privex.io',
      'https://rpc.ausbit.dev',
      'https://rpc.esteem.app',
      'https://techcoderx.com',
    ]
  }

  config.GENERAL = replaceObjectKey(config.GENERAL, '_steem_', '_hive_')
  config.ACCOUNTS.map((account) => {
    account.actions.map((action) => {
      if (action.asset === 'STEEM') {
        action.asset = 'HIVE'
      }
      if (action.asset === 'SBD') {
        action.asset = 'HBD'
      }
      return action
    })
    return account
  })

  if (
    JSON.stringify(config, null, 2) !==
    JSON.stringify(require('../configs/config.js').get(), null, 2)
  ) {
    fs.writeFileSync(
      'configs/config.old.json',
      JSON.stringify(_g.config, null, 2),
    )
    fs.writeFileSync('configs/config.json', JSON.stringify(_g.config, null, 2))
    console.log(
      'Your config.json has been updated for Hive. Your old config can be found under config.old.json #HiveOn!',
    )
  }
}

const replaceObjectKey = (obj: object, wrong: string, valid: string) => {
  const newObj = {}
  for (const key in obj) {
    newObj[key.replace(wrong, valid)] = obj[key]
  }
  return newObj
}

/**
 * Fetch API wrapper that retries until timeout is reached.
 */
export async function retryingFetch(
  currentAddress: string,
  allAddresses: string | string[],
  opts: any,
  timeout: number,
  failoverThreshold: number,
  backoff: (tries: number) => number,
  fetchTimeout?: (tries: number) => number,
) {
  let start = Date.now()
  let tries = 0
  let round = 0
  do {
    try {
      if (fetchTimeout) {
        opts.timeout = fetchTimeout(tries)
      }
      const response = await fetch(currentAddress, opts)
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      return {response: await response.json(), currentAddress}
    } catch (error) {
      if (timeout !== 0 && Date.now() - start > timeout) {
        if (
          timeoutErrors.indexOf(error.code) !== -1 &&
          Array.isArray(allAddresses) &&
          allAddresses.length > 1
        ) {
          if (round < failoverThreshold) {
            start = Date.now()
            tries = -1
            if (failoverThreshold > 0) {
              round++
            }
            currentAddress = failover(currentAddress, allAddresses)
          } else {
            if (
              timeoutErrors.indexOf(error.code) !== -1 &&
              Array.isArray(allAddresses)
            ) {
              error.message = `[${
                error.code
              }] tried ${failoverThreshold} times with ${allAddresses.join(
                ',',
              )}`
              throw error
            } else {
              throw error
            }
          }
        } else {
          throw error
        }
      }
      await sleep(backoff(tries++))
    }
  } while (true)
}

const failover = (url: string, urls: string[]) => {
  const index = urls.indexOf(url)
  return urls.length === index + 1 ? urls[0] : urls[index + 1]
}
