import { Router, Request, Response } from 'express';
import { Types } from 'mongoose';
import { Chat } from '../database/models/Chat';
import { User } from '../database/models/User';
import { authMiddleware } from '../middleware/auth';
import {
  asyncHandler,
  BadRequestError,
  ForbiddenError,
  NotFoundError,
} from '../utils';
import logger from '../utils/logger';

const router = Router();

interface CreateChatRequest {
  participantIds: string[];
}

interface PopulatedParticipant {
  _id: Types.ObjectId;
  firstName: string;
  lastName: string;
  avatarUrl?: string;
  profile?: {
    position?: string;
    company?: string;
    category?: string;
  };
}

// Helper function to safely get unread count from Map or object
const getUnreadCount = (
  unreadCount: Map<string, number> | Record<string, number>,
  userId: string
): number => {
  if (typeof (unreadCount as Map<string, number>).get === 'function') {
    return (unreadCount as Map<string, number>).get(userId) || 0;
  }
  return (unreadCount as Record<string, number>)[userId] || 0;
};

/**
 * @swagger
 * /api/chats:
 *   post:
 *     summary: Создать новый чат
 *     description: Создает приватный чат между текущим пользователем и указанным пользователем. Если чат уже существует, возвращает существующий чат.
 *     tags: [Chats]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateChatRequest'
 *           example:
 *             participantIds: ["507f1f77bcf86cd799439012"]
 *     responses:
 *       201:
 *         description: Чат успешно создан
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Chat created successfully"
 *                 chat:
 *                   $ref: '#/components/schemas/Chat'
 *             example:
 *               message: "Chat created successfully"
 *               chat:
 *                 id: "507f1f77bcf86cd799439013"
 *                 type: "private"
 *                 participants:
 *                   - id: "507f1f77bcf86cd799439011"
 *                     firstName: "Иван"
 *                     lastName: "Петров"
 *                     profile:
 *                       position: "Senior Developer"
 *                       company: "TechCorp"
 *                     unreadCount: 0
 *                   - id: "507f1f77bcf86cd799439012"
 *                     firstName: "Анна"
 *                     lastName: "Смирнова"
 *                     profile:
 *                       position: "UI/UX Designer"
 *                       company: "DesignStudio"
 *                     unreadCount: 0
 *                 lastMessage: null
 *                 unreadCount:
 *                   "507f1f77bcf86cd799439011": 0
 *                   "507f1f77bcf86cd799439012": 0
 *       200:
 *         description: Чат уже существует
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Chat already exists"
 *                 chat:
 *                   $ref: '#/components/schemas/Chat'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get(
  '/',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const currentUserId = req.user!.userId;
    const currentUserObjectId = new Types.ObjectId(currentUserId);

    // Parse pagination parameters
    const limitRaw = req.query.limit;
    const offsetRaw = req.query.offset;

    let limit = 50;
    let offset = 0;

    if (limitRaw !== undefined) {
      const parsedLimit = Number(limitRaw);
      if (
        !Number.isInteger(parsedLimit) ||
        parsedLimit < 1 ||
        parsedLimit > 100
      ) {
        throw BadRequestError('limit must be an integer between 1 and 100');
      }
      limit = parsedLimit;
    }

    if (offsetRaw !== undefined) {
      const parsedOffset = Number(offsetRaw);
      if (!Number.isInteger(parsedOffset) || parsedOffset < 0) {
        throw BadRequestError('offset must be a non-negative integer');
      }
      offset = parsedOffset;
    }

    // Get total count
    const total = await Chat.countDocuments({
      participants: currentUserObjectId,
    });

    // Find chats where user is a participant
    const chats = await Chat.find({
      participants: currentUserObjectId,
    })
      .populate<{ participants: PopulatedParticipant[] }>({
        path: 'participants',
        select:
          'firstName lastName avatarUrl profile.position profile.company profile.category',
      })
      .sort({ 'lastMessage.timestamp': -1, updatedAt: -1 })
      .skip(offset)
      .limit(limit)
      .lean();

    logger.info('Chats retrieved', {
      userId: currentUserId,
      total,
      count: chats.length,
      limit,
      offset,
    });

    res.status(200).json({
      message: 'Chats retrieved',
      total,
      count: chats.length,
      limit,
      offset,
      chats: chats.map(chat => {
        // Convert unreadCount Map to plain object
        const unreadCountObj: { [key: string]: number } = {};
        const unreadCountData = chat.unreadCount as
          | Map<string, number>
          | Record<string, number>;

        if (typeof unreadCountData === 'object' && unreadCountData !== null) {
          // Handle case where it's already an object (from .lean())
          if (
            typeof (unreadCountData as Map<string, number>).forEach ===
            'function'
          ) {
            (unreadCountData as Map<string, number>).forEach((value, key) => {
              unreadCountObj[key] = value;
            });
          } else {
            Object.assign(unreadCountObj, unreadCountData);
          }
        }

        return {
          id: chat._id,
          participants: (chat.participants as PopulatedParticipant[]).map(
            p => ({
              id: p._id,
              firstName: p.firstName,
              lastName: p.lastName,
              avatarUrl: p.avatarUrl,
              profile: {
                position: p.profile?.position || '',
                company: p.profile?.company || '',
                category: p.profile?.category || 'Other',
              },
            })
          ),
          type: chat.type,
          lastMessage: chat.lastMessage
            ? {
                content: chat.lastMessage.content,
                senderId: chat.lastMessage.senderId,
                timestamp: chat.lastMessage.timestamp,
              }
            : null,
          unreadCount: unreadCountObj,
          createdAt: chat.createdAt,
          updatedAt: chat.updatedAt,
        };
      }),
    });
  })
);

/**
 * @swagger
 * /api/chats/{chatId}:
 *   get:
 *     summary: Получить детали чата
 *     description: Возвращает подробную информацию о чате. Доступно только участникам чата.
 *     tags: [Chats]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: chatId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID чата
 *         example: "507f1f77bcf86cd799439013"
 *     responses:
 *       200:
 *         description: Детали чата
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Chat retrieved"
 *                 chat:
 *                   $ref: '#/components/schemas/Chat'
 *             example:
 *               message: "Chat retrieved"
 *               chat:
 *                 id: "507f1f77bcf86cd799439013"
 *                 type: "private"
 *                 participants:
 *                   - id: "507f1f77bcf86cd799439011"
 *                     firstName: "Иван"
 *                     lastName: "Петров"
 *                     avatarUrl: "https://s3.amazonaws.com/lettera/avatars/ivan123.jpg"
 *                     profile:
 *                       position: "Senior Developer"
 *                       company: "TechCorp"
 *                       category: "IT"
 *                     unreadCount: 0
 *                   - id: "507f1f77bcf86cd799439012"
 *                     firstName: "Анна"
 *                     lastName: "Смирнова"
 *                     avatarUrl: "https://s3.amazonaws.com/lettera/avatars/anna123.jpg"
 *                     profile:
 *                       position: "UI/UX Designer"
 *                       company: "DesignStudio"
 *                       category: "Design"
 *                     unreadCount: 2
 *                 lastMessage:
 *                   content: "Привет! Как дела?"
 *                   senderId: "507f1f77bcf86cd799439012"
 *                   timestamp: "2024-01-15T10:30:00.000Z"
 *                 unreadCount:
 *                   "507f1f77bcf86cd799439011": 2
 *                   "507f1f77bcf86cd799439012": 0
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
// GET /api/chats/:chatId - Get specific chat details
router.get(
  '/:chatId',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const { chatId } = req.params;
    const currentUserId = req.user!.userId;
    const currentUserObjectId = new Types.ObjectId(currentUserId);

    // Validate chatId format
    if (!Types.ObjectId.isValid(chatId)) {
      throw BadRequestError('Invalid chat ID format');
    }

    // Find chat and populate participants
    const chat = await Chat.findById(chatId).populate<{
      participants: PopulatedParticipant[];
    }>({
      path: 'participants',
      select:
        'firstName lastName avatarUrl profile.position profile.company profile.category',
    });

    if (!chat) {
      throw NotFoundError('Chat not found');
    }

    // Verify user is a participant
    const isParticipant = chat.participants.some(p =>
      p._id.equals(currentUserObjectId)
    );

    if (!isParticipant) {
      throw ForbiddenError('You do not have access to this chat');
    }

    logger.info('Chat retrieved', {
      userId: currentUserId,
      chatId: chat._id,
    });

    // Convert unreadCount Map to plain object
    const unreadCountObj: { [key: string]: number } = {};
    chat.participants.forEach(participant => {
      const participantIdStr = participant._id.toString();
      unreadCountObj[participantIdStr] = getUnreadCount(
        chat.unreadCount as Map<string, number> | Record<string, number>,
        participantIdStr
      );
    });

    res.status(200).json({
      message: 'Chat retrieved',
      chat: {
        id: chat._id,
        participants: chat.participants.map(p => ({
          id: p._id,
          firstName: p.firstName,
          lastName: p.lastName,
          avatarUrl: p.avatarUrl,
          profile: {
            position: p.profile?.position || '',
            company: p.profile?.company || '',
            category: p.profile?.category || 'Other',
          },
        })),
        type: chat.type,
        lastMessage: chat.lastMessage
          ? {
              content: chat.lastMessage.content,
              senderId: chat.lastMessage.senderId,
              timestamp: chat.lastMessage.timestamp,
            }
          : null,
        unreadCount: unreadCountObj,
        createdAt: chat.createdAt,
        updatedAt: chat.updatedAt,
      },
    });
  })
);

// POST /api/chats/:chatId/read - Mark chat as read (reset unreadCount for current user)
router.post(
  '/:chatId/read',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const { chatId } = req.params;
    const currentUserId = req.user!.userId;
    const currentUserObjectId = new Types.ObjectId(currentUserId);

    if (!Types.ObjectId.isValid(chatId)) {
      throw BadRequestError('Invalid chat ID format');
    }

    const chat = await Chat.findById(chatId);
    if (!chat) {
      throw NotFoundError('Chat not found');
    }

    const isParticipant = chat.participants.some(participant =>
      participant.equals(currentUserObjectId)
    );

    if (!isParticipant) {
      throw ForbiddenError('You do not have access to this chat');
    }

    await Chat.findByIdAndUpdate(chatId, {
      $set: { [`unreadCount.${currentUserId}`]: 0 },
    });

    res.status(200).json({ message: 'Chat marked as read' });
  })
);

export default router;
