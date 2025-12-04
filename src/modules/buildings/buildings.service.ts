import { supabase } from '../../config/supabase';
import { AppError } from '../../utils/appError';

const TABLE = 'ChungCus';
const IMAGE_TABLE = 'HinhAnhChungCus';

export interface BuildingPayload {
  Ten: string;
  DiaChi: string;
  ChuDauTu?: string;
  NamXayDung?: number;
  SoTang?: number;
  MoTa?: string;
}

const attachImages = async (buildings: any[]) => {
  if (!buildings?.length) {
    return [];
  }

  const ids = buildings.map((b) => b.ID);

  const { data: images, error } = await supabase
    .from(IMAGE_TABLE)
    .select('ID_ChungCu, DuongDan')
    .in('ID_ChungCu', ids);

  if (error) {
    throw new AppError('Failed to fetch building images', 500, error);
  }

  const grouped: Record<number, string[]> = {};

  (images ?? []).forEach((img) => {
    const key = img.ID_ChungCu as number;
    if (!grouped[key]) {
      grouped[key] = [];
    }
    grouped[key].push(img.DuongDan as string);
  });

  return buildings.map((b) => ({
    ...b,
    URLs: grouped[b.ID] ?? []
  }));
};

const setBuildingImages = async (buildingId: number, urls: string[]) => {
  const { error: deleteError } = await supabase.from(IMAGE_TABLE).delete().eq('ID_ChungCu', buildingId);
  if (deleteError) {
    throw new AppError('Failed to reset building images', 500, deleteError);
  }

  if (!urls.length) {
    return;
  }

  const rows = urls.map((url) => ({
    ID_ChungCu: buildingId,
    DuongDan: url
  }));

  const { error: insertError } = await supabase.from(IMAGE_TABLE).insert(rows);
  if (insertError) {
    throw new AppError('Failed to save building images', 500, insertError);
  }
};

export const listBuildings = async () => {
  const { data, error } = await supabase.from(TABLE).select('*').order('Ten', { ascending: true });
  if (error) {
    throw new AppError('Failed to fetch buildings', 500, error);
  }
  return attachImages(data ?? []);
};

export const getBuilding = async (id: number) => {
  const { data, error } = await supabase.from(TABLE).select('*').eq('ID', id).maybeSingle();
  if (error) {
    throw new AppError('Failed to fetch building', 500, error);
  }
  if (!data) {
    return null;
  }
  const [withImages] = await attachImages([data]);
  return withImages ?? null;
};

export const createBuilding = async (payload: BuildingPayload & { ImageURLs?: string[] }) => {
  const { ImageURLs, ...rest } = payload;

  const { data, error } = await supabase.from(TABLE).insert(rest).select().single();
  if (error) {
    throw new AppError('Failed to create building', 500, error);
  }

  try {
    const { ensureBuildingChat } = await import('../chat/chat.service');
    await ensureBuildingChat(data.ID);
  } catch (err) {
    console.warn('Failed to ensure building chat', err);
  }

  if (ImageURLs?.length) {
    await setBuildingImages(data.ID, ImageURLs);
    return {
      ...data,
      URLs: ImageURLs
    };
  }

  return {
    ...data,
    URLs: []
  };
};

export const updateBuilding = async (id: number, payload: Partial<BuildingPayload> & { ImageURLs?: string[] }) => {
  const { ImageURLs, ...rest } = payload;

  const { data, error } = await supabase.from(TABLE).update(rest).eq('ID', id).select().single();
  if (error) {
    throw new AppError('Failed to update building', 500, error);
  }

  if (ImageURLs) {
    await setBuildingImages(id, ImageURLs);
    return {
      ...data,
      URLs: ImageURLs
    };
  }

  return data;
};

export const deleteBuilding = async (id: number) => {
  const { error } = await supabase.from(TABLE).delete().eq('ID', id);
  if (error) {
    throw new AppError('Failed to delete building', 500, error);
  }
};
