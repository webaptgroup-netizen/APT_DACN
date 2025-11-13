import nodemailer from 'nodemailer';
import { env } from './env';

export const mailer = () => {
  if (!env.EMAIL_HOST || !env.EMAIL_USER || !env.EMAIL_PASSWORD) {
    throw new Error('Mail service is not configured. Please provide EMAIL_* variables.');
  }

  const port = Number(env.EMAIL_PORT ?? 587);

  return nodemailer.createTransport({
    host: env.EMAIL_HOST,
    port,
    secure: port === 465,
    auth: {
      user: env.EMAIL_USER,
      pass: env.EMAIL_PASSWORD
    }
  });
};
