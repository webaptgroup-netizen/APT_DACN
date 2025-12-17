import axios from 'axios';
import { env } from '../../config/env';
import { supabase } from '../../config/supabase';

const DEFAULT_RESIDENT_WEBHOOK_URL = 'https://n8n.vtcmobile.vn/webhook/QUYENCUDAN';

export interface ResidentUpgradeWebhookPayload {
  email: string;
  residentName: string;
  buildingName?: string;
  apartment?: string;
  timestamp: string;
  appUrl?: string;
}

export const notifyResidentUpgradeWebhook = async (payload: ResidentUpgradeWebhookPayload) => {
  const webhookUrl = env.N8N_RESIDENT_WEBHOOK_URL || DEFAULT_RESIDENT_WEBHOOK_URL;

  try {
    await axios.post(webhookUrl, payload);
  } catch (err) {
    console.warn('Failed to notify resident upgrade webhook', err);
  }
};

export const buildResidentUpgradePayload = async (input: {
  email: string;
  residentName: string;
  buildingId?: number | null;
  apartmentId?: number | null;
  timestamp?: string;
}) => {
  const timestamp = input.timestamp ?? new Date().toISOString();

  try {
    const [buildingRes, apartmentRes] = await Promise.all([
      input.buildingId
        ? supabase.from('ChungCus').select('Ten').eq('ID', input.buildingId).maybeSingle()
        : Promise.resolve({ data: null }),
      input.apartmentId
        ? supabase.from('CanHos').select('MaCan').eq('ID', input.apartmentId).maybeSingle()
        : Promise.resolve({ data: null })
    ]);

    const payload: ResidentUpgradeWebhookPayload = {
      email: input.email,
      residentName: input.residentName,
      timestamp
    };

    const buildingName = (buildingRes.data as any)?.Ten as string | undefined;
    const apartment = (apartmentRes.data as any)?.MaCan as string | undefined;

    if (buildingName) payload.buildingName = buildingName;
    if (apartment) payload.apartment = apartment;
    if (env.APP_URL) payload.appUrl = env.APP_URL;

    return payload;
  } catch (err) {
    console.warn('Failed to resolve resident upgrade payload metadata', err);
    const payload: ResidentUpgradeWebhookPayload = {
      email: input.email,
      residentName: input.residentName,
      timestamp
    };

    if (env.APP_URL) payload.appUrl = env.APP_URL;

    return payload;
  }
};
