import { supabase } from '../../config/supabase';
import { AppError } from '../../utils/appError';

const TABLE = 'CanHos';
const IMAGE_TABLE = 'HinhAnhCanHos';

export type ApartmentStatus = 'Dang ban' | 'Da ban' | 'Cho thue' | 'Da thue';

export interface ApartmentPayload {
  MaCan: string;
  ID_ChungCu: number;
  DienTich?: number;
  SoPhong?: number;
  Gia?: number;
  TrangThai: ApartmentStatus;
  MoTa?: string;
  Model3DUrl?: string;
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

const serializePayload = (payload: ApartmentPayload | Partial<ApartmentPayload>) => {
  const { Model3DUrl, URLs, ...rest } = payload as any;

  return {
    ...rest,
    URLs: URLs ? JSON.stringify(URLs) : undefined
  };
};

const attachModel3DUrl = async (apartment: any) => {
  if (!apartment?.ID) {
    return apartment;
  }

  const { data, error } = await supabase
    .from(IMAGE_TABLE)
    .select('DuongDan')
    .eq('ID_CanHo', apartment.ID)
    .ilike('DuongDan', 'https://momento360.com%')
    .order('ID', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    // Không fail toàn bộ request chỉ vì không load được 3D
    return apartment;
  }

  return {
    ...apartment,
    Model3DUrl: data?.DuongDan ?? apartment.Model3DUrl
  };
};

const syncModel3DImage = async (apartmentId: number, modelUrl?: string) => {
  // Xóa các bản ghi 3D cũ (giả định là Momento360)
  const { error: deleteError } = await supabase
    .from(IMAGE_TABLE)
    .delete()
    .eq('ID_CanHo', apartmentId)
    .ilike('DuongDan', 'https://momento360.com%');

  if (deleteError) {
    throw new AppError('Failed to sync 3D model image (delete)', 500, deleteError);
  }

  if (!modelUrl) {
    return;
  }

  const { error: insertError } = await supabase
    .from(IMAGE_TABLE)
    .insert({
      ID_CanHo: apartmentId,
      DuongDan: modelUrl
    });

  if (insertError) {
    throw new AppError('Failed to sync 3D model image (insert)', 500, insertError);
  }
};

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

export const getApartment = async (id: number) => {
  const { data, error } = await supabase.from(TABLE).select('*').eq('ID', id).maybeSingle();
  if (error) {
    throw new AppError('Failed to fetch apartment', 500, error);
  }
  if (!data) {
    return null;
  }
  const withUrls = parseUrls(data);
  return attachModel3DUrl(withUrls);
};

export const createApartment = async (payload: ApartmentPayload) => {
  const { data, error } = await supabase.from(TABLE).insert(serializePayload(payload)).select().single();
  if (error) {
    throw new AppError('Failed to create apartment', 500, error);
  }

  if (payload.Model3DUrl) {
    await syncModel3DImage(data.ID, payload.Model3DUrl);
  }

  return parseUrls(data);
};

export const updateApartment = async (id: number, payload: Partial<ApartmentPayload>) => {
  const { data, error } = await supabase.from(TABLE).update(serializePayload(payload)).eq('ID', id).select().single();
  if (error) {
    throw new AppError('Failed to update apartment', 500, error);
  }

  if (payload.Model3DUrl !== undefined) {
    await syncModel3DImage(id, payload.Model3DUrl);
  }

  return parseUrls(data);
};

export const deleteApartment = async (id: number) => {
  const { error } = await supabase.from(TABLE).delete().eq('ID', id);
  if (error) {
    throw new AppError('Failed to delete apartment', 500, error);
  }
};
