import {test, expect, describe} from 'bun:test'

import {asyncPipe, ok, err} from './utils.ts'

describe('asyncPipe', () => {
  test('should handle empty function array', async () => {
    const result = await asyncPipe()(42)
    expect(result).toBe(42)
  })

  test('should handle single function', async () => {
    const double = async (x: number) => x * 2
    const result = await asyncPipe(double)(5)
    expect(result).toBe(10)
  })

  test('should pipe multiple async functions sequentially', async () => {
    const add1 = async (x: number) => x + 1
    const multiply2 = async (x: number) => x * 2
    const subtract3 = async (x: number) => x - 3

    const result = await asyncPipe(add1, multiply2, subtract3)(5)
    // (5 + 1) * 2 - 3 = 12 - 3 = 9
    expect(result).toBe(9)
  })

  test('should handle undefined initial value', async () => {
    const returnDefault = async (input: undefined) => input ?? 'default'
    const addSuffix = async (input: string) => input + '-suffix'

    const result = await asyncPipe(returnDefault, addSuffix)(undefined)
    expect(result).toBe('default-suffix')
  })

  test('should preserve types through the pipe', async () => {
    const numberToString = async (input: number) => input.toString()
    const addPrefix = async (input: string) => `prefix-${input}`

    const result = await asyncPipe(numberToString, addPrefix)(42)
    expect(result).toBe('prefix-42')
    expect(typeof result).toBe('string')
  })

  test('should handle functions with different return types', async () => {
    const createObject = async (input: number) => ({value: input})
    const extractValue = async (obj: {value: number}) => obj.value
    const double = async (input: number) => input * 2

    const result = await asyncPipe(createObject, extractValue, double)(10)
    expect(result).toBe(20)
  })

  test('should handle promise rejection in pipe', async () => {
    const throwError = async () => {
      throw new Error('Test error')
    }
    const shouldNotRun = async (input: number) => input + 1

    expect(async () => {
      await asyncPipe(throwError, shouldNotRun)(5)
    }).toThrow('Test error')
  })

  test('should handle async functions with delays', async () => {
    const delay = (ms: number) =>
      new Promise(resolve => setTimeout(resolve, ms))

    const asyncAdd = async (input: number) => {
      await delay(10)
      return input + 1
    }

    const asyncMultiply = async (input: number) => {
      await delay(10)
      return input * 2
    }

    const startTime = Date.now()
    const result = await asyncPipe(asyncAdd, asyncMultiply)(5)
    const endTime = Date.now()

    expect(result).toBe(12) // (5 + 1) * 2
    expect(endTime - startTime).toBeGreaterThan(15) // Should take at least 20ms
  })

  test('should maintain execution order with async functions', async () => {
    const executionOrder: number[] = []

    const func1 = async (input: number) => {
      await new Promise(resolve => setTimeout(resolve, 30))
      executionOrder.push(1)
      return input + 1
    }

    const func2 = async (input: number) => {
      await new Promise(resolve => setTimeout(resolve, 10))
      executionOrder.push(2)
      return input * 2
    }

    const func3 = async (input: number) => {
      await new Promise(resolve => setTimeout(resolve, 20))
      executionOrder.push(3)
      return input - 1
    }

    const result = await asyncPipe(func1, func2, func3)(5)

    expect(result).toBe(11) // ((5 + 1) * 2) - 1 = 11
    expect(executionOrder).toEqual([1, 2, 3])
  })

  test('should work with non-async functions', async () => {
    const syncAdd = (input: number) => input + 1
    const syncMultiply = (input: number) => input * 2

    const result = await asyncPipe(syncAdd, syncMultiply)(5)
    expect(result).toBe(12)
  })

  test('should handle mixed sync and async functions', async () => {
    const syncAdd = (input: number) => input + 1
    const asyncMultiply = async (input: number) => input * 2
    const syncSubtract = (input: number) => input - 3

    const result = await asyncPipe(syncAdd, asyncMultiply, syncSubtract)(5)
    expect(result).toBe(9) // ((5 + 1) * 2) - 3 = 9
  })
})

