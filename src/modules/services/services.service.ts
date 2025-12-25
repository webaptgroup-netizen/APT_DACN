import dayjs from 'dayjs';
import { supabase } from '../../config/supabase';
import { AppError } from '../../utils/appError';

const SERVICE_TABLE = 'DichVus';
const INVOICE_TABLE = 'HoaDonDichVus';
const INVOICE_ITEMS_TABLE = 'HoaDonDichVu_DichVus';
const RESIDENT_TABLE = 'CuDans';

export interface ServicePayload {
  TenDichVu: string;
  MoTa?: string;
  Gia: number;
  HinhAnh?: string;
}

export const listServices = async () => {
  const { data, error } = await supabase.from(SERVICE_TABLE).select('*').order('TenDichVu', { ascending: true });
  if (error) {
    throw new AppError('Failed to fetch services', 500, error);
  }
  return data;
};

export const createService = async (payload: ServicePayload) => {
  const { data, error } = await supabase.from(SERVICE_TABLE).insert(payload).select().single();
  if (error) {
    throw new AppError('Failed to create service', 500, error);
  }
  return data;
};

export const updateService = async (id: number, payload: Partial<ServicePayload>) => {
  const { data, error } = await supabase.from(SERVICE_TABLE).update(payload).eq('ID', id).select().single();
  if (error) {
    throw new AppError('Failed to update service', 500, error);
  }
  return data;
};

export const deleteService = async (id: number) => {
  const { error } = await supabase.from(SERVICE_TABLE).delete().eq('ID', id);
  if (error) {
    throw new AppError('Failed to delete service', 500, error);
  }
};

const getResidentByUser = async (userId: number) => {
  const { data, error } = await supabase
    .from(RESIDENT_TABLE)
    .select('ID, ID_CanHo, ID_ChungCu')
    .eq('ID_NguoiDung', userId)
    .order('LaChuHo', { ascending: false })
    .order('ID', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new AppError('Failed to load resident profile', 500, error);
  }

  if (!data) {
    throw new AppError('Bạn chưa được gán vào căn hộ nào', 400);
  }

  return data;
};

export const registerServiceForResident = async (userId: number, serviceId: number) => {
  const resident = await getResidentByUser(userId);

  const { data: service, error: serviceError } = await supabase.from(SERVICE_TABLE).select('*').eq('ID', serviceId).single();
  if (serviceError) {
    throw new AppError('Service not found', 404, serviceError);
  }

  const { data: invoice, error: invoiceError } = await supabase
    .from(INVOICE_TABLE)
    .insert({
      ID_CanHo: resident.ID_CanHo,
      ID_ChungCu: resident.ID_ChungCu,
      SoTien: service.Gia,
      NgayLap: dayjs().toISOString(),
      TrangThai: 'Chua thanh toan'
    })
    .select()
    .single();

  if (invoiceError) {
    throw new AppError('Failed to create invoice', 500, invoiceError);
  }

  const { error: itemError } = await supabase
    .from(INVOICE_ITEMS_TABLE)
    .insert({
      ID_HoaDon: invoice.ID,
      ID_DichVu: serviceId
    });

  if (itemError) {
    throw new AppError('Failed to link invoice to service', 500, itemError);
  }

  return {
    invoice,
    service
  };
};
