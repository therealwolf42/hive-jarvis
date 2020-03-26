import * as dotenv from 'dotenv'
dotenv.config({path: '.env'})
import _g = require('./_g')

import {PrivateKey} from '@hivechain/dhive'
import {isArray} from 'util'
import {
  cast,
  claim_account_tokens,
  claim_reward_balance,
  claim_steemengine,
  delegate_wrapper,
  get_accounts,
  power_up,
  the_transfer,
} from './cast'
import {
  claim_account,
  convertFloat,
  encode,
  isDryRun,
  update_accounts,
  update_properties,
  checkOldConfig,
} from './helpers'

const start = async () => {
  try {
    console.log('\n' + '----------------------------' + '\n')
    console.log(
      `Starting Jarvis in ${isDryRun() ? 'Test Mode' : 'Production Mode'}`,
    )
    console.log('\n' + '----------------------------' + '\n')
    await checkOldConfig()
    await main()
  } catch (error) {
    console.error('start', error)
    start()
  }
}

const main = async () => {
  try {
    while (true) {
      // Update Global Dynamic Properties
      await update_properties()

      if (
        !_g.properties.hive_per_mvests ||
        _g.properties.hive_per_mvests <= 0
      ) {
        console.log('Global dynamic properties invalid')
        continue
      }

      // Update accounts
      let hive_accounts = await get_accounts(
        _g.config.ACCOUNTS.map((x) => x.name),
      )
      const rc_accounts = await _g.client.rc.findRCAccounts(
        _g.config.ACCOUNTS.map((x) => x.name),
      )
      let accounts = await update_accounts(hive_accounts, _g.config.ACCOUNTS)

      // Claim rewards
      for (let {
        name,
        hive_account,
        claim_rewards,
        claim_accounts,
        keep_rc,
        claim_amount,
        posting_key,
        active_key,
      } of accounts) {
        if (claim_rewards) {
          await cast(
            claim_reward_balance,
            {
              name,
              reward_hbd_balance: hive_account.reward_sbd_balance, // TODO: change once RPCs changed
              reward_hive_balance: hive_account.reward_steem_balance, // TODO: change once RPCs changed
              reward_vesting_balance: hive_account.reward_vesting_balance,
              reward_vesting_hive: hive_account.reward_vesting_steem, // TODO: change once RPCs changed
            },
            posting_key,
          )
          await cast(claim_steemengine, {name}, posting_key)
        }
        if (claim_accounts && active_key) {
          if (!claim_amount || claim_amount <= 0) claim_amount = 1
          const rc_account = rc_accounts.filter((x) => x.account === name)[0]
          if (!rc_account) continue
          const {percentage} = _g.client.rc.calculateRCMana(rc_account)
          if (!keep_rc) keep_rc = 80
          if (percentage < keep_rc * 100) continue
          await cast(
            claim_account_tokens,
            {rc_account, claim_amount},
            active_key,
          )
        }
      }

      // Update accounts after possible rewards claiming
      hive_accounts = await get_accounts(_g.config.ACCOUNTS.map((x) => x.name))
      accounts = await update_accounts(hive_accounts, accounts, false)

      // Iterate through accounts from config
      await iterate_accounts(accounts)
      await _g.wait_sec(60 * (_g.config.GENERAL.interval_in_minutes || 10))
    }
  } catch (error) {
    console.error('main', error)
    main()
  }
}

export const iterate_accounts = async (accounts) => {
  for (const account of accounts) {
    // Iterate through actions
    for (const action of account.actions) {
      if (
        action.action_type === 'transfer' ||
        action.action_type === 'powerup'
      ) {
        await transfer_powerup_action(account, action, account.active_key)
      }
      if (
        action.action_type === 'delegate' &&
        _g.properties.total_vesting_fund &&
        _g.properties.total_vesting_shares
      ) {
        {
          await iterate_delegations(account, action, account.active_key)
        }
      }
    }
  }
}

const transfer_powerup_action = async (
  account,
  {to, asset, keep, memo, action_type, encrypted},
  active_key,
) => {
  const balance: string =
    asset === 'HBD'
      ? account.hive_account.sbd_balance
      : account.hive_account.balance
  let amount = convertFloat(balance)

  // Determine if the amount is below the threshold which should be kept on account
  if ((keep && keep >= amount) || amount <= 0) return false

  if (keep) amount = convertFloat(amount - keep)

  if (
    action_type === 'transfer' &&
    amount >= _g.config.GENERAL.minimum_hive_for_transfer
  ) {
    const hive_account_to = (await get_accounts([to]))[0]
    if (encrypted && !account.memo_key) {
      return console.log(
        `Skipping transfer from ${account.name} due to missing private memo key`,
      )
    }
    if (!hive_account_to.name) {
      return console.log(
        `Skipping transfer from ${account.name} due to missing public memo key`,
      )
    }
    if (encrypted && memo) {
      memo = encode(hive_account_to.memo_key, memo, account.memo_key.toString())
      if (!memo || memo.substring(0, 1) !== '#') {
        return console.log(
          `Skipping transfer from ${account.name} due to invalid memo after encryption (could mean private memo key is missing`,
        )
      }
    }
    return await cast(
      the_transfer,
      {from: account.name, to, amount, asset, memo},
      active_key,
    )
  } else if (
    action_type === 'powerup' &&
    amount >= _g.config.GENERAL.minimum_hive_for_powerup
  ) {
    return await cast(
      power_up,
      {from: account.name, to, amount, asset},
      active_key,
    )
  }
}

const iterate_delegations = async (
  account,
  {to, percentage, keep},
  active_key,
) => {
  if (!isArray(to)) to = [to]
  if (!isArray(percentage)) percentage = [percentage]
  for (let i = 0; i < to.length; i++) {
    return await delegate_wrapper(
      {
        account: account.hive_account,
        to: to[i],
        percentage: percentage[i],
        hive_to_keep: keep,
      },
      active_key,
    ) // cast(
  }
}

start()
