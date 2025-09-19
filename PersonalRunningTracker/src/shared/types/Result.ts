// Result Pattern implementation for type-safe error handling
export type Result<T, E = string> =
  | { success: true; data: T; error?: never }
  | { success: false; data?: never; error: E };

export const Ok = <T>(data: T): Result<T, never> => ({
  success: true,
  data,
});

export const Err = <E>(error: E): Result<never, E> => ({
  success: false,
  error,
});

// Helper functions for Result handling
export const isOk = <T, E>(result: Result<T, E>): result is { success: true; data: T } =>
  result.success;

export const isErr = <T, E>(result: Result<T, E>): result is { success: false; error: E } =>
  !result.success;

// Map function for Result transformation
export const mapResult = <T, U, E>(
  result: Result<T, E>,
  fn: (data: T) => U
): Result<U, E> => {
  if (isOk(result)) {
    return Ok(fn(result.data));
  }
  return Err(result.error);
};