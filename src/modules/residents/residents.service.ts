import axios from 'axios';
import { supabase } from '../../config/supabase';
import { AppError } from '../../utils/appError';
import { elevateRole, findUserById } from '../auth/auth.service';

const TABLE = 'CuDans';
const RESIDENT_WEBHOOK_URL = 'https://n8n.vtcmobile.vn/webhook/QUYENCUDAN';

export interface ResidentPayload {
  ID_NguoiDung: number;
  ID_CanHo: number;
  ID_ChungCu: number;
  LaChuHo?: boolean;
}

export const listResidents = async (filters?: { buildingId?: number }) => {
  let query = supabase
    .from(TABLE)
    .select(
      `
      *,
      NguoiDungs (
        HoTen,
        Email,
        SoDienThoai,
        LoaiNguoiDung
      ),
      CanHos (
        MaCan,
        TrangThai
      )
    `
    )
    .order('ID', { ascending: false });

  if (filters?.buildingId) {
    query = query.eq('ID_ChungCu', filters.buildingId);
  }

  const { data, error } = await query;
  if (error) {
    throw new AppError('Failed to load residents', 500, error);
  }
  return data;
};

export const createResident = async (payload: ResidentPayload) => {
  const user = await findUserById(payload.ID_NguoiDung);
  if (!user) {
    throw new AppError('User not found', 404);
  }

  const { data: existing, error: existingError } = await supabase
    .from(TABLE)
    .select('ID')
    .eq('ID_NguoiDung', payload.ID_NguoiDung)
    .maybeSingle();

  if (existingError) {
    throw new AppError('Unable to verify existing resident', 500, existingError);
  }

  if (existing) {
    throw new AppError('User already mapped to a resident record', 400);
  }

  const { data, error } = await supabase
    .from(TABLE)
    .insert({
      ...payload,
      LaChuHo: payload.LaChuHo ?? false
    })
    .select()
    .single();

  if (error) {
    throw new AppError('Failed to create resident', 500, error);
  }

  await elevateRole(payload.ID_NguoiDung, 'Cu dan');

  // Best-effort: notify external n8n workflow about resident upgrade
  try {
    const [{ data: building }, { data: apartment }] = await Promise.all([
      supabase.from('ChungCus').select('Ten').eq('ID', payload.ID_ChungCu).maybeSingle(),
      supabase.from('CanHos').select('MaCan').eq('ID', payload.ID_CanHo).maybeSingle()
    ]);

    await axios.post(RESIDENT_WEBHOOK_URL, {
      email: user.Email,
      residentName: user.HoTen,
      buildingName: building?.Ten,
      apartment: apartment?.MaCan,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    // Không làm hỏng nghiệp vụ chính nếu gửi webhook thất bại
    console.warn('Failed to notify resident upgrade webhook', err);
  }
  return data;
};

export const removeResident = async (residentId: number) => {
  const { data, error } = await supabase.from(TABLE).select('ID_NguoiDung').eq('ID', residentId).maybeSingle();
  if (error) {
    throw new AppError('Failed to load resident', 500, error);
  }
  if (!data) {
    throw new AppError('Resident not found', 404);
  }

  const { error: deleteError } = await supabase.from(TABLE).delete().eq('ID', residentId);
  if (deleteError) {
    throw new AppError('Failed to delete resident', 500, deleteError);
  }

  const { data: stillResident, error: checkError } = await supabase
    .from(TABLE)
    .select('ID')
    .eq('ID_NguoiDung', data.ID_NguoiDung)
    .maybeSingle();

  if (checkError) {
    throw new AppError('Failed to verify resident role', 500, checkError);
  }

  if (!stillResident) {
    await elevateRole(data.ID_NguoiDung, 'Khach');
  }
};

export const assignOwner = async (residentId: number, isOwner: boolean) => {
  if (!isOwner) {
    const { data, error } = await supabase.from(TABLE).update({ LaChuHo: false }).eq('ID', residentId).select().single();
    if (error) {
      throw new AppError('Failed to update owner flag', 500, error);
    }
    return data;
  }

  const { data: resident, error: findError } = await supabase
    .from(TABLE)
    .select('ID_CanHo')
    .eq('ID', residentId)
    .maybeSingle();

  if (findError) {
    throw new AppError('Failed to fetch resident', 500, findError);
  }

  if (!resident) {
    throw new AppError('Resident not found', 404);
  }

  const { data: existingOwner, error: ownerError } = await supabase
    .from(TABLE)
    .select('ID')
    .eq('ID_CanHo', resident.ID_CanHo)
    .eq('LaChuHo', true)
    .maybeSingle();

  if (ownerError) {
    throw new AppError('Failed to check existing owner', 500, ownerError);
  }

  if (existingOwner && existingOwner.ID !== residentId) {
    throw new AppError('This apartment already has an owner', 400);
  }

  const { data, error } = await supabase.from(TABLE).update({ LaChuHo: true }).eq('ID', residentId).select().single();
  if (error) {
    throw new AppError('Failed to update owner flag', 500, error);
  }

  return data;
};
