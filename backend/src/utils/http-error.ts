export class HttpError extends Error {
  readonly status: number;
  readonly details?: unknown;

  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.details = details;
  }
}

export function assertFound(value: unknown, message = 'Resource not found'): asserts value {
  if (value === null || value === undefined) {
    throw new HttpError(404, message);
  }
}
