class HttpError extends Error {
  public statusCode: number;
  public code?: string;
  public isOperational: boolean;

  constructor(statusCode: number, message: string, code?: string) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;

    Object.setPrototypeOf(this, HttpError.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}

export const createHttpError = (
  statusCode: number,
  message: string,
  code?: string
): HttpError => {
  return new HttpError(statusCode, message, code);
};

export const BadRequestError = (message: string, code?: string): HttpError => {
  return new HttpError(400, message, code || 'BAD_REQUEST');
};

export const UnauthorizedError = (
  message: string,
  code?: string
): HttpError => {
  return new HttpError(401, message, code || 'UNAUTHORIZED');
};

export const ForbiddenError = (message: string, code?: string): HttpError => {
  return new HttpError(403, message, code || 'FORBIDDEN');
};

export const NotFoundError = (message: string, code?: string): HttpError => {
  return new HttpError(404, message, code || 'NOT_FOUND');
};

export const ConflictError = (message: string, code?: string): HttpError => {
  return new HttpError(409, message, code || 'CONFLICT');
};

export const PayloadTooLargeError = (
  message: string,
  code?: string
): HttpError => {
  return new HttpError(413, message, code || 'PAYLOAD_TOO_LARGE');
};

export const UnprocessableEntityError = (
  message: string,
  code?: string
): HttpError => {
  return new HttpError(422, message, code || 'UNPROCESSABLE_ENTITY');
};

export const InternalServerError = (
  message: string,
  code?: string
): HttpError => {
  return new HttpError(500, message, code || 'INTERNAL_SERVER_ERROR');
};

export default HttpError;
