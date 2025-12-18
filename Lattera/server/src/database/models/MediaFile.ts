import mongoose, { Document, Schema } from 'mongoose';

export interface IMediaFile extends Document {
  _id: mongoose.Types.ObjectId;
  url: string;
  key: string;
  type: 'image' | 'audio' | 'video';
  mimeType: string;
  size: number;
  uploadedAt: Date;
  uploadedBy: mongoose.Types.ObjectId;
  originalName?: string;
  createdAt: Date;
  updatedAt: Date;
}

const mediaFileSchema = new Schema<IMediaFile>(
  {
    url: {
      type: String,
      required: true,
      unique: true,
    },
    key: {
      type: String,
      required: true,
      unique: true,
    },
    type: {
      type: String,
      enum: ['image', 'audio', 'video'],
      required: true,
    },
    mimeType: {
      type: String,
      required: true,
    },
    size: {
      type: Number,
      required: true,
      min: 1,
    },
    uploadedAt: {
      type: Date,
      default: Date.now,
    },
    uploadedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    originalName: {
      type: String,
      required: false,
    },
  },
  {
    timestamps: true,
  }
);

// Индексы для быстрого поиска и получения статистики
mediaFileSchema.index({ uploadedBy: 1, uploadedAt: -1 });
mediaFileSchema.index({ type: 1, uploadedAt: -1 });
mediaFileSchema.index({ url: 1 }, { unique: true });
mediaFileSchema.index({ key: 1 }, { unique: true });

// Валидация размера файла в зависимости от типа
mediaFileSchema.pre('validate', function (
  this: IMediaFile,
  next: (err?: Error) => void
) {
  const maxSizes: Record<IMediaFile['type'], number> = {
    image: parseInt(process.env.MAX_IMAGE_SIZE || '10485760'), // 10MB
    audio: parseInt(process.env.MAX_AUDIO_SIZE || '2097152'), // 2MB
    video: parseInt(process.env.MAX_VIDEO_SIZE || '104857600'), // 100MB
  };

  const maxSize = maxSizes[this.type];
  if (this.size > maxSize) {
    next(new Error(`File size exceeds ${maxSize} bytes for ${this.type} files`));
    return;
  }

  next();
});

export const MediaFile = mongoose.model<IMediaFile>('MediaFile', mediaFileSchema);
