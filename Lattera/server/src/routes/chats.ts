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

// POST /api/chats - Create a new chat
router.post(
  '/',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const { participantIds } = req.body as CreateChatRequest;
    const currentUserId = req.user!.userId;

    // Validate participantIds
    if (!participantIds || !Array.isArray(participantIds)) {
      throw BadRequestError('participantIds must be an array');
    }

    if (participantIds.length !== 1) {
      throw BadRequestError('participantIds must contain exactly 1 user ID');
    }

    const otherUserId = participantIds[0];

    // Validate ObjectId format
    if (!Types.ObjectId.isValid(otherUserId)) {
      throw BadRequestError('Invalid user ID format');
    }

    // Prevent self-chat
    if (otherUserId === currentUserId) {
      throw BadRequestError('Cannot create a chat with yourself');
    }

    // Check if other user exists
    const otherUserExists = await User.findById(otherUserId);
    if (!otherUserExists) {
      throw NotFoundError('User not found');
    }

    const currentUserObjectId = new Types.ObjectId(currentUserId);
    const otherUserObjectId = new Types.ObjectId(otherUserId);

    // Check if chat already exists between these users
    const existingChat = await Chat.findOne({
      participants: { $all: [currentUserObjectId, otherUserObjectId] },
      type: 'private',
    }).populate<{ participants: PopulatedParticipant[] }>({
      path: 'participants',
      select:
        'firstName lastName avatarUrl profile.position profile.company profile.category',
    });

    if (existingChat) {
      logger.info('Chat already exists', {
        userId: currentUserId,
        chatId: existingChat._id,
      });

      // Convert unreadCount Map to plain object
      const unreadCountObj: { [key: string]: number } = {};
      existingChat.participants.forEach(participant => {
        const participantIdStr = participant._id.toString();
        unreadCountObj[participantIdStr] = getUnreadCount(
          existingChat.unreadCount as
            | Map<string, number>
            | Record<string, number>,
          participantIdStr
        );
      });

      return res.status(200).json({
        message: 'Chat already exists',
        chat: {
          id: existingChat._id,
          participants: existingChat.participants.map(p => ({
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
          type: existingChat.type,
          lastMessage: existingChat.lastMessage
            ? {
                content: existingChat.lastMessage.content,
                senderId: existingChat.lastMessage.senderId,
                timestamp: existingChat.lastMessage.timestamp,
              }
            : null,
          unreadCount: unreadCountObj,
          createdAt: existingChat.createdAt,
          updatedAt: existingChat.updatedAt,
        },
      });
    }

    // Create new chat
    const newChat = await Chat.create({
      participants: [currentUserObjectId, otherUserObjectId],
      type: 'private',
      lastMessage: undefined,
      unreadCount: new Map([
        [currentUserId, 0],
        [otherUserId, 0],
      ]),
    });

    // Populate participant info
    const populatedChat = await Chat.findById(newChat._id).populate<{
      participants: PopulatedParticipant[];
    }>({
      path: 'participants',
      select:
        'firstName lastName avatarUrl profile.position profile.company profile.category',
    });

    if (!populatedChat) {
      throw NotFoundError('Chat not found after creation');
    }

    logger.info('Chat created', {
      userId: currentUserId,
      chatId: populatedChat._id,
    });

    // Convert unreadCount Map to plain object
    const unreadCountObj: { [key: string]: number } = {};
    populatedChat.participants.forEach(participant => {
      const participantIdStr = participant._id.toString();
      unreadCountObj[participantIdStr] = getUnreadCount(
        populatedChat.unreadCount as
          | Map<string, number>
          | Record<string, number>,
        participantIdStr
      );
    });

    res.status(201).json({
      message: 'Chat created',
      chat: {
        id: populatedChat._id,
        participants: populatedChat.participants.map(p => ({
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
        type: populatedChat.type,
        lastMessage: null,
        unreadCount: unreadCountObj,
        createdAt: populatedChat.createdAt,
        updatedAt: populatedChat.updatedAt,
      },
    });
  })
);

// GET /api/chats - Get all user's chats
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

export default router;
