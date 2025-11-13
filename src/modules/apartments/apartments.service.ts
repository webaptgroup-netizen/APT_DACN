import { supabase } from '../../config/supabase';
import { AppError } from '../../utils/appError';

const TABLE = 'CanHos';

export type ApartmentStatus = 'Dang ban' | 'Da ban' | 'Cho thue' | 'Da thue';

export interface ApartmentPayload {
  MaCan: string;
  ID_ChungCu: number;
  DienTich?: number;
  SoPhong?: number;
  Gia?: number;
  TrangThai: ApartmentStatus;
  MoTa?: string;
  URLs?: string[];
}

const parseUrls = (record: any) => {
  if (!record) {
    return record;
  }

  try {
    const value = record.URLs ?? record.urls;
    return {
      ...record,
      URLs: value ? JSON.parse(value) : []
    };
  } catch {
    return {
      ...record,
      URLs: []
    };
  }
};

const serializePayload = (payload: ApartmentPayload | Partial<ApartmentPayload>) => ({
  ...payload,
  URLs: payload.URLs ? JSON.stringify(payload.URLs) : undefined
});

export const listApartments = async (filters?: { buildingId?: number; status?: ApartmentStatus }) => {
  let query = supabase
    .from(TABLE)
    .select('*')
    .order('ID', { ascending: false });

  if (filters?.buildingId) {
    query = query.eq('ID_ChungCu', filters.buildingId);
  }

  if (filters?.status) {
    query = query.eq('TrangThai', filters.status);
  }

  const { data, error } = await query;
  if (error) {
    throw new AppError('Failed to fetch apartments', 500, error);
  }
  return data?.map(parseUrls) ?? [];
};

export const createApartment = async (payload: ApartmentPayload) => {
  const { data, error } = await supabase.from(TABLE).insert(serializePayload(payload)).select().single();
  if (error) {
    throw new AppError('Failed to create apartment', 500, error);
  }
  return parseUrls(data);
};

export const updateApartment = async (id: number, payload: Partial<ApartmentPayload>) => {
  const { data, error } = await supabase.from(TABLE).update(serializePayload(payload)).eq('ID', id).select().single();
  if (error) {
    throw new AppError('Failed to update apartment', 500, error);
  }
  return parseUrls(data);
};

export const deleteApartment = async (id: number) => {
  const { error } = await supabase.from(TABLE).delete().eq('ID', id);
  if (error) {
    throw new AppError('Failed to delete apartment', 500, error);
  }
};
