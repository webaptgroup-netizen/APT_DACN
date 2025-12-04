import { useState } from 'react';
import { Avatar, Button, Input, Typography } from 'antd';
import { RobotOutlined, SendOutlined, UserOutlined } from '@ant-design/icons';
import api from '../api/client';

const { Text } = Typography;

interface Message {
  id: string;
  from: 'me' | 'bot';
  text: string;
}

const createId = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;

const ChatbotWidget = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'intro',
      from: 'bot',
      text: 'Xin chào! Mình là trợ lý ảo APT-CONNECT, bạn cần hỗ trợ gì?'
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const sendMessage = async () => {
    if (!input.trim()) return;

    const uuid = createId();
    const userMessage: Message = { id: uuid, from: 'me', text: input.trim() };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const { data } = await api.post<{ answer: string }>('/chatbot/ask', {
        message: userMessage.text
      });

      const botId = createId();
      setMessages((prev) => [
        ...prev,
        {
          id: botId,
          from: 'bot',
          text: data.answer
        }
      ]);
    } catch (error) {
      const botId = createId();
      setMessages((prev) => [
        ...prev,
        {
          id: botId,
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
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        borderRadius: 16,
        overflow: 'hidden',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '12px 16px',
          borderBottom: '1px solid rgba(255,255,255,0.2)'
        }}
      >
        <Avatar
          size={40}
          icon={<RobotOutlined />}
          style={{
            background: 'linear-gradient(135deg, #ffd89b 0%, #19547b 100%)',
            boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
          }}
        />
        <div>
          <Text strong style={{ color: '#fff', fontSize: 16 }}>
            APT-CONNECT Bot
          </Text>
          <br />
          <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12 }}>
            Trả lời dựa trên dữ liệu chung cư hiện tại
          </Text>
        </div>
      </div>

      {/* Messages */}
      <div
        style={{
          flex: 1,
          padding: 12,
          background: 'rgba(249,250,251,0.95)',
          overflowY: 'auto'
        }}
      >
        {messages.map((msg) => {
          const isMe = msg.from === 'me';
          return (
            <div
              key={msg.id}
              style={{
                display: 'flex',
                justifyContent: isMe ? 'flex-end' : 'flex-start',
                marginBottom: 8,
                gap: 8
              }}
            >
              {!isMe && (
                <Avatar
                  size={28}
                  icon={<RobotOutlined />}
                  style={{
                    background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                    flexShrink: 0
                  }}
                />
              )}
              <div
                style={{
                  maxWidth: '75%',
                  padding: '8px 12px',
                  borderRadius: 16,
                  background: isMe ? '#3b82f6' : '#e5e7eb',
                  color: isMe ? '#fff' : '#111827',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.06)'
                }}
              >
                {!isMe && (
                  <Text strong style={{ fontSize: 11, display: 'block', marginBottom: 2 }}>
                    Bot
                  </Text>
                )}
                <Text style={{ whiteSpace: 'pre-wrap' }}>{msg.text}</Text>
              </div>
              {isMe && (
                <Avatar
                  size={28}
                  icon={<UserOutlined />}
                  style={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    flexShrink: 0
                  }}
                />
              )}
            </div>
          );
        })}
        {loading && (
          <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>Đang soạn trả lời...</div>
        )}
      </div>

      {/* Input */}
      <div
        style={{
          padding: 12,
          background: '#fff',
          borderTop: '1px solid #e5e7eb'
        }}
      >
        <div style={{ display: 'flex', gap: 8 }}>
          <Input.TextArea
            rows={2}
            placeholder="Nhập câu hỏi..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onPressEnter={(e) => {
              if (!e.shiftKey) {
                e.preventDefault();
                void sendMessage();
              }
            }}
            disabled={loading}
            style={{ resize: 'none', borderRadius: 8 }}
          />
          <Button
            type="primary"
            icon={<SendOutlined />}
            loading={loading}
            disabled={!input.trim()}
            onClick={() => {
              void sendMessage();
            }}
            style={{
              alignSelf: 'stretch',
              borderRadius: 8
            }}
          >
            Gửi
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ChatbotWidget;

