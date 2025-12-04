import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../../middleware/auth';
import { asyncHandler } from '../../utils/asyncHandler';
import { validateRequest } from '../../middleware/validateRequest';
import {
  createOrGetPrivateChat,
  ensureBuildingChat,
  listChatMessages,
  listResidentsInSameBuilding,
  listUserChats,
  sendMessage
} from './chat.service';
import { AppError } from '../../utils/appError';

const router = Router();

router.use(requireAuth);

router.get(
  '/my-chats',
  asyncHandler(async (req, res) => {
    const chats = await listUserChats(req.user!.id);
    res.json(chats);
  })
);

router.post(
  '/ensure-building/:buildingId',
  asyncHandler(async (req, res) => {
    const buildingId = Number(req.params.buildingId);
    if (Number.isNaN(buildingId)) {
      throw new AppError('Invalid building id', 400);
    }

    const chat = await ensureBuildingChat(buildingId);
    res.json(chat);
  })
);

const privateChatSchema = z.object({
  body: z.object({
    targetUserId: z.number()
  })
});

router.post(
  '/private',
  validateRequest(privateChatSchema),
  asyncHandler(async (req, res) => {
    const chat = await createOrGetPrivateChat(req.user!.id, req.body.targetUserId);
    res.status(201).json(chat);
  })
);

router.get(
  '/:chatId/messages',
  asyncHandler(async (req, res) => {
    const chatId = Number(req.params.chatId);
    if (Number.isNaN(chatId)) {
      throw new AppError('Invalid chat id', 400);
    }

    const limit = req.query.limit ? Number(req.query.limit) : 50;
    const messages = await listChatMessages(chatId, limit || 50);
    res.json(messages);
  })
);

const sendMessageSchema = z.object({
  body: z.object({
    content: z.string().min(1)
  })
});

router.post(
  '/:chatId/messages',
  validateRequest(sendMessageSchema),
  asyncHandler(async (req, res) => {
    const chatId = Number(req.params.chatId);
    if (Number.isNaN(chatId)) {
      throw new AppError('Invalid chat id', 400);
    }
    const message = await sendMessage(chatId, req.user!.id, req.body.content);
    res.status(201).json(message);
  })
);

router.get(
  '/building/residents',
  asyncHandler(async (req, res) => {
    const residents = await listResidentsInSameBuilding(req.user!.id);
    res.json(residents);
  })
);

export default router;

