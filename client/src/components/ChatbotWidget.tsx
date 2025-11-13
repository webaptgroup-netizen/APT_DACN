import { FormEvent, useState } from 'react';
import api from '../api/client';
import { useAuthStore } from '../store/useAuthStore';

interface Message {
  id: string;
  from: 'me' | 'bot';
  text: string;
}

const ChatbotWidget = () => {
  const { token } = useAuthStore();
  const [messages, setMessages] = useState<Message[]>([
    { id: 'intro', from: 'bot', text: 'Xin chào! Tôi là trợ lý ảo APT-CONNECT, bạn cần hỗ trợ gì?' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  if (!token) return null;

  const sendMessage = async (event: FormEvent) => {
    event.preventDefault();
    if (!input.trim()) return;
    const uuid = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Date.now().toString();
    const userMessage: Message = { id: uuid, from: 'me', text: input.trim() };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);
    try {
      const { data } = await api.post('/chatbot/ask', { message: userMessage.text });
      const botId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-bot`;
      setMessages((prev) => [...prev, { id: botId, from: 'bot', text: data.answer }]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          id: `${Date.now()}-err`,
          from: 'bot',
          text: 'Xin lỗi, chatbot đang gặp sự cố. Vui lòng thử lại sau.'
        }
      ]);
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="chatbot">
      <header>Trợ lý APT</header>
      <div className="messages">
        {messages.map((msg) => (
          <div key={msg.id} className={`message ${msg.from === 'me' ? 'me' : ''}`}>
            {msg.text}
          </div>
        ))}
        {loading && <div className="message">Đang soạn trả lời...</div>}
      </div>
      <form onSubmit={sendMessage}>
        <textarea
          rows={2}
          placeholder="Nhập câu hỏi..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <button className="btn btn-primary" type="submit" disabled={loading}>
          Gửi
        </button>
      </form>
    </div>
  );
};

export default ChatbotWidget;
