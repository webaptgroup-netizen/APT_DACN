import OpenAI from 'openai';
import { env } from '../../config/env';

const client = env.OPENAI_API_KEY
  ? new OpenAI({
      apiKey: env.OPENAI_API_KEY
    })
  : null;

export interface ChatbotInput {
  message: string;
  context?: Record<string, unknown>;
}

export const askChatbot = async (input: ChatbotInput) => {
  if (!client) {
    return {
      answer:
        'Chatbot chưa được cấu hình API key. Vui lòng thiết lập biến môi trường OPENAI_API_KEY hoặc kết nối Dialogflow/Supabase Function.'
    };
  }

  const completion = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content:
          'Bạn là trợ lý ảo cho cư dân chung cư APT-CONNECT. Giữ câu trả lời ngắn gọn, cụ thể cho lĩnh vực quản lý chung cư.'
      },
      {
        role: 'user',
        content: `${input.message}\nNgữ cảnh bổ sung: ${JSON.stringify(input.context ?? {})}`
      }
    ]
  });

  const answer = completion.choices[0]?.message?.content?.trim();
  return {
    answer: answer || 'Xin lỗi, tôi chưa thể trả lời câu hỏi này.'
  };
};
