import * as dotenv from 'dotenv'
import _g = require('./_g')
dotenv.config({path: '.env'})
import * as dhive from '@hivechain/dhive'

import {config} from './_g'
import {
  calculate_delegation,
  claim_account,
  convertFloat,
  get_pending_tokens,
  isDryRun,
} from './helpers'
import {inspect} from 'util'

// Retry wrapper for blockchain functions
export const cast = async (
  func,
  payload,
  key: dhive.PrivateKey,
  retries = 0,
) => {
  try {
    const {result, message} = await func(payload, key, isDryRun())
    if (message) console.log(`${isDryRun() ? 'Test Run: ' : ''}${message}`)
    return {result, message}
  } catch (e) {
    console.error(func.name, e, key ? inspect(key) : 'No key present')
    retries += 1
    if (retries < 3) {
      await _g.wait_sec(5)
      return await cast(func, payload, key, retries)
    } else {
      return {result: null, message: null}
    }
  }
}

// Convenient function for transfering funds
export const the_transfer = async (
  {from, to, amount, asset, memo = ''},
  active_key: dhive.PrivateKey,
  dry_run = false,
) => {
  const result = dry_run
    ? null
    : await _g.client.broadcast.transfer(
        {from, to, amount: dhive.Asset.from(amount, asset), memo},
        active_key,
      )
  return {
    result,
    message: `Transfer ${dhive.Asset.from(
      amount,
      asset,
    )} from ${from} to ${to}`,
  }
}

// Convenient function for powering-up Hive
export const power_up = async (
  {from, to, amount, asset},
  active_key,
  dry_run = false,
) => {
  const op: dhive.TransferToVestingOperation = [
    'transfer_to_vesting',
    {amount: dhive.Asset.from(amount, asset), from, to},
  ]
  const result = dry_run
    ? null
    : await _g.client.broadcast.sendOperations([op], active_key)
  return {
    result,
    message: `Powerup ${dhive.Asset.from(amount, asset)} from ${from} to ${to}`,
  }
}

export let delegate = async (
  {delegatee, delegator, delegation, new_delegation_amount},
  active_key,
  dry_run = false,
) => {
  const op: dhive.Operation = [
    'delegate_vesting_shares',
    {
      delegatee,
      delegator,
      vesting_shares: dhive.Asset.fromString(`${delegation.vests} VESTS`),
    },
  ]
  const result = dry_run
    ? null
    : await _g.client.broadcast.sendOperations([op], active_key)

  const message = `Delegated ${delegation.hive} HP (${
    new_delegation_amount > 0 ? '+' : ''
  }${new_delegation_amount}) from ${delegator} to ${delegatee}`

  return {result, message}
}

export const claim_reward_balance = async (
  {
    name,
    reward_hbd_balance,
    reward_hive_balance,
    reward_vesting_balance,
    reward_vesting_hive,
  },
  posting_key,
  dry_run = false,
) => {
  if (
    convertFloat(reward_hbd_balance) > 0 ||
    convertFloat(reward_hive_balance) > 0 ||
    convertFloat(reward_vesting_balance) > 0 ||
    convertFloat(reward_vesting_hive) > 0
  ) {
    const op: dhive.Operation = [
      'claim_reward_balance',
      {
        account: name,
        reward_sbd: reward_hbd_balance,
        reward_steem: reward_hive_balance,
        reward_vests: reward_vesting_balance,
      },
    ]
    const result = dry_run
      ? null
      : await _g.client.broadcast.sendOperations([op], posting_key)
    return {
      result,
      message: `Claimed ${reward_hbd_balance} ${reward_hive_balance} ${reward_vesting_hive}POWER for ${name}`,
    }
  }
  return {result: null, message: null}
}

export const claim_steemengine = async (
  {name},
  posting_key,
  dry_run = false,
) => {
  const pending_tokens = await get_pending_tokens(name)
  if (pending_tokens.length > 0) {
    const op: dhive.CustomJsonOperation = [
      'custom_json',
      {
        required_auths: [],
        required_posting_auths: [name],
        id: 'scot_claim_token',
        json: JSON.stringify(pending_tokens),
      },
    ]
    const result = dry_run
      ? null
      : await _g.client.broadcast.sendOperations([op], posting_key)
    return {
      result,
      message: `Claimed ${pending_tokens.map((x) => x.symbol)} for ${name}`,
    }
  }
  return {result: null, message: null}
}

export const delegate_wrapper = async (
  {account, to, percentage = 100, hive_to_keep = 0},
  active_key: dhive.PrivateKey,
) => {
  const mana_percentage =
    (await _g.client.rc.calculateVPMana(account)).percentage / 10000
  if (!mana_percentage) return

  let delegations = await get_vesting_delegations(account.name)
  delegations = delegations.filter((x) => x.delegatee === to)

  const {
    asset_final_delegation,
    asset_currently_delegated_to_account,
  } = calculate_delegation({
    mana_percentage,
    account,
    percentage,
    delegations,
    hive_to_keep,
  })

  if (
    asset_final_delegation.hive - asset_currently_delegated_to_account.hive >=
      config.GENERAL.minimum_hive_for_delegation &&
    asset_final_delegation.hive > 0 &&
    asset_final_delegation.hive > asset_currently_delegated_to_account.hive &&
    asset_final_delegation.vests - asset_currently_delegated_to_account.vests >
      2005.40993
  ) {
    const payload = {
      delegatee: to,
      delegator: account.name,
      delegation: asset_final_delegation,
      new_delegation_amount: convertFloat(
        asset_final_delegation.hive - asset_currently_delegated_to_account.hive,
      ),
    }

    return await cast(delegate, payload, active_key)
  }
  return {result: null, message: null}
}

// Hive API Wrapper
export const get_accounts = async (names) => {
  return await _g.client.call('condenser_api', 'get_accounts', [names]) // client.database.getAccounts(names)
}

// Hive API Wrapper
export const get_vesting_delegations = async (
  name,
  from = -1,
  limit = 1000,
) => {
  return await _g.client.call('condenser_api', 'get_vesting_delegations', [
    name,
    from,
    limit,
  ])
}

export const claim_account_tokens = async (
  {rc_account, claim_amount},
  active_key,
  dry_run = false,
) => {
  const result = dry_run
    ? null
    : await claim_account(rc_account.account, active_key, claim_amount || 1)
  const message = result
    ? `Claimed ${claim_amount} Account for ${rc_account.account}`
    : `Error: Couldn't claim ${claim_amount} Account for ${rc_account.account}`
  return {result, message}
}
