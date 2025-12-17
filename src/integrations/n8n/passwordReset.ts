import axios from 'axios';
import { env } from '../../config/env';

const DEFAULT_PASSWORD_RESET_WEBHOOK_URL = 'https://n8n.vtcmobile.vn/webhook/quenmk';
const DEFAULT_PASSWORD_CHANGED_WEBHOOK_URL = 'https://n8n.vtcmobile.vn/webhook/tbmk';

export interface PasswordResetOtpWebhookPayload {
  email: string;
  userName: string;
  code: string;
  timestamp: string;
  appUrl?: string;
}

export interface PasswordChangedWebhookPayload {
  email: string;
  userName: string;
  timestamp: string;
  appUrl?: string;
}

export const notifyPasswordResetOtpWebhook = async (payload: PasswordResetOtpWebhookPayload) => {
  const webhookUrl = env.N8N_PASSWORD_RESET_WEBHOOK_URL || DEFAULT_PASSWORD_RESET_WEBHOOK_URL;
  try {
    await axios.post(webhookUrl, payload);
  } catch (err) {
    console.warn('Failed to notify password reset webhook', err);
  }
};

export const notifyPasswordChangedWebhook = async (payload: PasswordChangedWebhookPayload) => {
  const webhookUrl = env.N8N_PASSWORD_CHANGED_WEBHOOK_URL || DEFAULT_PASSWORD_CHANGED_WEBHOOK_URL;
  try {
    await axios.post(webhookUrl, payload);
  } catch (err) {
    console.warn('Failed to notify password changed webhook', err);
  }
};

