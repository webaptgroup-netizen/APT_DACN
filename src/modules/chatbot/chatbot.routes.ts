import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../utils/asyncHandler';
import { validateRequest } from '../../middleware/validateRequest';
import { askChatbot } from './chatbot.service';

const router = Router();

const schema = z.object({
  body: z.object({
    message: z.string().min(3),
    context: z.record(z.string(), z.any()).optional()
  })
});

router.post(
  '/ask',
  validateRequest(schema),
  asyncHandler(async (req, res) => {
    const answer = await askChatbot(req.body);
    res.json(answer);
  })
);

export default router;
