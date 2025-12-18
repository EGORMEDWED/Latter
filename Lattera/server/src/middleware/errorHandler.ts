import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import multer from 'multer';
import logger from '../utils/logger';
import HttpError from '../utils/HttpError';

interface ErrorResponse {
  error: {
    message: string;
    code: string;
    statusCode: number;
    requestId?: string;
    stack?: string;
    details?: unknown;
  };
}

const handleMongooseValidationError = (
  err: mongoose.Error.ValidationError
): { statusCode: number; message: string; code: string; details: unknown } => {
  const errors = Object.values(err.errors).map(error => ({
    field: error.path,
    message: error.message,
  }));

  return {
    statusCode: 400,
    message: 'Ошибка валидации данных',
    code: 'VALIDATION_ERROR',
    details: errors,
  };
};

const handleMongooseCastError = (
  err: mongoose.Error.CastError
): { statusCode: number; message: string; code: string } => {
  return {
    statusCode: 400,
    message: `Некорректное значение для поля ${err.path}: ${err.value}`,
    code: 'INVALID_ID',
  };
};

const handleMongooseDuplicateKeyError = (err: {
  code: number;
  keyValue: Record<string, unknown>;
}): { statusCode: number; message: string; code: string; details: unknown } => {
  const field = Object.keys(err.keyValue)[0];
  return {
    statusCode: 409,
    message: `Значение поля '${field}' уже существует`,
    code: 'DUPLICATE_KEY',
    details: { field, value: err.keyValue[field] },
  };
};

const handleJWTError = (): {
  statusCode: number;
  message: string;
  code: string;
} => {
  return {
    statusCode: 401,
    message: 'Недействительный токен',
    code: 'INVALID_TOKEN',
  };
};

const handleJWTExpiredError = (): {
  statusCode: number;
  message: string;
  code: string;
} => {
  return {
    statusCode: 401,
    message: 'Токен истек',
    code: 'TOKEN_EXPIRED',
  };
};

const handleMulterError = (
  err: multer.MulterError
): { statusCode: number; message: string; code: string } => {
  switch (err.code) {
    case 'LIMIT_FILE_SIZE':
      return {
        statusCode: 413,
        message: 'Размер файла слишком большой',
        code: 'FILE_TOO_LARGE',
      };
    case 'LIMIT_FILE_COUNT':
      return {
        statusCode: 400,
        message: 'Слишком много файлов',
        code: 'TOO_MANY_FILES',
      };
    case 'LIMIT_UNEXPECTED_FILE':
      return {
        statusCode: 400,
        message: 'Неожиданное поле файла',
        code: 'UNEXPECTED_FILE_FIELD',
      };
    default:
      return {
        statusCode: 400,
        message: err.message,
        code: 'FILE_UPLOAD_ERROR',
      };
  }
};

const handleS3Error = (err: {
  name: string;
  message: string;
  $metadata?: { httpStatusCode?: number };
}): { statusCode: number; message: string; code: string } => {
  const statusCode = err.$metadata?.httpStatusCode || 500;

  if (err.name === 'NoSuchKey') {
    return {
      statusCode: 404,
      message: 'Файл не найден в хранилище',
      code: 'S3_FILE_NOT_FOUND',
    };
  }

  if (err.name === 'AccessDenied') {
    return {
      statusCode: 403,
      message: 'Доступ к файлу запрещен',
      code: 'S3_ACCESS_DENIED',
    };
  }

  return {
    statusCode,
    message: `Ошибка S3: ${err.message}`,
    code: 'S3_ERROR',
  };
};

const handleMongoConnectionError = (): {
  statusCode: number;
  message: string;
  code: string;
} => {
  return {
    statusCode: 503,
    message: 'Ошибка подключения к базе данных',
    code: 'DATABASE_CONNECTION_ERROR',
  };
};

export const errorHandler = (
  err: Error | HttpError,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  let statusCode = 500;
  let message = 'Внутренняя ошибка сервера';
  let code = 'INTERNAL_SERVER_ERROR';
  let details: unknown = undefined;

  if (err instanceof HttpError) {
    statusCode = err.statusCode;
    message = err.message;
    code = err.code || code;
  } else if (err instanceof mongoose.Error.ValidationError) {
    const result = handleMongooseValidationError(err);
    statusCode = result.statusCode;
    message = result.message;
    code = result.code;
    details = result.details;
  } else if (err instanceof mongoose.Error.CastError) {
    const result = handleMongooseCastError(err);
    statusCode = result.statusCode;
    message = result.message;
    code = result.code;
  } else if ('code' in err && (err as { code: number }).code === 11000) {
    const mongoErr = err as unknown as {
      code: number;
      keyValue?: Record<string, unknown>;
    };
    const result = handleMongooseDuplicateKeyError({
      code: mongoErr.code,
      keyValue: mongoErr.keyValue || {},
    });
    statusCode = result.statusCode;
    message = result.message;
    code = result.code;
    details = result.details;
  } else if (err.name === 'JsonWebTokenError') {
    const result = handleJWTError();
    statusCode = result.statusCode;
    message = result.message;
    code = result.code;
  } else if (err.name === 'TokenExpiredError') {
    const result = handleJWTExpiredError();
    statusCode = result.statusCode;
    message = result.message;
    code = result.code;
  } else if (err instanceof multer.MulterError) {
    const result = handleMulterError(err);
    statusCode = result.statusCode;
    message = result.message;
    code = result.code;
  } else if (
    err.name &&
    ['MongoNetworkError', 'MongoServerError'].includes(err.name)
  ) {
    const result = handleMongoConnectionError();
    statusCode = result.statusCode;
    message = result.message;
    code = result.code;
  } else if (
    '$metadata' in err ||
    ['NoSuchKey', 'AccessDenied'].includes(err.name)
  ) {
    const result = handleS3Error(
      err as {
        name: string;
        message: string;
        $metadata?: { httpStatusCode?: number };
      }
    );
    statusCode = result.statusCode;
    message = result.message;
    code = result.code;
  }

  const errorResponse: ErrorResponse = {
    error: {
      message,
      code,
      statusCode,
      requestId: req.requestId,
    },
  };

  if (details) {
    errorResponse.error.details = details;
  }

  if (process.env.NODE_ENV === 'development') {
    errorResponse.error.stack = err.stack;
  }

  const logData: {
    requestId?: string;
    method: string;
    url: string;
    statusCode: number;
    code: string;
    message: string;
    stack?: string;
    details?: unknown;
  } = {
    requestId: req.requestId,
    method: req.method,
    url: req.originalUrl,
    statusCode,
    code,
    message: err.message,
    stack: err.stack,
  };

  if (details) {
    logData.details = details;
  }

  logger.error('Error occurred', logData);

  res.status(statusCode).json(errorResponse);
};

export const notFoundHandler = (req: Request, res: Response): void => {
  const errorResponse: ErrorResponse = {
    error: {
      message: `Маршрут ${req.originalUrl} не найден`,
      code: 'NOT_FOUND',
      statusCode: 404,
      requestId: req.requestId,
    },
  };

  logger.warn('Route not found', {
    requestId: req.requestId,
    method: req.method,
    url: req.originalUrl,
  });

  res.status(404).json(errorResponse);
};
