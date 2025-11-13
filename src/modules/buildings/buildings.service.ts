import { supabase } from '../../config/supabase';
import { AppError } from '../../utils/appError';

const TABLE = 'ChungCus';

export interface BuildingPayload {
  Ten: string;
  DiaChi: string;
  ChuDauTu?: string;
  NamXayDung?: number;
  SoTang?: number;
  MoTa?: string;
}

export const listBuildings = async () => {
  const { data, error } = await supabase.from(TABLE).select('*').order('Ten', { ascending: true });
  if (error) {
    throw new AppError('Failed to fetch buildings', 500, error);
  }
  return data;
};

export const createBuilding = async (payload: BuildingPayload) => {
  const { data, error } = await supabase.from(TABLE).insert(payload).select().single();
  if (error) {
    throw new AppError('Failed to create building', 500, error);
  }
  return data;
};

export const updateBuilding = async (id: number, payload: Partial<BuildingPayload>) => {
  const { data, error } = await supabase.from(TABLE).update(payload).eq('ID', id).select().single();
  if (error) {
    throw new AppError('Failed to update building', 500, error);
  }
  return data;
};

export const deleteBuilding = async (id: number) => {
  const { error } = await supabase.from(TABLE).delete().eq('ID', id);
  if (error) {
    throw new AppError('Failed to delete building', 500, error);
  }
};
