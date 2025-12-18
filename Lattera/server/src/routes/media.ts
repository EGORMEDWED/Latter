import express, { Request, Response } from 'express';
import multer from 'multer';
import { s3Service, ALLOWED_MIME_TYPES } from '../database/services/S3Service';
import { MediaFile } from '../database/models/MediaFile';
import { Types } from 'mongoose';
import { asyncHandler } from '../utils';
import HttpError from '../utils/HttpError';

const router = express.Router();

// Настройка multer для обработки файлов в памяти
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB максимальный размер (будет перепроверен в сервисе)
  },
  fileFilter: (_req, file, cb) => {
    // Проверка MIME-типа
    const allAllowedTypes = Object.values(
      ALLOWED_MIME_TYPES
    ).flat() as string[];
    if (allAllowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Неподдерживаемый тип файла: ${file.mimetype}`));
    }
  },
});

/**
 * @route POST /api/media/upload
 * @desc Загрузка медиафайла
 * @access Private
 */
router.post(
  '/upload',
  upload.single('file'),
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.file) {
      throw new HttpError(400, 'Файл не был загружен', 'FILE_MISSING');
    }

    const userId = req.body.userId;
    if (!userId || !Types.ObjectId.isValid(userId)) {
      throw new HttpError(
        400,
        'Некорректный ID пользователя',
        'INVALID_USER_ID'
      );
    }

    const result = await s3Service.uploadFile(
      req.file.buffer,
      req.file.mimetype,
      userId,
      req.file.originalname
    );

    res.json({
      success: true,
      data: {
        url: result.url,
        key: result.key,
        type: result.type,
        size: result.size,
        mimeType: result.mimeType,
        uploadedAt: result.uploadedAt,
      },
    });
  })
);

/**
 * @route DELETE /api/media/:url
 * @desc Удаление медиафайла
 * @access Private
 */
router.delete(
  '/:url(*)',
  asyncHandler(async (req: Request, res: Response) => {
    const fileUrl = decodeURIComponent(req.params.url);
    const userId = req.body.userId;

    if (userId && Types.ObjectId.isValid(userId)) {
      const mediaFile = await MediaFile.findOne({
        url: fileUrl,
        uploadedBy: new Types.ObjectId(userId),
      });

      if (!mediaFile) {
        throw new HttpError(
          404,
          'Файл не найден или у вас нет прав для его удаления',
          'FILE_NOT_FOUND_OR_FORBIDDEN'
        );
      }
    }

    await s3Service.deleteFile(fileUrl, userId);

    res.json({
      success: true,
      message: 'Файл успешно удален',
    });
  })
);

/**
 * @route GET /api/media/presigned/:key
 * @desc Получение временного URL для скачивания файла
 * @access Private
 */
router.get(
  '/presigned/:key(*)',
  asyncHandler(async (req: Request, res: Response) => {
    const key = req.params.key;
    const expiresIn = parseInt(req.query.expiresIn as string) || 3600;

    const exists = await s3Service.fileExists(key);
    if (!exists) {
      throw new HttpError(404, 'Файл не найден', 'FILE_NOT_FOUND');
    }

    const presignedUrl = await s3Service.generatePresignedUrl(key, expiresIn);

    res.json({
      success: true,
      data: {
        url: presignedUrl,
        expiresIn,
      },
    });
  })
);

/**
 * @route GET /api/media/user/:userId/stats
 * @desc Получение статистики файлов пользователя
 * @access Private
 */
router.get(
  '/user/:userId/stats',
  asyncHandler(async (req: Request, res: Response) => {
    const { userId } = req.params;

    if (!Types.ObjectId.isValid(userId)) {
      throw new HttpError(
        400,
        'Некорректный ID пользователя',
        'INVALID_USER_ID'
      );
    }

    const stats = await s3Service.getUserFileStats(userId);

    res.json({
      success: true,
      data: stats,
    });
  })
);

/**
 * @route GET /api/media/user/:userId/files
 * @desc Получение списка файлов пользователя с пагинацией
 * @access Private
 */
router.get(
  '/user/:userId/files',
  asyncHandler(async (req: Request, res: Response) => {
    const { userId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const type = req.query.type as 'image' | 'audio' | 'video' | undefined;

    if (!Types.ObjectId.isValid(userId)) {
      throw new HttpError(
        400,
        'Некорректный ID пользователя',
        'INVALID_USER_ID'
      );
    }

    const query: { uploadedBy: Types.ObjectId; type?: string } = {
      uploadedBy: new Types.ObjectId(userId),
    };
    if (type) {
      query.type = type;
    }

    const files = await MediaFile.find(query)
      .sort({ uploadedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .select('-__v');

    const total = await MediaFile.countDocuments(query);

    res.json({
      success: true,
      data: {
        files,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  })
);

export default router;
