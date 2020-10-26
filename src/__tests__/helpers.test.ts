import * as dhive from '@hiveio/dhive'
import _g = require('../_g')
import {
  calculate_delegation,
  convertFloat,
  createAsset,
  encode,
  get_private_key,
  hive_to_vests,
  vests_to_hive,
} from '../helpers'

test('convert asset-string to float', () => {
  const hive = '10.000 HIVE'
  const hbd = '10.1234 HBD'

  expect(convertFloat(hive)).toBe(10.0)
  expect(convertFloat(hbd)).toBe(10.123)
})

/*test('get hive accounts', async () => {
  expect.assertions(2)
  const accounts = //await get_accounts(['therealwolf', 'steemit', 'ned', 'steemitblog'])
  expect(accounts).toBeDefined()
  expect(accounts).toHaveLength(4)
})*/

test('get private keys', () => {
  const keys = [
    dhive.PrivateKey.fromSeed('example').toString(),
    dhive.PrivateKey.fromSeed('example').toString(),
  ]

  const key_pairs: Array<{
    name: string
    type: 'active' | 'posting'
    key: string
  }> = [
    {
      name: 'example',
      type: 'posting',
      key: keys[0],
    },
    {
      name: 'example',
      type: 'active',
      key: keys[1],
    },
  ]
  const posting_key = get_private_key('example', 'posting', key_pairs)
  const active_key = get_private_key('example', 'active', key_pairs)
  expect(posting_key).toBe(keys[0])
  expect(active_key).toBe(keys[1])
})

test('fail to get private keys', () => {
  const init_key = dhive.PrivateKey.fromSeed('example2').toString()
  const key_pairs: Array<{
    name: string
    type: 'active' | 'posting'
    key: string
  }> = [
    {
      name: 'example',
      type: 'posting',
      key: dhive.PrivateKey.fromSeed('example').toString(),
    },
  ]
  const posting_key = get_private_key('example', 'posting', key_pairs)

  expect(posting_key).not.toBe(init_key)
})

test('hive_to_vests', () => {
  const hive_per_mvests = 500
  const vests = hive_to_vests(50, hive_per_mvests)
  expect(vests).toBe(100000)
})

test('vests_to_hive', () => {
  const hive_per_mvests = 500
  const hive1 = vests_to_hive(100000, hive_per_mvests)
  expect(hive1).toBe(50)

  const hive2 = vests_to_hive(-0, hive_per_mvests)
  expect(hive2).toBe(0)
})

test('createAsset VESTS', () => {
  const hive_per_mvests = 500
  const doubleAsset = createAsset(hive_per_mvests, 100000)
  expect(doubleAsset).toEqual({hive: 50, vests: 100000})

  const doubleAsset1 = createAsset(hive_per_mvests, 0, 0)
  expect(doubleAsset1).toEqual({hive: 0, vests: 0})
})

test('createAsset HIVE', () => {
  const hive_per_mvests = 500
  const hive = 50
  const doubleAsset = createAsset(hive_per_mvests, null, hive)
  expect(doubleAsset).toEqual({hive: 50, vests: 100000})
})

test('calculate_delegation', async () => {
  _g.properties.hive_per_mvests = 500
  const to = 'example2'
  const from = 'example1'
  const percentage = 80
  const mana_percentage = 10000 / 10000
  const account = {
    name: from,
    vesting_shares: '100000.000 VESTS',
    received_vesting_shares: '20000.000 VESTS',
    delegated_vesting_shares: '50000.000 VESTS',
  }

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

  // Keeping 50 HIVE
  const payload1 = {
    mana_percentage,
    account,
    delegations,
    percentage,
    hive_to_keep: 50,
  }
  delegations = delegations.filter((x) => x.delegatee === to)
  const r = calculate_delegation(payload1)
  expect(r.asset_net).toEqual({hive: 25, vests: 50000})
  expect(r.asset_currently_delegated_to_account).toEqual({
    hive: 15,
    vests: 30000,
  })
  expect(r.asset_available_for_delegation).toEqual({hive: 25, vests: 50000})
  expect(r.asset_tokeep).toEqual({hive: 50, vests: 100000})
  expect(r.asset_maximum_delegation).toEqual({hive: -15, vests: -30000})
  expect(r.asset_maximum_delegation_by_percentage).toEqual({hive: 0, vests: 0})
  expect(r.asset_final_delegation).toEqual({hive: 0, vests: 0})

  // Keeping 10 HIVE
  const payload2 = {
    mana_percentage,
    account,
    delegations,
    percentage,
    hive_to_keep: 10,
  }
  delegations = delegations.filter((x) => x.delegatee === to)
  const r2 = calculate_delegation(payload2)
  expect(r2.asset_net).toEqual({hive: 25, vests: 50000})
  expect(r2.asset_currently_delegated_to_account).toEqual({
    hive: 15,
    vests: 30000,
  })
  expect(r2.asset_available_for_delegation).toEqual({hive: 25, vests: 50000})
  expect(r2.asset_tokeep).toEqual({hive: 10, vests: 20000})
  expect(r2.asset_maximum_delegation).toEqual({hive: 25, vests: 50000})
  expect(r2.asset_maximum_delegation_by_percentage).toEqual({
    hive: 40,
    vests: 80000,
  })
  expect(r2.asset_final_delegation).toEqual({hive: 40, vests: 80000})
})

test('encode memo', () => {
  const private_key = dhive.PrivateKey.fromSeed('example').toString()
  const public_key = dhive.PrivateKey.fromSeed('example2')
    .createPublic()
    .toString()
  const encoded = encode(public_key, 'example', private_key)
  expect(encoded).toContain(
    '#BBvrLwYpa1wR7E2xrkeRQ9Hud833SmP7XjKq9TCHCXC2tp6NwcmrkJSfY',
  )

  const encoded2 = encode(public_key, 'example', '')
  expect(encoded2).toBe(null)

  const encoded3 = encode('', 'example', private_key)
  expect(encoded3).toBe(null)
})
