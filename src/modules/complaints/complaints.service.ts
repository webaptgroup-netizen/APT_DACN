import dayjs from 'dayjs';
import { supabase } from '../../config/supabase';
import { AppError } from '../../utils/appError';

const TABLE = 'PhanAnhs';

export type ComplaintStatus = 'Chua xu ly' | 'Dang xu ly' | 'Da xu ly';

export interface ComplaintPayload {
  NoiDung: string;
  HinhAnh?: string;
}

export const listComplaints = async (user: { id: number; role: string }) => {
  let query = supabase
    .from(TABLE)
    .select(
      `
      *,
      NguoiDungs (
        HoTen,
        Email
      )
    `
    )
    .order('NgayGui', { ascending: false });

  if (user.role !== 'Ban quan ly') {
    query = query.eq('ID_NguoiDung', user.id);
  }

  const { data, error } = await query;
  if (error) {
    throw new AppError('Failed to load complaints', 500, error);
  }

  return data;
};

export const createComplaint = async (userId: number, payload: ComplaintPayload) => {
  const { data, error } = await supabase
    .from(TABLE)
    .insert({
      ID_NguoiDung: userId,
      NoiDung: payload.NoiDung,
      HinhAnh: payload.HinhAnh,
      TrangThai: 'Chua xu ly',
      NgayGui: dayjs().toISOString()
    })
    .select()
    .single();

  if (error) {
    throw new AppError('Failed to submit complaint', 500, error);
  }

  return data;
};

export const updateComplaint = async (
  id: number,
  payload: { TrangThai?: ComplaintStatus; PhanHoi?: string }
) => {
  const { data, error } = await supabase.from(TABLE).update(payload).eq('ID', id).select().single();
  if (error) {
    throw new AppError('Failed to update complaint', 500, error);
  }

  return data;
};
