import {Asset, Operation, PrivateKey} from '@hiveio/dhive'
import _g = require('../_g')
import {calculate_delegation, convertFloat, isDryRun} from '../helpers'

export const cast = async (func, payload, key, retries = 0) => {
  try {
    const {result, message} = await func(payload, key, isDryRun)
    return {result, message}
  } catch (e) {
    retries += 1
    if (retries < 3) {
      // await _g.wait_sec(5)
      return await cast(func, payload, key, retries)
    } else {
      return {result: null, message: null}
    }
  }
}

export const the_transfer = async (
  {from, to, amount, asset, memo = '', encrypted = false},
  active_key,
  dry_run,
) => {
  return new Promise((resolve, reject) => {
    const result = {
      id: '809b81543d19f139e1208847bc0138b8c3edf78e',
      block_num: 30699167,
      trx_num: 36,
      expired: false,
    }
    const message = `Transfer ${Asset.from(
      amount,
      asset,
    )} from ${from} to ${to}`
    from &&
    to &&
    amount > 0 &&
    (memo || memo === '') &&
    !isNaN(Number(amount)) &&
    (asset === 'HIVE' || asset === 'HBD') &&
    active_key
      ? resolve({result, message})
      : reject({result: null, message: null})
  })
}

export const delegate = async (
  {delegatee, delegator, delegation, new_delegation_amount},
  active_key,
  dry_run,
) => {
  return new Promise((resolve, reject) => {
    const result = {
      id: '809b81543d19f139e1208847bc0138b8c3edf78e',
      block_num: 30699167,
      trx_num: 36,
      expired: false,
    }
    const message = `Delegated ${delegation.hive} HP (${
      new_delegation_amount > 0 ? '+' : ''
    }${new_delegation_amount}) from ${delegator} to ${delegatee}`
    delegatee &&
    delegator &&
    delegation &&
    delegation.vests &&
    delegation.hive &&
    new_delegation_amount &&
    active_key
      ? resolve({result, message})
      : reject({result: null, message: null})
  })
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
  return new Promise((resolve, reject) => {
    if (
      convertFloat(reward_hbd_balance) > 0 ||
      convertFloat(reward_hive_balance) > 0 ||
      convertFloat(reward_vesting_balance) > 0 ||
      convertFloat(reward_vesting_hive) > 0
    ) {
      const op: Operation = [
        'claim_reward_balance',
        {
          account: name,
          reward_hbd: reward_hbd_balance,
          reward_hive: reward_hive_balance,
          reward_vests: reward_vesting_balance,
        },
      ]
      const result = {
        id: '809b81543d19f139e1208847bc0138b8c3edf78e',
        block_num: 30699167,
        trx_num: 36,
        expired: false,
      }
      const message = `Claimed ${reward_hbd_balance} ${reward_hive_balance} ${reward_vesting_hive} for ${name}`
      name ? resolve({result, message}) : reject({result: null, message: null})
    }
    resolve({result: null, message: null})
  })
}

export const delegate_wrapper = async (
  {account, to, percentage = 100, hive_to_keep = 0},
  active_key: PrivateKey,
) => {
  return new Promise(async (resolve, reject) => {
    const mana_percentage = 10000 / 10000
    _g.config.GENERAL.minimum_hive_for_delegation = 2

    let delegations = [
      {
        delegator: 'example1',
        delegatee: 'example2',
        vesting_shares: '30000.000 VESTS',
      },
      {
        delegator: 'example1',
        delegatee: 'example3',
        vesting_shares: '20000.000 VESTS',
      },
      {
        delegator: 'example4',
        delegatee: 'example1',
        vesting_shares: '20000.000 VESTS',
      },
    ]
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
        _g.config.GENERAL.minimum_hive_for_delegation &&
      asset_final_delegation.hive > 0 &&
      asset_final_delegation.hive > asset_currently_delegated_to_account.hive
    ) {
      const payload = {
        delegatee: to,
        delegator: account.name,
        delegation: asset_final_delegation,
        new_delegation_amount: convertFloat(
          asset_final_delegation.hive -
            asset_currently_delegated_to_account.hive,
        ),
      }
      const {result, message} = await cast(delegate, payload, active_key)
      result !== null && message !== null
        ? resolve({result, message})
        : reject({result: null, message: null})
    }
    resolve({result: null, message: null})
  })
}
