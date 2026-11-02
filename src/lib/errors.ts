export class CommerceError extends Error {
  constructor(
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = "CommerceError";
  }
}

export function isCommerceError(error: unknown): error is CommerceError {
  return error instanceof CommerceError;
}
