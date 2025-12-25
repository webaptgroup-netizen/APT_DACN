import { supabase } from '../../config/supabase';
import { AppError } from '../../utils/appError';

const TABLE = 'CanHos';
const IMAGE_TABLE = 'HinhAnhCanHos';
const RESIDENT_TABLE = 'CuDans';

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

export interface OwnerApartmentPayload {
  MoTa?: string;
  Model3DUrl?: string;
  URLs?: string[];
}

export interface UserApartmentSummary {
  apartment: any;
  residentsCount: number;
  isOwner: boolean;
  owner?: {
    hoTen: string;
    email: string;
    soDienThoai?: string;
  };
  residents: Array<{
    ID: number;
    ID_NguoiDung: number;
    LaChuHo: boolean;
    NguoiDungs?: {
      HoTen: string;
      Email: string;
      SoDienThoai?: string;
      LoaiNguoiDung: string;
    };
  }>;
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

const getOwnerApartmentId = async (userId: number) => {
  const { data, error } = await supabase
    .from(RESIDENT_TABLE)
    .select('ID_CanHo')
    .eq('ID_NguoiDung', userId)
    .eq('LaChuHo', true)
    .maybeSingle();

  if (error) {
    throw new AppError('Failed to resolve owner apartment', 500, error);
  }

  const apartmentId = (data as any)?.ID_CanHo as number | undefined;
  if (typeof apartmentId !== 'number') {
    throw new AppError('Bạn không phải chủ hộ', 403);
  }

  return apartmentId;
};

export const getOwnerApartment = async (userId: number) => {
  const apartmentId = await getOwnerApartmentId(userId);
  const apartment = await getApartment(apartmentId);
  if (!apartment) {
    throw new AppError('Apartment not found', 404);
  }

  const { count, error } = await supabase
    .from(RESIDENT_TABLE)
    .select('ID', { count: 'exact', head: true })
    .eq('ID_CanHo', apartmentId);

  if (error) {
    throw new AppError('Failed to count residents', 500, error);
  }

  return { apartment, residentsCount: count ?? 0 };
};

export const updateOwnerApartment = async (userId: number, payload: OwnerApartmentPayload) => {
  const apartmentId = await getOwnerApartmentId(userId);
  const allowedPayload: OwnerApartmentPayload = {};
  if (payload.MoTa !== undefined) allowedPayload.MoTa = payload.MoTa;
  if (payload.Model3DUrl !== undefined) allowedPayload.Model3DUrl = payload.Model3DUrl;
  if (payload.URLs !== undefined) allowedPayload.URLs = payload.URLs;

  const updated = await updateApartment(apartmentId, allowedPayload);
  return attachModel3DUrl(updated);
};

export const listUserApartments = async (userId: number): Promise<UserApartmentSummary[]> => {
  const { data: links, error } = await supabase
    .from(RESIDENT_TABLE)
    .select('ID_CanHo, LaChuHo')
    .eq('ID_NguoiDung', userId);

  if (error) {
    throw new AppError('Failed to load user apartments', 500, error);
  }

  const apartmentIds = Array.from(
    new Set(
      (links ?? [])
        .map((row: any) => row?.ID_CanHo as number | undefined)
        .filter((id): id is number => typeof id === 'number' && id > 0)
    )
  );

  if (!apartmentIds.length) {
    return [];
  }

  const summaries = await Promise.all(
    apartmentIds.map(async (apartmentId) => {
      const [apartment, residentsRes] = await Promise.all([
        getApartment(apartmentId),
        supabase
          .from(RESIDENT_TABLE)
          .select(
            `
              ID,
              ID_NguoiDung,
              LaChuHo,
              NguoiDungs (
                HoTen,
                Email,
                SoDienThoai,
                LoaiNguoiDung
              )
            `
          )
          .eq('ID_CanHo', apartmentId)
          .order('LaChuHo', { ascending: false })
      ]);

      if (!apartment) {
        throw new AppError('Apartment not found', 404);
      }

      if (residentsRes.error) {
        throw new AppError('Failed to load apartment residents', 500, residentsRes.error);
      }

      const residents = (residentsRes.data ?? []) as any[];
      const residentsCount = residents.length;
      const isOwner = residents.some((r) => r?.ID_NguoiDung === userId && r?.LaChuHo === true);
      const ownerResident = residents.find((r) => r?.LaChuHo === true);
      const ownerUser = ownerResident?.NguoiDungs as
        | { HoTen?: unknown; Email?: unknown; SoDienThoai?: unknown }
        | undefined;

      const summary: UserApartmentSummary = {
        apartment,
        residentsCount,
        isOwner,
        residents
      };

      if (ownerUser && typeof ownerUser.HoTen === 'string' && typeof ownerUser.Email === 'string') {
        summary.owner = {
          hoTen: ownerUser.HoTen,
          email: ownerUser.Email,
          ...(typeof ownerUser.SoDienThoai === 'string' ? { soDienThoai: ownerUser.SoDienThoai } : {})
        };
      }

      return summary;
    })
  );

  return summaries.sort((a, b) => Number(b.isOwner) - Number(a.isOwner));
};

export const updateUserApartmentAsOwner = async (
  userId: number,
  apartmentId: number,
  payload: OwnerApartmentPayload
) => {
  const { data, error } = await supabase
    .from(RESIDENT_TABLE)
    .select('ID')
    .eq('ID_NguoiDung', userId)
    .eq('ID_CanHo', apartmentId)
    .eq('LaChuHo', true)
    .maybeSingle();

  if (error) {
    throw new AppError('Failed to verify owner', 500, error);
  }

  if (!data) {
    throw new AppError('Bạn không phải chủ hộ', 403);
  }

  const allowedPayload: OwnerApartmentPayload = {};
  if (payload.MoTa !== undefined) allowedPayload.MoTa = payload.MoTa;
  if (payload.Model3DUrl !== undefined) allowedPayload.Model3DUrl = payload.Model3DUrl;
  if (payload.URLs !== undefined) allowedPayload.URLs = payload.URLs;

  const updated = await updateApartment(apartmentId, allowedPayload);
  return attachModel3DUrl(updated);
};
