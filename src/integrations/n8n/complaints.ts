import axios from 'axios';
import { env } from '../../config/env';
import { supabase } from '../../config/supabase';

const DEFAULT_COMPLAINT_WEBHOOK_URL = 'https://n8n.vtcmobile.vn/webhook/GUIPHANANH';

export interface ComplaintCreatedWebhookPayload {
  email?: string;
  residentName?: string;
  buildingName?: string;
  apartment?: string;
  complaintId: number;
  complaintTitle: string;
  complaintContent: string;
  priority?: string;
  category?: string;
  timestamp: string;
}

export interface ComplaintReplyWebhookPayload {
  email: string;
  residentName?: string;
  buildingName?: string;
  apartment?: string;
  complaintId: number;
  complaintTitle?: string;
  complaintContent?: string;
  phanHoi: string;
  replyContent?: string;
  status?: string;
  timestamp: string;
  appUrl?: string;
}

export const notifyComplaintCreatedWebhook = async (payload: ComplaintCreatedWebhookPayload) => {
  const webhookUrl = env.N8N_COMPLAINT_WEBHOOK_URL || DEFAULT_COMPLAINT_WEBHOOK_URL;

  try {
    await axios.post(webhookUrl, payload);
  } catch (err) {
    console.warn('Failed to notify complaint webhook', err);
  }
};

export const notifyComplaintReplyWebhook = async (payload: ComplaintReplyWebhookPayload) => {
  if (!env.N8N_COMPLAINT_REPLY_WEBHOOK_URL) {
    return;
  }

  try {
    await axios.post(env.N8N_COMPLAINT_REPLY_WEBHOOK_URL, payload);
  } catch (err) {
    console.warn('Failed to notify complaint reply webhook', err);
  }
};

export const buildComplaintReplyPayload = async (input: {
  complaint: {
    ID: number;
    ID_NguoiDung: number;
    NoiDung?: string | null;
    PhanHoi?: string | null;
    TrangThai?: string | null;
    NgayGui?: string | null;
  };
}) => {
  const { complaint } = input;
  const timestamp = new Date().toISOString();

  const phanHoi = complaint.PhanHoi?.trim();
  if (!phanHoi) {
    return null;
  }

  try {
    const [userRes, residentRes] = await Promise.all([
      supabase.from('NguoiDungs').select('HoTen, Email').eq('ID', complaint.ID_NguoiDung).maybeSingle(),
      supabase
        .from('CuDans')
        .select('ID, LaChuHo, ID_CanHo, ID_ChungCu')
        .eq('ID_NguoiDung', complaint.ID_NguoiDung)
        .order('LaChuHo', { ascending: false })
        .order('ID', { ascending: false })
        .limit(1)
        .maybeSingle()
    ]);

    const email = (userRes.data as any)?.Email as string | undefined;
    if (!email) {
      return null;
    }

    const residentName = (userRes.data as any)?.HoTen as string | undefined;
    const buildingId = (residentRes.data as any)?.ID_ChungCu as number | null | undefined;
    const apartmentId = (residentRes.data as any)?.ID_CanHo as number | null | undefined;

    const [buildingRes, apartmentRes] = await Promise.all([
      buildingId ? supabase.from('ChungCus').select('Ten').eq('ID', buildingId).maybeSingle() : Promise.resolve({ data: null }),
      apartmentId ? supabase.from('CanHos').select('MaCan').eq('ID', apartmentId).maybeSingle() : Promise.resolve({ data: null })
    ]);

    const payload: ComplaintReplyWebhookPayload = {
      email,
      complaintId: complaint.ID,
      phanHoi,
      replyContent: phanHoi,
      timestamp
    };

    const buildingName = (buildingRes.data as any)?.Ten as string | undefined;
    const apartment = (apartmentRes.data as any)?.MaCan as string | undefined;

    if (residentName) payload.residentName = residentName;
    if (buildingName) payload.buildingName = buildingName;
    if (apartment) payload.apartment = apartment;
    if (complaint.NoiDung) payload.complaintContent = complaint.NoiDung;
    if (complaint.TrangThai) payload.status = complaint.TrangThai;
    if (env.APP_URL) payload.appUrl = env.APP_URL;

    return payload;
  } catch (err) {
    console.warn('Failed to build complaint reply webhook payload', err);
    return null;
  }
};
