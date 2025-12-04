import axios from 'axios';
import { env } from '../../config/env';
import { supabase } from '../../config/supabase';
import { AppError } from '../../utils/appError';

export interface ChatbotInput {
  message: string;
}

const GEMINI_API_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

const buildContextForUser = async (user: { id: number; role: string }) => {
  const context: Record<string, unknown> = { role: user.role };

  const [buildingsRes, servicesRes, newsRes] = await Promise.all([
    supabase.from('ChungCus').select('ID, Ten, DiaChi, SoTang'),
    supabase.from('DichVus').select('ID, TenDichVu, MoTa, Gia'),
    supabase.from('TinTucs').select('ID, TieuDe, NgayDang')
  ]);

  if (buildingsRes.error || servicesRes.error || newsRes.error) {
    throw new AppError(
      'Failed to build chatbot context from database',
      500,
      buildingsRes.error || servicesRes.error || newsRes.error
    );
  }

  context.buildings = buildingsRes.data ?? [];
  context.services = servicesRes.data ?? [];
  context.news = newsRes.data ?? [];

  if (user.role === 'Ban quan ly') {
    const [invoicesRes, complaintsRes] = await Promise.all([
      supabase.from('HoaDonDichVus').select('ID, SoTien, TrangThai, NgayLap'),
      supabase.from('PhanAnhs').select('ID, TrangThai, NgayGui')
    ]);

    if (invoicesRes.error || complaintsRes.error) {
      throw new AppError('Failed to load manager context', 500, invoicesRes.error || complaintsRes.error);
    }

    context.invoicesSummary = {
      total: invoicesRes.data?.length ?? 0,
      unpaid: (invoicesRes.data ?? []).filter((i: any) => i.TrangThai === 'Chua thanh toan').length
    };

    context.complaintsSummary = {
      total: complaintsRes.data?.length ?? 0
    };
  } else if (user.role === 'Cu dan') {
    const { data: resident, error } = await supabase
      .from('CuDans')
      .select(
        `
        ID_CanHo,
        ID_ChungCu,
        LaChuHo,
        CanHos ( MaCan, DienTich, SoPhong ),
        ChungCus ( Ten, DiaChi )
      `
      )
      .eq('ID_NguoiDung', user.id)
      .maybeSingle();

    if (error) {
      throw new AppError('Failed to load resident context', 500, error);
    }

    context.residency = resident ?? null;

    if (resident?.ID_CanHo) {
      const { data: invoices } = await supabase
        .from('HoaDonDichVus')
        .select('ID, SoTien, TrangThai, NgayLap')
        .eq('ID_CanHo', resident.ID_CanHo)
        .order('NgayLap', { ascending: false })
        .limit(5);

      context.myInvoices = invoices ?? [];
    }
  }

  return context;
};

export const askChatbot = async (input: ChatbotInput, user: { id: number; role: string }) => {
  if (!env.GEMINI_API_KEY) {
    return {
      answer:
        'Chatbot hiện chưa được cấu hình GEMINI_API_KEY. Vui lòng báo quản trị hệ thống để thiết lập khóa API Gemini.'
    };
  }

  const dbContext = await buildContextForUser(user);

  const systemPrompt =
    'Bạn là chatbot trợ lý cho cư dân và ban quản lý chung cư APT-CONNECT. ' +
    'Chỉ được sử dụng thông tin có trong phần CONTEXT (được lấy từ Supabase hiện tại). ' +
    'Không được bịa ra thông tin về dự án, phí, quy định, hóa đơn nếu trong CONTEXT không có. ' +
    'Nếu câu hỏi vượt quá phạm vi dữ liệu (ví dụ hỏi luật, lịch sử, thông tin ngoài chung cư), hãy trả lời thân thiện rằng bạn chỉ trả lời được về: ' +
    '1) thông tin chung cư và căn hộ, 2) dịch vụ và hóa đơn, 3) phản ánh/complaint, 4) tin tức nội bộ; ' +
    'sau đó gợi ý vài ví dụ câu hỏi cụ thể (ví dụ: \"Hóa đơn dịch vụ gần nhất của tôi?\", \"Những dịch vụ đang có cho cư dân?\", \"Căn hộ của tôi thuộc tòa nào?\"). ' +
    'Trả lời ngắn gọn, rõ ràng, tiếng Việt, xưng hô thân thiện, không liệt kê raw JSON.';

  const payload = {
    contents: [
      {
        role: 'user',
        parts: [
          {
            text:
              `${systemPrompt}\n\n` +
              `CONTEXT (JSON từ Supabase, đã giới hạn theo quyền user):\n` +
              `${JSON.stringify(dbContext)}\n\n` +
              `CÂU HỎI:\n${input.message}`
          }
        ]
      }
    ]
  };

  let response;
  try {
    response = await axios.post(GEMINI_API_URL, payload, {
      params: { key: env.GEMINI_API_KEY },
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err: any) {
    // Ghi log chi tiết cho backend, nhưng trả về thông báo thân thiện cho client
    console.error('Gemini API error', err?.response?.data || err?.message || err);
    return {
      answer:
        'Xin lỗi, chatbot đang gặp sự cố khi kết nối tới dịch vụ Gemini. Vui lòng thử lại sau ít phút hoặc liên hệ ban quản trị để kiểm tra cấu hình GEMINI_API_KEY.'
    };
  }

  const text =
    response.data?.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join(' ').trim() ??
    'Xin lỗi, hiện tại tôi chưa tìm được thông tin phù hợp trong hệ thống để trả lời câu hỏi này. Bạn có thể hỏi về: thông tin căn hộ của bạn, phí dịch vụ, hóa đơn gần đây, hoặc cách gửi phản ánh.';

  return { answer: text };
};
