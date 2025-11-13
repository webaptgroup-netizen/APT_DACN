import axios from 'axios';
import dayjs from 'dayjs';
import { supabase } from '../../config/supabase';
import { AppError } from '../../utils/appError';
import { env } from '../../config/env';

const TABLE = 'TinTucs';

export interface NewsPayload {
  TieuDe: string;
  NoiDung: string;
  HinhAnh?: string;
}

const notifyWebhook = async (news: any, action: 'created' | 'updated' | 'deleted') => {
  if (!env.N8N_WEBHOOK_URL) {
    return;
  }

  try {
    await axios.post(env.N8N_WEBHOOK_URL, {
      type: 'news',
      action,
      payload: news
    });
  } catch (err) {
    console.warn('Failed to notify webhook', err);
  }
};

export const listNews = async () => {
  const { data, error } = await supabase.from(TABLE).select('*').order('NgayDang', { ascending: false });
  if (error) {
    throw new AppError('Failed to fetch news', 500, error);
  }
  return data;
};

export const createNews = async (payload: NewsPayload) => {
  const body = {
    ...payload,
    NgayDang: dayjs().toISOString()
  };

  const { data, error } = await supabase.from(TABLE).insert(body).select().single();
  if (error) {
    throw new AppError('Failed to create news', 500, error);
  }

  await notifyWebhook(data, 'created');
  return data;
};

export const updateNews = async (id: number, payload: Partial<NewsPayload>) => {
  const { data, error } = await supabase.from(TABLE).update(payload).eq('ID', id).select().single();
  if (error) {
    throw new AppError('Failed to update news', 500, error);
  }

  await notifyWebhook(data, 'updated');
  return data;
};

export const deleteNews = async (id: number) => {
  const { data, error } = await supabase.from(TABLE).delete().eq('ID', id).select().single();
  if (error) {
    throw new AppError('Failed to delete news', 500, error);
  }

  await notifyWebhook(data, 'deleted');
};