describe('ok', () => {
  test('should create successful result with data', () => {
    const result = ok('test data')

    expect(result.success).toBe(true)
    expect(result.data).toBe('test data')
    expect('error' in result).toBe(false)
  })

  test('should handle different data types', () => {
    const stringResult = ok('string')
    const numberResult = ok(42)
    const objectResult = ok({key: 'value'})
    const arrayResult = ok([1, 2, 3])
    const booleanResult = ok(true)
    const nullResult = ok(null)

    expect(stringResult.data).toBe('string')
    expect(numberResult.data).toBe(42)
    expect(objectResult.data).toEqual({key: 'value'})
    expect(arrayResult.data).toEqual([1, 2, 3])
    expect(booleanResult.data).toBe(true)
    expect(nullResult.data).toBe(null)

    // All should be successful
    expect(stringResult.success).toBe(true)
    expect(numberResult.success).toBe(true)
    expect(objectResult.success).toBe(true)
    expect(arrayResult.success).toBe(true)
    expect(booleanResult.success).toBe(true)
    expect(nullResult.success).toBe(true)
  })

  test('should handle undefined data', () => {
    const result = ok(undefined)

    expect(result.success).toBe(true)
    expect(result.data).toBe(undefined)
  })

  test('should preserve object references', () => {
    const originalObject = {nested: {value: 42}}
    const result = ok(originalObject)

    expect(result.data).toBe(originalObject)
    expect(result.data.nested).toBe(originalObject.nested)
  })
})

describe('err', () => {
  test('should create error result with Error instance', () => {
    const error = new Error('Test error')
    const result = err(error)

    expect(result.success).toBe(false)
    expect(result.error).toBe(error)
    expect(result.error.message).toBe('Test error')
    expect('data' in result).toBe(false)
  })

  test('should handle different Error types', () => {
    const genericError = new Error('Generic error')
    const typeError = new TypeError('Type error')
    const rangeError = new RangeError('Range error')
    const syntaxError = new SyntaxError('Syntax error')

    const genericResult = err(genericError)
    const typeResult = err(typeError)
    const rangeResult = err(rangeError)
    const syntaxResult = err(syntaxError)

    expect(genericResult.success).toBe(false)
    expect(typeResult.success).toBe(false)
    expect(rangeResult.success).toBe(false)
    expect(syntaxResult.success).toBe(false)

    expect(genericResult.error).toBeInstanceOf(Error)
    expect(typeResult.error).toBeInstanceOf(TypeError)
    expect(rangeResult.error).toBeInstanceOf(RangeError)
    expect(syntaxResult.error).toBeInstanceOf(SyntaxError)
  })

  test('should handle custom Error classes', () => {
    class CustomError extends Error {
      public code: number

      constructor(message: string, code: number) {
        super(message)
        this.name = 'CustomError'
        this.code = code
      }
    }

    const customError = new CustomError('Custom error message', 404)
    const result = err(customError)

    expect(result.success).toBe(false)
    expect(result.error).toBeInstanceOf(CustomError)
    expect(result.error.message).toBe('Custom error message')
    expect((result.error as CustomError).code).toBe(404)
  })

  test('should preserve error stack trace', () => {
    const error = new Error('Test error')
    const result = err(error)

    expect(result.error.stack).toBeDefined()
    expect(result.error.stack).toContain('Test error')
  })
})

describe('Integration tests', () => {
  test('should work together in async pipe with result types', async () => {
    const processNumber = async (input: number) => {
      if (input < 0) {
        return err(new Error('Negative number not allowed'))
      }
      return ok(input * 2)
    }

    const extractValue = async (result: ReturnType<typeof processNumber>) => {
      const resolved = await result
      if (!resolved.success) {
        throw resolved.error
      }
      return resolved.data
    }

    const addOne = async (input: number) => ok(input + 1)

    // Test successful case
    const successResult = await asyncPipe(
      processNumber,
      extractValue,
      addOne
    )(5)

    const finalResult = await successResult
    expect(finalResult.success).toBe(true)
    expect(finalResult.data).toBe(11) // (5 * 2) + 1 = 11

    // Test error case
    expect(async () => {
      await asyncPipe(processNumber, extractValue, addOne)(-1)
    }).toThrow('Negative number not allowed')
  })

  test('should handle complex data transformation pipeline', async () => {
    interface UserData {
      id: number
      name: string
      email: string
      displayName?: string
    }

    const fetchUser = async (id: number) => {
      if (id <= 0) {
        return err(new Error('Invalid user ID'))
      }
      return ok({
        id,
        name: `User ${id}`,
        email: `user${id}@example.com`
      })
    }

    const validateUser = async (userResult: ReturnType<typeof fetchUser>) => {
      const resolved = await userResult
      if (!resolved.success) {
        return resolved
      }

      const user = resolved.data
      if (!user.email.includes('@')) {
        return err(new Error('Invalid email'))
      }

      return ok(user)
    }

    const transformUser = async (
      userResult: ReturnType<typeof validateUser>
    ) => {
      const resolved = await userResult
      if (!resolved.success) {
        return resolved
      }

      return ok({
        ...resolved.data,
        displayName: `${resolved.data.name} (${resolved.data.email})`
      } as UserData)
    }

    const result = await asyncPipe(fetchUser, validateUser, transformUser)(1)

    const finalResult = await result
    expect(finalResult.success).toBe(true)
    if (finalResult.success) {
      expect(finalResult.data.displayName).toBe('User 1 (user1@example.com)')
    }
  })
})
