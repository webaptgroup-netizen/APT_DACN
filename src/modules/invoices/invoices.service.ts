import { supabase } from '../../config/supabase';
import { AppError } from '../../utils/appError';

const INVOICE_TABLE = 'HoaDonDichVus';
const RESIDENT_TABLE = 'CuDans';

const baseSelect = `
  *,
  CanHos ( MaCan ),
  ChungCus ( Ten ),
  HoaDonDichVu_DichVus (
    DichVus (
      TenDichVu,
      Gia
    )
  )
`;

export const listInvoices = async (filters?: { buildingId?: number }) => {
  let query = supabase.from(INVOICE_TABLE).select(baseSelect).order('NgayLap', { ascending: false });
  if (filters?.buildingId) {
    query = query.eq('ID_ChungCu', filters.buildingId);
  }

  const { data, error } = await query;
  if (error) {
    throw new AppError('Failed to fetch invoices', 500, error);
  }

  return data;
};

export const listInvoicesForResident = async (userId: number) => {
  const { data: resident, error: residentError } = await supabase
    .from(RESIDENT_TABLE)
    .select('ID_CanHo')
    .eq('ID_NguoiDung', userId)
    .maybeSingle();

  if (residentError) {
    throw new AppError('Failed to load resident profile', 500, residentError);
  }

  if (!resident) {
    return [];
  }

  const { data, error } = await supabase
    .from(INVOICE_TABLE)
    .select(baseSelect)
    .eq('ID_CanHo', resident.ID_CanHo)
    .order('NgayLap', { ascending: false });

  if (error) {
    throw new AppError('Failed to fetch invoices', 500, error);
  }

  return data;
};

export const updateInvoiceStatus = async (id: number, status: 'Chua thanh toan' | 'Da thanh toan') => {
  const { data, error } = await supabase.from(INVOICE_TABLE).update({ TrangThai: status }).eq('ID', id).select().single();
  if (error) {
    throw new AppError('Failed to update invoice', 500, error);
  }

  return data;
};
