import mongoose, { Document, Schema } from 'mongoose';

export interface IUserProfile {
  position?: string;
  company?: string;
  category?: 'IT' | 'Marketing' | 'Design' | 'Finance' | 'Other';
  skills?: string[];
}

export interface IUser extends Document {
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string;
  profile?: IUserProfile;
  status: 'online' | 'offline' | 'away';
  lastSeen: Date;
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const UserProfileSchema = new Schema<IUserProfile>(
  {
    position: {
      type: String,
      trim: true,
      maxlength: 100,
    },
    company: {
      type: String,
      trim: true,
      maxlength: 100,
    },
    category: {
      type: String,
      enum: ['IT', 'Marketing', 'Design', 'Finance', 'Other'],
      default: 'Other',
    },
    skills: [
      {
        type: String,
        trim: true,
        maxlength: 50,
      },
    ],
  },
  { _id: false }
);

const UserSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      trim: true,
      lowercase: true,
      match: [
        /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
        'Please provide a valid email address',
      ],
      maxlength: 255,
    },
    passwordHash: {
      type: String,
      required: [true, 'Password hash is required'],
      minlength: [60, 'Password hash must be at least 60 characters long'], // bcrypt hash length
    },
    firstName: {
      type: String,
      required: false,
      trim: true,
      maxlength: 50,
      default: '',
    },
    lastName: {
      type: String,
      required: false,
      trim: true,
      maxlength: 50,
      default: '',
    },
    avatarUrl: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    profile: {
      type: UserProfileSchema,
      default: {},
    },
    status: {
      type: String,
      enum: ['online', 'offline', 'away'],
      default: 'offline',
    },
    lastSeen: {
      type: Date,
      default: Date.now,
    },
    emailVerified: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' },
    collection: 'users',
  }
);

// Индексы для оптимизации запросов
UserSchema.index({ email: 1 }, { unique: true });

// Text index для поиска по компании и навыкам
UserSchema.index(
  {
    'profile.company': 'text',
    'profile.skills': 'text',
    firstName: 'text',
    lastName: 'text',
  },
  {
    name: 'user_text_search',
    weights: {
      'profile.company': 3,
      'profile.skills': 2,
      firstName: 1,
      lastName: 1,
    },
    default_language: 'russian',
  }
);

// Single indexes для фильтрации
UserSchema.index({ 'profile.category': 1 });
UserSchema.index({ status: 1 });
UserSchema.index({ lastSeen: -1 });

// Virtual для полного имени
UserSchema.virtual('fullName').get(function () {
  return `${this.firstName} ${this.lastName}`;
});

// Method для проверки подтверждения email
UserSchema.methods.isEmailVerified = function (): boolean {
  return this.emailVerified;
};

// Method для обновления статуса
UserSchema.methods.updateStatus = function (
  status: 'online' | 'offline' | 'away'
) {
  this.status = status;
  this.lastSeen = new Date();
  return this.save();
};

// Ensure virtual fields are serialized
UserSchema.set('toJSON', { virtuals: true });
UserSchema.set('toObject', { virtuals: true });

export const User = mongoose.model<IUser>('User', UserSchema);

export default User;
