import { describe, expect, it } from 'vitest'
import { md5 } from './md5.ts'

describe('md5', () => {
  it('matches known vectors', () => {
    expect(md5('')).toBe('d41d8cd98f00b204e9800998ecf8427e')
    expect(md5('hello')).toBe('5d41402abc4b2a76b9719d911017c592')
    expect(md5('The quick brown fox jumps over the lazy dog')).toBe('9e107d9d372bb6826bd81d3542a419d6')
  })
})
