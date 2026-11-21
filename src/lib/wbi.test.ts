import { describe, expect, it } from 'vitest'
import { md5 } from './md5.ts'
import { extractWbiKey, getMixinKey, signWbi } from './wbi.ts'

describe('wbi', () => {
  it('extracts the key from a wbi image url', () => {
    expect(extractWbiKey('https://i0.hdslb.com/bfs/wbi/7cd084941338484aae1ad9425b84077c.png')).toBe(
      '7cd084941338484aae1ad9425b84077c',
    )
  })

  it('builds a 32 character mixin key from the public table', () => {
    const source = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789ab'
    const mixin = getMixinKey(source)
    expect(mixin).toHaveLength(32)
    expect(mixin[0]).toBe(source[46])
  })

  it('sorts params, strips signature characters, and appends w_rid', () => {
    const query = signWbi({ cid: 3, aid: 1, foo: "a'b" }, 'imgKey', 'subKey', 1_700_000_000)
    const mixin = getMixinKey('imgKeysubKey')
    const signed = 'aid=1&cid=3&foo=ab&wts=1700000000'
    expect(query).toBe(`${signed}&w_rid=${md5(signed + mixin)}`)
  })
})
