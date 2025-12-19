import { Router, Request, Response } from 'express';
import { Types } from 'mongoose';
import { Message } from '../database/models/Message';
import { Chat } from '../database/models/Chat';
import { authMiddleware } from '../middleware/auth';
import {
  asyncHandler,
  BadRequestError,
  ForbiddenError,
  NotFoundError,
} from '../utils';
import logger from '../utils/logger';
import { getSocketHandler } from '../utils/socketManager';

interface DeletedMessageData {
  messageId: string;
  chatId: string;
}

const router = Router();

interface CreateMessageRequest {
  chatId: string;
  content?: string;
  media?: {
    type: 'image' | 'audio' | 'video';
    url: string;
    metadata?: {
      duration?: number;
      width?: number;
      height?: number;
    };
  };
}

interface PopulatedSender {
  _id: Types.ObjectId;
  firstName: string;
  lastName: string;
}

/**
 * @swagger
 * /api/messages:
 *   post:
 *     summary: Отправить сообщение
 *     description: Отправляет новое сообщение в чат. Поддерживает текстовые сообщения и медиа (изображения, аудио, видео).
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - chatId
 *             properties:
 *               chatId:
 *                 type: string
 *                 description: ID чата
 *                 example: "507f1f77bcf86cd799439013"
 *               content:
 *                 type: string
 *                 maxLength: 5000
 *                 description: Текст сообщения
 *                 example: "Привет! Как дела?"
 *               media:
 *                 type: object
 *                 properties:
 *                   type:
 *                     type: string
 *                     enum: [image, audio, video]
 *                     description: Тип медиафайла
 *                     example: "image"
 *                   url:
 *                     type: string
 *                     description: URL медиафайла
 *                     example: "https://s3.amazonaws.com/lettera/uploads/image.jpg"
 *                   metadata:
 *                     type: object
 *                     properties:
 *                       duration:
 *                         type: number
 *                         description: Длительность для аудио/видео (в секундах)
 *                       width:
 *                         type: number
 *                         description: Ширина для изображений/видео
 *                       height:
 *                         type: number
 *                         description: Высота для изображений/видео
 *           examples:
 *             textMessage:
 *               summary: Текстовое сообщение
 *               value:
 *                 chatId: "507f1f77bcf86cd799439013"
 *                 content: "Привет! Как дела?"
 *             mediaMessage:
 *               summary: Сообщение с изображением
 *               value:
 *                 chatId: "507f1f77bcf86cd799439013"
 *                 content: "Посмотри на это фото!"
 *                 media:
 *                   type: "image"
 *                   url: "https://s3.amazonaws.com/lettera/uploads/photo.jpg"
 *                   metadata:
 *                     width: 1920
 *                     height: 1080
 *     responses:
 *       201:
 *         description: Сообщение успешно отправлено
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Message sent"
 *                 data:
 *                   $ref: '#/components/schemas/Message'
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
// POST /api/messages - Create a new message
router.post(
  '/',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const { chatId, content, media } = req.body;
    const currentUserId = req.user!.userId;
    const currentUserObjectId = new Types.ObjectId(currentUserId);

    // Validate chatId
    if (!chatId || typeof chatId !== 'string') {
      throw BadRequestError('chatId is required and must be a string');
    }

    if (!Types.ObjectId.isValid(chatId)) {
      throw BadRequestError('Invalid chat ID format');
    }

    // Validate content or media
    if (!content && !media) {
      throw BadRequestError('Either content or media must be provided');
    }

    if (content && typeof content !== 'string') {
      throw BadRequestError('content must be a string');
    }

    if (content && content.length > 5000) {
      throw BadRequestError('content must be less than 5000 characters');
    }

    // Verify user is participant of the chat
    const chat = await Chat.findById(chatId);

    if (!chat) {
      throw NotFoundError('Chat not found');
    }

    const isParticipant = chat.participants.some(participant =>
      participant.equals(currentUserObjectId)
    );

    if (!isParticipant) {
      throw ForbiddenError('You are not a participant of this chat');
    }

    // Create and save the message
    const message = new Message({
      chatId: new Types.ObjectId(chatId),
      senderId: currentUserObjectId,
      content: content || '',
      media: media || undefined,
      timestamp: new Date(),
    });

    await message.save();

    // Populate sender for response
    const populatedMessage = await Message.findById(message._id)
      .populate<{ senderId: PopulatedSender }>({
        path: 'senderId',
        select: 'firstName lastName',
      })
      .lean();

    if (!populatedMessage || !populatedMessage.senderId) {
      throw new Error('Failed to populate message sender');
    }

    // Emit socket event for new message
    const socketHandler = getSocketHandler();
    if (socketHandler) {
      socketHandler.broadcastNewMessage({
        messageId: populatedMessage._id.toString(),
        chatId: chatId,
        senderId: currentUserId,
        content: populatedMessage.content,
        timestamp: populatedMessage.timestamp.toISOString(),
      });
    }

    // Update chat lastMessage + unreadCount for other participants
    const otherParticipantIds = chat.participants
      .filter(participant => !participant.equals(currentUserObjectId))
      .map(participant => participant.toString());

    const incUpdate: Record<string, number> = {};
    otherParticipantIds.forEach(participantId => {
      incUpdate[`unreadCount.${participantId}`] = 1;
    });

    const chatUpdate: any = {
      $set: {
        lastMessage: {
          content: message.content,
          senderId: currentUserObjectId,
          timestamp: message.timestamp,
        },
      },
    };

    if (Object.keys(incUpdate).length > 0) {
      chatUpdate.$inc = incUpdate;
    }

    await Chat.findByIdAndUpdate(chatId, chatUpdate);

    logger.info('Message created, chat updated and emitted via socket', {
      userId: currentUserId,
      chatId,
      messageId: message._id,
      otherParticipantIds,
    });

    res.status(201).json({
      message: 'Message sent',
      data: {
        id: populatedMessage._id.toString(),
        chatId: populatedMessage.chatId.toString(),
        senderId: populatedMessage.senderId._id.toString(),
        sender: {
          id: populatedMessage.senderId._id.toString(),
          firstName: populatedMessage.senderId.firstName,
          lastName: populatedMessage.senderId.lastName,
        },
        content: populatedMessage.content,
        media: populatedMessage.media || null,
        editedAt: populatedMessage.editedAt?.toISOString() || null,
        deletedFor: populatedMessage.deletedFor.map(id => id.toString()),
        timestamp: populatedMessage.timestamp.toISOString(),
        status: 'sent' as const,
        deliveredAt: populatedMessage.timestamp.toISOString(),
      },
    });
  })
);

// GET /api/messages?chatId=...&limit=50&offset=0 - Get messages
router.get(
  '/',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const { chatId } = req.query;
    const currentUserId = req.user!.userId;
    const currentUserObjectId = new Types.ObjectId(currentUserId);

    // Validate chatId
    if (!chatId || typeof chatId !== 'string') {
      throw BadRequestError('chatId query parameter is required');
    }

    if (!Types.ObjectId.isValid(chatId)) {
      throw BadRequestError('Invalid chat ID format');
    }

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

    // Verify user is participant of the chat
    const chat = await Chat.findById(chatId);

    if (!chat) {
      throw NotFoundError('Chat not found');
    }

    const isParticipant = chat.participants.some(participant =>
      participant.equals(currentUserObjectId)
    );

    if (!isParticipant) {
      throw ForbiddenError('You are not a participant of this chat');
    }

    // Get total count (excluding messages deleted for this user)
    const total = await Message.countDocuments({
      chatId: new Types.ObjectId(chatId),
      deletedFor: { $ne: currentUserObjectId },
    });

    // Find messages not deleted for this user
    const messages = await Message.find({
      chatId: new Types.ObjectId(chatId),
      deletedFor: { $ne: currentUserObjectId },
    })
      .populate<{ senderId: PopulatedSender }>({
        path: 'senderId',
        select: 'firstName lastName',
      })
      .sort({ timestamp: -1 })
      .skip(offset)
      .limit(limit);

    logger.info('Messages retrieved', {
      userId: currentUserId,
      chatId,
      total,
      count: messages.length,
      limit,
      offset,
    });

    res.status(200).json({
      message: 'Messages retrieved',
      total,
      count: messages.length,
      limit,
      offset,
      messages: messages.map(msg => ({
        id: msg._id.toString(),
        chatId: msg.chatId.toString(),
        senderId: msg.senderId._id.toString(),
        sender: {
          id: msg.senderId._id.toString(),
          firstName: msg.senderId.firstName,
          lastName: msg.senderId.lastName,
        },
        content: msg.content,
        media: msg.media || null,
        editedAt: msg.editedAt?.toISOString() || null,
        deletedFor: msg.deletedFor.map(id => id.toString()),
        timestamp: msg.timestamp.toISOString(),
        status: 'sent' as const,
        deliveredAt: msg.timestamp.toISOString(),
      })),
    });
  })
);

/**
 * @swagger
 * /api/messages/{messageId}:
 *   patch:
 *     summary: Редактировать сообщение
 *     description: Редактирует сообщение. Можно редактировать только свои сообщения в течение 15 минут после отправки.
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: messageId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID сообщения
 *         example: "507f1f77bcf86cd799439015"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateMessageRequest'
 *           example:
 *             content: "Привет! Как дела? 😊"
 *     responses:
 *       200:
 *         description: Сообщение успешно отредактировано
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Message updated successfully"
 *                 data:
 *                   $ref: '#/components/schemas/Message'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       409:
 *         description: Сообщение слишком старое для редактирования
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               error:
 *                 code: 'TOO_LATE_TO_EDIT',
 *                 message: 'Messages can only be edited within 15 minutes of sending',
 *                 details: []
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
// DELETE /api/messages/:messageId?forAll=false - Delete a message
router.delete(
  '/:messageId',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const { messageId } = req.params;
    const { forAll } = req.query;
    const currentUserId = req.user!.userId;
    const currentUserObjectId = new Types.ObjectId(currentUserId);

    // Validate messageId
    if (!Types.ObjectId.isValid(messageId)) {
      throw BadRequestError('Invalid message ID format');
    }

    // Parse forAll parameter
    const deleteForAll = forAll === 'true';

    // Find message
    const message = await Message.findById(messageId);

    if (!message) {
      throw NotFoundError('Message not found');
    }

    // Find chat to verify participation
    const chat = await Chat.findById(message.chatId);

    if (!chat) {
      throw NotFoundError('Chat not found');
    }

    const isParticipant = chat.participants.some(participant =>
      participant.equals(currentUserObjectId)
    );

    if (!isParticipant) {
      throw ForbiddenError('You are not a participant of this chat');
    }

    if (deleteForAll) {
      // Hard delete - only sender can delete for all
      if (!message.senderId.equals(currentUserObjectId)) {
        throw ForbiddenError('Only the sender can delete message for everyone');
      }

      // Check if message is less than 24 hours old
      const messageAge = Date.now() - message.timestamp.getTime();
      const twentyFourHoursInMs = 24 * 60 * 60 * 1000;

      if (messageAge > twentyFourHoursInMs) {
        throw ForbiddenError(
          'Messages can only be deleted for everyone within 24 hours of sending'
        );
      }

      // Delete message
      await Message.findByIdAndDelete(messageId);

      logger.info('Message deleted for everyone', {
        userId: currentUserId,
        messageId,
      });
    } else {
      // Soft delete - add user to deletedFor array
      const userIdStr = currentUserObjectId.toString();
      const deletedForStrings = message.deletedFor.map((id: Types.ObjectId) =>
        id.toString()
      );

      if (!deletedForStrings.includes(userIdStr)) {
        message.deletedFor.push(currentUserObjectId);
        await message.save();
      }

      logger.info('Message deleted for user', {
        userId: currentUserId,
        messageId,
      });
    }

    // Broadcast deleted message via Socket.io for both cases
    const socketHandler = getSocketHandler();
    if (socketHandler) {
      const deletedMessageData: DeletedMessageData = {
        messageId: message._id.toString(),
        chatId: message.chatId.toString(),
      };
      socketHandler.broadcastDeletedMessage(deletedMessageData);
    }

    res.status(200).json({
      message: 'Message deleted successfully',
    });
  })
);

export default router;
