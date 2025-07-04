import type {ServiceResult} from './types.ts'

export function asyncPipe<T>(...functions: Function[]): ServiceResult {
  return async (initialValue: T) => {
    let currentValue = initialValue
    for (const currentFunction of functions) {
      currentValue = await currentFunction(currentValue)
      if (!currentValue.success) {
        return currentValue
      }
    }
    return currentValue
  }
}

/**
 * Creates a successful result
 * @param data - The success data
 * @returns Success result
 */
export function ok<T>(data: T): ServiceResult<T> {
  return {
    success: true,
    data
  }
}

/**
 * Creates an error result
 * @param error - The error
 * @returns Error result
 */
export function err<E extends Error>(error: E): ServiceResult<never, E> {
  return {
    success: false,
    error
  }
}
