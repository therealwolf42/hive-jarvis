import * as dhive from '@hivechain/dhive'
import _g = require('../_g')

jest.mock('../cast')
import {claim_reward_balance, delegate_wrapper, the_transfer} from '../cast'
import {cast} from '../cast'

test('cast transfer success', async () => {
  expect.assertions(4)
  const mock_func = jest.fn(the_transfer)
  const payload = {
    from: 'example',
    to: 'example1',
    amount: 1.234,
    asset: 'HIVE',
    memo: '',
  }
  const {result, message} = await cast(
    mock_func,
    payload,
    dhive.PrivateKey.fromSeed('example'),
  )
  expect(result.expired).toBeFalsy()
  expect(result.id).toBeDefined()
  expect(message).toBe(
    `Transfer ${payload.amount} ${payload.asset} from ${payload.from} to ${payload.to}`,
  )
  expect(mock_func.mock.calls.length).toEqual(1)
})

test('cast transfer fail with 3 retries', async () => {
  expect.assertions(3)
  const mock_func = jest.fn(the_transfer)
  const payload = {
    from: '',
    to: 'example1',
    amount: 1.234,
    asset: 'HIVE',
    memo: '',
  }
  try {
    const {result, message} = await cast(
      mock_func,
      payload,
      dhive.PrivateKey.fromSeed('example'),
    )
    expect(result).toBeNull()
    expect(message).toBeNull()
  } catch (error) {
    console.log(error)
  }
  expect(mock_func.mock.calls.length).toEqual(3)
})

test('cast claim_reward_balance success', async () => {
  expect.assertions(4)
  const mock_func = jest.fn(claim_reward_balance)
  const payload = {
    name: 'example',
    reward_hbd_balance: '1.000 HBD',
    reward_hive_balance: '4.123 HIVE',
    reward_vesting_balance: '512.521 VESTS',
    reward_vesting_hive: '1.000 HIVE',
  }
  const {result, message} = await cast(
    mock_func,
    payload,
    dhive.PrivateKey.fromSeed('example'),
  )
  expect(result.expired).toBeFalsy()
  expect(result.id).toBeDefined()
  expect(message).toBe(`Claimed 1.000 HBD 4.123 HIVE 1.000 HIVE for example`)
  expect(mock_func.mock.calls.length).toEqual(1)
})

test('cast claim_reward_balance reject', async () => {
  expect.assertions(3)
  const mock_func = jest.fn(claim_reward_balance)
  const payload = {
    name: 'example',
    reward_hbd_balance: '0.000 HBD',
    reward_hive_balance: '0.000 HIVE',
    reward_vesting_balance: '0.000 VESTS',
    reward_vesting_hive: '0.000 HIVE',
  }
  const {result, message} = await cast(
    mock_func,
    payload,
    dhive.PrivateKey.fromSeed('example'),
  )
  expect(result).toBeNull()
  expect(message).toBeNull()
  expect(mock_func.mock.calls.length).toEqual(1)
})

test('delegate wrapper', async () => {
  expect.assertions(7)
  _g.properties.hive_per_mvests = 500
  const mock_func = jest.fn(delegate_wrapper)
  const account = {
    name: 'example1',
    vesting_shares: '100000.000 VESTS',
    delegated_vesting_shares: '30000.000 VESTS',
    received_vesting_shares: '0.000 VESTS',
    vesting_withdraw_rate: '0.000 VESTS',
    to_withdraw: 0,
    withdrawn: 0,
    voting_manabar: 0,
  }
  const payload1 = {account, to: 'example2', percentage: 80, hive_to_keep: 10}
  const r = await cast(
    mock_func,
    payload1,
    dhive.PrivateKey.fromSeed('example'),
  )
  expect(r.result.expired).toBeFalsy()
  expect(r.result.id).toBeDefined()
  expect(r.message).toBe(`Delegated 40 HP (+25) from example1 to example2`)
  expect(mock_func.mock.calls.length).toEqual(1)

  const payload2 = {account, to: 'example2', percentage: 20, hive_to_keep: 10}
  const r2 = await cast(
    mock_func,
    payload2,
    dhive.PrivateKey.fromSeed('example'),
  )
  expect(r2.result).toBeNull()
  expect(r2.message).toBeNull()
  expect(mock_func.mock.calls.length).toEqual(2)
})
