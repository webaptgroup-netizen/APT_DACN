import { supabase } from '../../config/supabase';
import { AppError } from '../../utils/appError';

const INVOICE_TABLE = 'HoaDonDichVus';
const RESIDENT_TABLE = 'CuDans';
const RECEIPT_TABLE = 'PhieuThus';

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

export const updateInvoiceStatus = async (
  adminId: number,
  id: number,
  status: 'Chua thanh toan' | 'Da thanh toan',
  ngayThucHien?: string,
  hinhThucThanhToan?: string
) => {
  const { data: existing, error: fetchError } = await supabase
    .from(INVOICE_TABLE)
    .select('*')
    .eq('ID', id)
    .maybeSingle();

  if (fetchError) {
    throw new AppError('Failed to load invoice', 500, fetchError);
  }

  if (!existing) {
    throw new AppError('Invoice not found', 404);
  }

  const payload: Record<string, unknown> = { TrangThai: status };
  if (ngayThucHien) {
    payload.NgayThucHien = ngayThucHien;
  }
  if (typeof hinhThucThanhToan !== 'undefined') {
    payload.HinhThucThanhToan = hinhThucThanhToan;
  }

  const { data, error } = await supabase
    .from(INVOICE_TABLE)
    .update(payload)
    .eq('ID', id)
    .select()
    .single();
  if (error) {
    throw new AppError('Failed to update invoice', 500, error);
  }

  if (status === 'Da thanh toan' && existing.TrangThai !== 'Da thanh toan') {
    const { data: existingReceipt, error: receiptError } = await supabase
      .from(RECEIPT_TABLE)
      .select('ID')
      .eq('ID_HoaDon', id)
      .maybeSingle();

    if (receiptError) {
      throw new AppError('Failed to verify receipt', 500, receiptError);
    }

    if (!existingReceipt) {
      const { error: createError } = await supabase
        .from(RECEIPT_TABLE)
        .insert({
          ID_HoaDon: id,
          ID_Admin: adminId
        });

      if (createError) {
        throw new AppError('Failed to create receipt', 500, createError);
      }
    }
  }

  return data;
};

export const getInvoiceReceipt = async (invoiceId: number) => {
  const { data, error } = await supabase
    .from(RECEIPT_TABLE)
    .select(
      `
      ID,
      NgayXuat,
      NguoiDungs:ID_Admin (
        ID,
        HoTen,
        Email
      ),
      HoaDonDichVus:ID_HoaDon (
        ID,
        ID_CanHo,
        ID_ChungCu,
        SoTien,
        NgayLap,
        NgayThucHien,
        HinhThucThanhToan,
        TrangThai,
        CanHos ( MaCan ),
        ChungCus ( Ten ),
        HoaDonDichVu_DichVus (
          DichVus ( TenDichVu )
        )
      )
    `
    )
    .eq('ID_HoaDon', invoiceId)
    .maybeSingle();

  if (error) {
    throw new AppError('Failed to load receipt', 500, error);
  }

  if (!data || !data.HoaDonDichVus) {
    return data;
  }

  const invoice = data.HoaDonDichVus as {
    ID_CanHo: number;
    ID_ChungCu: number;
  };

  // Try to resolve resident (prefer apartment owner)
  const { data: owner, error: ownerError } = await supabase
    .from(RESIDENT_TABLE)
    .select(
      `
      ID,
      LaChuHo,
      NguoiDungs (
        HoTen,
        Email
      )
    `
    )
    .eq('ID_CanHo', invoice.ID_CanHo)
    .eq('ID_ChungCu', invoice.ID_ChungCu)
    .eq('LaChuHo', true)
    .maybeSingle();

  if (ownerError) {
    throw new AppError('Failed to load resident for receipt', 500, ownerError);
  }

  let resident = owner;

  if (!resident) {
    const { data: anyResident, error: anyError } = await supabase
      .from(RESIDENT_TABLE)
      .select(
        `
        ID,
        LaChuHo,
        NguoiDungs (
          HoTen,
          Email
        )
      `
      )
      .eq('ID_CanHo', invoice.ID_CanHo)
      .eq('ID_ChungCu', invoice.ID_ChungCu)
      .maybeSingle();

    if (anyError) {
      throw new AppError('Failed to load resident for receipt', 500, anyError);
    }

    resident = anyResident ?? undefined;
  }

  return {
    ...data,
    Resident: resident ?? null
  };
};
