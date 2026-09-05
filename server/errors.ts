export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public code = "invalid_request",
  ) {
    super(message);
  }
}
export function ensure(
  value: unknown,
  message: string,
  status = 400,
): asserts value {
  if (!value) throw new ApiError(status, message);
}
