import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { MediaFile } from '../models/MediaFile';
import { Types } from 'mongoose';
import HttpError from '../../utils/HttpError';

// Типы для MIME-типов файлов
export const ALLOWED_MIME_TYPES = {
  image: ['image/jpeg', 'image/png', 'image/webp'] as const,
  audio: ['audio/mpeg', 'audio/wav', 'audio/ogg'] as const,
  video: ['video/mp4', 'video/webm'] as const
} as const;

export type FileType = keyof typeof ALLOWED_MIME_TYPES;
export type AllowedMimeType = typeof ALLOWED_MIME_TYPES[FileType][number];

// Конфигурация размеров файлов
export const FILE_SIZE_LIMITS = {
  image: parseInt(process.env.MAX_IMAGE_SIZE || '10485760'),    // 10MB
  audio: parseInt(process.env.MAX_AUDIO_SIZE || '2097152'),     // 2MB
  video: parseInt(process.env.MAX_VIDEO_SIZE || '104857600')    // 100MB
} as const;

// Интерфейс для результата загрузки файла
export interface UploadResult {
  url: string;
  key: string;
  size: number;
  type: FileType;
  mimeType: string;
  uploadedAt: Date;
}

class S3Service {
  private s3Client: S3Client;
  private bucket: string;
  private isMinIO: boolean;

  constructor() {
    this.bucket = process.env.S3_BUCKET || 'lettera-media';
    this.isMinIO = process.env.NODE_ENV === 'development' && !!process.env.MINIO_ENDPOINT;

    // Настройка клиента S3
    const config: any = {
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY || '',
        secretAccessKey: process.env.AWS_SECRET_KEY || ''
      }
    };

    // Для MinIO используем кастомный endpoint
    if (this.isMinIO) {
      config.endpoint = `http${process.env.MINIO_USE_SSL === 'true' ? 's' : ''}://${process.env.MINIO_ENDPOINT}:${process.env.MINIO_PORT}`;
      config.forcePathStyle = true;
    }

