import {test, expect} from 'bun:test'

import {asyncPipe, ok, err} from './utils.ts'

test('ok creates successful result', () => {
  const result = ok('test data')
  expect(result.success).toBe(true)
  expect(result.data).toBe('test data')
})

test('err creates error result', () => {
  const error = new Error('test error')
  const result = err(error)
  expect(result.success).toBe(false)
  expect(result.error).toBe(error)
})

test('asyncPipe executes functions in sequence on success', async () => {
  const fn1 = async (x: number) => ok(x + 1)
  const fn2 = async (x: {data: number}) => ok(x.data * 2)
  const fn3 = async (x: {data: number}) => ok(x.data.toString())

  const pipeline = asyncPipe(fn1, fn2, fn3)
  const result = await pipeline(5)

  expect(result.success).toBe(true)
  expect(result.data).toBe('12')
})

test('asyncPipe stops on first error', async () => {
  const fn1 = async (x: number) => ok(x + 1)
  const fn2 = async () => err(new Error('failed'))
  const fn3 = async (x: {data: number}) => ok(x.data * 2)

  const pipeline = asyncPipe(fn1, fn2, fn3)
  const result = await pipeline(5)

  expect(result.success).toBe(false)
  expect(result.error.message).toBe('failed')
})

test('asyncPipe handles empty function list', async () => {
  const pipeline = asyncPipe()
  const result = await pipeline(42)

  expect(result).toBe(42)
})

test('asyncPipe with single function', async () => {
  const fn = async (x: string) => ok(x.toUpperCase())
  const pipeline = asyncPipe(fn)
  const result = await pipeline('hello')

  expect(result.success).toBe(true)
  expect(result.data).toBe('HELLO')
})
