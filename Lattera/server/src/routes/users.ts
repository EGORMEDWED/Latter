import { Router, Request, Response } from 'express';
import { FilterQuery, Types } from 'mongoose';
import { AuthService } from '../database/services/AuthService';
import { SearchHistory } from '../database/models/SearchHistory';
import { User, IUser } from '../database/models/User';
import {
  invalidateAllRefreshTokens,
  setRefreshToken,
} from '../database/redis/redisUtils';
import { authMiddleware } from '../middleware/auth';
import {
  asyncHandler,
  BadRequestError,
  NotFoundError,
  UnauthorizedError,
} from '../utils';
import logger from '../utils/logger';

const router = Router();

const VALID_PROFILE_CATEGORIES = [
  'IT',
  'Marketing',
  'Design',
  'Finance',
  'Other',
] as const;

type ProfileCategory = (typeof VALID_PROFILE_CATEGORIES)[number];

interface PasswordChangeRequest {
  oldPassword: string;
  newPassword: string;
}

interface ProfileUpdateRequest {
  firstName?: string;
  lastName?: string;
  profile?: {
    position?: string;
    company?: string;
    category?: ProfileCategory;
    skills?: string[];
  };
}

const escapeRegex = (value: string): string => {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

const parseOptionalSingleString = (
  value: unknown,
  name: string,
  maxLength: number
): string | undefined => {
  if (value === undefined) return undefined;
  if (typeof value !== 'string') {
    throw BadRequestError(`${name} must be a string`);
  }

  const trimmed = value.trim();
  if (trimmed.length === 0) return undefined;

  if (trimmed.length > maxLength) {
    throw BadRequestError(`${name} must be less than ${maxLength} characters`);
  }

  return trimmed;
};

const parseIntParam = (
  value: unknown,
  name: string,
  defaultValue: number
): number => {
  if (value === undefined) return defaultValue;
  if (typeof value !== 'string') {
    throw BadRequestError(`${name} must be a number`);
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed)) {
    throw BadRequestError(`${name} must be a valid integer`);
  }

  return parsed;
};