    this.s3Client = new S3Client(config);
  }

  /**
   * Валидирует MIME-тип файла
   */
  private validateMimeType(mimeType: string): FileType | null {
    for (const [type, allowedTypes] of Object.entries(ALLOWED_MIME_TYPES)) {
      for (const allowedType of allowedTypes as readonly string[]) {
        if (allowedType === mimeType) {
          return type as FileType;
        }
      }
    }
    return null;
  }

  /**
   * Валидирует размер файла
   */
  private validateFileSize(size: number, type: FileType): boolean {
    return size <= FILE_SIZE_LIMITS[type];
  }

  /**
   * Генерирует уникальное имя файла
   */
  private generateFileName(userId: string, mimeType: string, originalName?: string): string {
    const timestamp = Date.now();
    const randomHash = Math.random().toString(36).substring(2, 15);
    const extension = mimeType.split('/')[1];
    const sanitizedOriginalName = originalName ? originalName.replace(/[^a-zA-Z0-9.-]/g, '_') : '';
    
    const folder = userId;
    const baseName = `${timestamp}-${randomHash}`;
    return `${folder}/${baseName}${sanitizedOriginalName ? '_' + sanitizedOriginalName : ''}.${extension}`;
  }

  /**
   * Загружает файл в S3 и сохраняет метаданные в MongoDB
   */
  async uploadFile(
    buffer: Buffer,
    mimeType: string,
    userId: string,
    originalName?: string
  ): Promise<UploadResult> {
    const fileType = this.validateMimeType(mimeType);
    if (!fileType) {
      throw new HttpError(
        400,
        `Неподдерживаемый MIME-тип: ${mimeType}`,
        'UNSUPPORTED_MIME_TYPE'
      );
    }

    if (!this.validateFileSize(buffer.length, fileType)) {
      throw new HttpError(
        413,
        `Размер файла превышает лимит для ${fileType} файлов`,
        'FILE_SIZE_LIMIT_EXCEEDED'
      );
    }

    try {
      const key = this.generateFileName(userId, mimeType, originalName);

      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: mimeType,
        CacheControl: 'max-age=31536000',
        ContentDisposition: 'inline',
      });

      await this.s3Client.send(command);

      const baseUrl = this.isMinIO
        ? `http${process.env.MINIO_USE_SSL === 'true' ? 's' : ''}://${process.env.MINIO_ENDPOINT}:${process.env.MINIO_PORT}/${this.bucket}`
        : `https://${this.bucket}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com`;

      const url = `${baseUrl}/${key}`;

      const mediaFile = new MediaFile({
        url,
        key,
        type: fileType,
        mimeType,
        size: buffer.length,
        uploadedBy: new Types.ObjectId(userId),
        originalName: originalName,
        uploadedAt: new Date(),
      });

      await mediaFile.save();

      return {
        url,
        key,
        size: buffer.length,
        type: fileType,
        mimeType,
        uploadedAt: new Date(),
      };
    } catch (error) {
      if (error instanceof HttpError) {
        throw error;
      }
      throw new HttpError(
        500,
        `Ошибка загрузки файла: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`,
        'FILE_UPLOAD_ERROR'
      );
    }
  }

  /**
   * Удаляет файл из S3 и из MongoDB
   */
  async deleteFile(url: string, userId?: string): Promise<void> {
    const baseUrl = this.isMinIO
      ? `http${process.env.MINIO_USE_SSL === 'true' ? 's' : ''}://${process.env.MINIO_ENDPOINT}:${process.env.MINIO_PORT}/${this.bucket}`
      : `https://${this.bucket}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com`;

    if (!url.startsWith(baseUrl)) {
      throw new HttpError(400, 'Некорректный URL файла', 'INVALID_FILE_URL');
    }

    try {
      const key = url.replace(baseUrl + '/', '');

      const deleteCommand = new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      await this.s3Client.send(deleteCommand);

      const deleteQuery: { key: string; uploadedBy?: Types.ObjectId } = { key };
      if (userId) {
        deleteQuery.uploadedBy = new Types.ObjectId(userId);
      }

      await MediaFile.deleteOne(deleteQuery);
    } catch (error) {
      if (error instanceof HttpError) {
        throw error;
      }
      throw new HttpError(
        500,
        `Ошибка удаления файла: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`,
        'FILE_DELETE_ERROR'
      );
    }
  }

  /**
   * Генерирует временный URL для скачивания файла
   */
  async generatePresignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      const signedUrl = await getSignedUrl(this.s3Client, command, { expiresIn });
      return signedUrl;
    } catch (error) {
      throw new HttpError(
        500,
        `Ошибка генерации временного URL: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`,
        'PRESIGNED_URL_ERROR'
      );
    }
  }

  /**
   * Проверяет, существует ли файл
   */
  async fileExists(key: string): Promise<boolean> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key
      });

      await this.s3Client.send(command);
      return true;

    } catch {
      return false;
    }
  }

  /**
   * Получает статистику загруженных файлов пользователя
   */
  async getUserFileStats(userId: string): Promise<{
    totalFiles: number;
    totalSize: number;
    filesByType: Record<FileType, number>;
  }> {
    try {
      const userObjectId = new Types.ObjectId(userId);

      const stats = await MediaFile.aggregate([
        { $match: { uploadedBy: userObjectId } },
        {
          $group: {
            _id: '$type',
            count: { $sum: 1 },
            totalSize: { $sum: '$size' },
          },
        },
      ]);

      const result = {
        totalFiles: 0,
        totalSize: 0,
        filesByType: {
          image: 0,
          audio: 0,
          video: 0,
        } as Record<FileType, number>,
      };

      stats.forEach((stat) => {
        const type = stat._id as FileType;
        result.filesByType[type] = stat.count;
        result.totalFiles += stat.count;
        result.totalSize += stat.totalSize;
      });

      return result;
    } catch (error) {
      throw new HttpError(
        500,
        `Ошибка получения статистики: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`,
        'STATS_ERROR'
      );
    }
  }
}

// Экспортируем singleton instance
export const s3Service = new S3Service();