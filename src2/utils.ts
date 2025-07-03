import type {ServiceResult} from './types.ts'

export const asyncPipe =
  (...functions) =>
  async initialValue => {
    let currentValue = initialValue
    for (const currentFunction of functions) {
      currentValue = await currentFunction(currentValue)
    }
    return currentValue
  }

/**
 * Creates a successful result
 * @param data - The success data
 * @returns Success result
 */
export const ok = <T>(data: T): ServiceResult<T> => ({
  success: true,
  data
})

/**
 * Creates an error result
 * @param error - The error
 * @returns Error result
 */
export const err = <E extends Error>(error: E): ServiceResult<never, E> => ({
  success: false,
  error
})