/**
 * @swagger
 * /api/users/search:
 *   get:
 *     summary: Поиск пользователей
 *     description: Поиск пользователей по категории, компании, навыкам и текстовому запросу. Поддерживает пагинацию и текстовый поиск.
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *           enum: [IT, Marketing, Design, Finance, Other]
 *         description: Фильтр по категории профиля
 *         example: "IT"
 *       - in: query
 *         name: company
 *         schema:
 *           type: string
 *         description: Фильтр по компании (частичное совпадение, без учета регистра)
 *         example: "TechCorp"
 *       - in: query
 *         name: skills
 *         schema:
 *           type: string
 *         description: Фильтр по навыкам (через запятую, максимум 10 навыков)
 *         example: "JavaScript,React"
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Текстовый поиск по имени, фамилии, должности и компании
 *         example: "developer"
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Максимальное количество результатов (1-100)
 *         example: 20
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           minimum: 0
 *           default: 0
 *         description: Смещение для пагинации
 *         example: 0
 *     responses:
 *       200:
 *         description: Список найденных пользователей
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SearchUsersResponse'
 *             example:
 *               message: "Users found"
 *               total: 42
 *               count: 20
 *               limit: 20
 *               offset: 0
 *               users:
 *                 - id: "507f1f77bcf86cd799439011"
 *                   firstName: "Иван"
 *                   lastName: "Петров"
 *                   profile:
 *                     position: "Senior Developer"
 *                     company: "TechCorp"
 *                     category: "IT"
 *                     skills: ["JavaScript", "React", "Node.js"]
 *                 - id: "507f1f77bcf86cd799439012"
 *                   firstName: "Анна"
 *                   lastName: "Смирнова"
 *                   profile:
 *                     position: "UI/UX Designer"
 *                     company: "DesignStudio"
 *                     category: "Design"
 *                     skills: ["Figma", "Photoshop", "Sketch"]
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
// PATCH /api/users/me/password - Change password
router.patch(
  '/me/password',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const { oldPassword, newPassword } = req.body as PasswordChangeRequest;

    if (!oldPassword || !newPassword) {
      throw BadRequestError('Old password and new password are required');
    }

    // Validate new password using AuthService
    const passwordValidation = AuthService.validatePassword(newPassword);
    if (!passwordValidation.valid) {
      throw BadRequestError(passwordValidation.errors.join(', '));
    }

    // Get user from database
    const user = await User.findById(req.user?.userId);
    if (!user) {
      throw NotFoundError('User not found');
    }

    // Verify old password
    const passwordMatches = await AuthService.comparePassword(
      oldPassword,
      user.passwordHash
    );
    if (!passwordMatches) {
      throw UnauthorizedError('Current password is incorrect');
    }

    // Hash new password
    const newPasswordHash = await AuthService.hashPassword(newPassword);

    // Update user password
    await User.findByIdAndUpdate(req.user?.userId, {
      passwordHash: newPasswordHash,
      updatedAt: new Date(),
    });

    // Invalidate ALL refresh tokens for this user EXCEPT current session
    await invalidateAllRefreshTokens(req.user!.userId);

    // Generate new tokens for current session
    const accessToken = AuthService.generateAccessToken(req.user!.userId);
    const refreshToken = AuthService.generateRefreshToken(req.user!.userId);

    // Store new refresh token
    await setRefreshToken(req.user!.userId, refreshToken);

    // Log security event
    logger.info('Password changed successfully', {
      email: user.email,
      userId: req.user!.userId,
      timestamp: new Date().toISOString(),
    });

    res.status(200).json({
      message: 'Password changed successfully',
      accessToken,
      refreshToken,
      info: 'Other sessions have been logged out',
    });
  })
);

/**
 * @swagger
 * /api/users/me:
 *   get:
 *     summary: Получить профиль текущего пользователя
 *     description: Возвращает информацию о текущем аутентифицированном пользователе.
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Профиль пользователя
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *             example:
 *               id: "507f1f77bcf86cd799439011"
 *               email: "user@example.com"
 *               firstName: "Иван"
 *               lastName: "Петров"
 *               avatarUrl: "https://s3.amazonaws.com/lettera/avatars/user123.jpg"
 *               profile:
 *                 position: "Senior Developer"
 *                 company: "TechCorp"
 *                 category: "IT"
 *                 skills: ["JavaScript", "React", "Node.js"]
 *               createdAt: "2024-01-15T10:30:00.000Z"
 *               updatedAt: "2024-01-15T10:30:00.000Z"
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
// PATCH /api/users/me - Update user profile
router.patch(
  '/me',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const { firstName, lastName, profile } = req.body as ProfileUpdateRequest;

    // Build update object with only provided fields
    const updateData: {
      firstName?: string;
      lastName?: string;
      profile?: {
        position?: string;
        company?: string;
        category?: ProfileCategory;
        skills?: string[];
      };
      updatedAt?: Date;
    } = {};

    if (firstName !== undefined) {
      if (typeof firstName !== 'string' || firstName.trim().length === 0) {
        throw BadRequestError('First name must be a non-empty string');
      }
      if (firstName.length > 50) {
        throw BadRequestError('First name must be less than 50 characters');
      }
      updateData.firstName = firstName.trim();
    }

    if (lastName !== undefined) {
      if (typeof lastName !== 'string' || lastName.trim().length === 0) {
        throw BadRequestError('Last name must be a non-empty string');
      }
      if (lastName.length > 50) {
        throw BadRequestError('Last name must be less than 50 characters');
      }
      updateData.lastName = lastName.trim();
    }

    if (profile !== undefined) {
      updateData.profile = {};

      if (profile.position !== undefined) {
        if (typeof profile.position !== 'string') {
          throw BadRequestError('Position must be a string');
        }
        if (profile.position.length > 100) {
          throw BadRequestError('Position must be less than 100 characters');
        }
        updateData.profile.position = profile.position.trim();
      }

      if (profile.company !== undefined) {
        if (typeof profile.company !== 'string') {
          throw BadRequestError('Company must be a string');
        }
        if (profile.company.length > 100) {
          throw BadRequestError('Company must be less than 100 characters');
        }
        updateData.profile.company = profile.company.trim();
      }

      if (profile.category !== undefined) {
        if (!VALID_PROFILE_CATEGORIES.includes(profile.category)) {
          throw BadRequestError(
            `Category must be one of: ${VALID_PROFILE_CATEGORIES.join(', ')}`
          );
        }
        updateData.profile.category = profile.category;
      }

      if (profile.skills !== undefined) {
        if (!Array.isArray(profile.skills)) {
          throw BadRequestError('Skills must be an array');
        }
        if (profile.skills.length > 10) {
          throw BadRequestError('Maximum 10 skills allowed');
        }

        // Validate each skill
        profile.skills.forEach((skill, index) => {
          if (typeof skill !== 'string') {
            throw BadRequestError(`Skill at index ${index} must be a string`);
          }
          if (skill.trim().length === 0) {
            throw BadRequestError(`Skill at index ${index} cannot be empty`);
          }
          if (skill.length > 50) {
            throw BadRequestError(
              `Skill at index ${index} must be less than 50 characters`
            );
          }
        });

        updateData.profile.skills = profile.skills.map(skill => skill.trim());
      }
    }

    // Update user
    const updatedUser = await User.findByIdAndUpdate(
      req.user?.userId,
      { ...updateData, updatedAt: new Date() },
      { new: true }
    ).select('-passwordHash');

    if (!updatedUser) {
      throw NotFoundError('User not found');
    }

    res.status(200).json({
      message: 'Profile updated successfully',
      user: {
        id: updatedUser._id,
        email: updatedUser.email,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        avatarUrl: updatedUser.avatarUrl,
        profile: {
          position: updatedUser.profile?.position || '',
          company: updatedUser.profile?.company || '',
          category: updatedUser.profile?.category || 'Other',
          skills: updatedUser.profile?.skills || [],
        },
        createdAt: updatedUser.createdAt,
        updatedAt: updatedUser.updatedAt,
      },
    });
  })
);

export default router;
