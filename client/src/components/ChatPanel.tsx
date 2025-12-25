import { MessageOutlined, SendOutlined, UserOutlined } from '@ant-design/icons';
import { Avatar, Button, Drawer, Empty, Input, List, Space, Spin, Tabs, Typography } from 'antd';
import { useEffect, useMemo, useState } from 'react';
import {
  createPrivateChat,
  fetchChatMessages,
  fetchMyChats,
  sendChatMessage,
  type ChatMessage,
  type ChatSummary
} from '../api/chat';
import api from '../api/client';
import { useAuthStore } from '../store/useAuthStore';
import ChatbotWidget from './ChatbotWidget';

const { Text } = Typography;

interface ResidentUser {
  ID_NguoiDung: number;
  NguoiDungs?: {
    ID: number;
    HoTen: string;
    Email: string;
    SoDienThoai?: string;
    LoaiNguoiDung: string;
    HinhAnh?: string;
  };
  CanHos?: {
    MaCan?: string;
  };
}

const ChatPanel = () => {
  const { token, user } = useAuthStore();
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'chats' | 'residents' | 'chatbot'>('chats');
  const [loadingChats, setLoadingChats] = useState(false);
  const [chats, setChats] = useState<ChatSummary[]>([]);
  const [activeChatId, setActiveChatId] = useState<number | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sending, setSending] = useState(false);
  const [input, setInput] = useState('');
  const [residents, setResidents] = useState<ResidentUser[]>([]);
  const [loadingResidents, setLoadingResidents] = useState(false);
  const [residentSearch, setResidentSearch] = useState('');

  const currentChat = useMemo(
    () => chats.find((c) => c.ID === activeChatId),
    [chats, activeChatId]
  );

  const isChatbotTab = activeTab === 'chatbot';

  useEffect(() => {
    if (!open || !token) return;
    void loadChats();
    void loadResidents();
  }, [open, token]);

  useEffect(() => {
    if (!open || !activeChatId || !token) return;

    const interval = setInterval(() => {
      void loadMessages(activeChatId, true);
    }, 2000);

    return () => clearInterval(interval);
  }, [open, activeChatId, token]);

  const loadChats = async () => {
    try {
      setLoadingChats(true);
      const data = await fetchMyChats();
      setChats(data);

      if (!activeChatId && data.length) {
        setActiveChatId(data[0].ID);
        void loadMessages(data[0].ID);
      } else if (activeChatId) {
        void loadMessages(activeChatId);
      }
    } finally {
      setLoadingChats(false);
    }
  };

  const loadMessages = async (chatId: number, silent = false) => {
    try {
      if (!silent) {
        setMessages([]);
      }
      const data = await fetchChatMessages(chatId, 100);
      setMessages(data);
    } catch (err) {
      console.error(err);
    }
  };

  const onSend = async () => {
    if (!activeChatId || !input.trim()) return;
    try {
      setSending(true);
      const msg = await sendChatMessage(activeChatId, input.trim());
      setMessages((prev) => [...prev, msg]);
      setInput('');
    } catch (err) {
      console.error(err);
    } finally {
      setSending(false);
    }
  };

  const loadResidents = async () => {
    try {
      setLoadingResidents(true);
      const { data } = await api.get<ResidentUser[]>('/chat/building/residents');
      setResidents(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingResidents(false);
    }
  };

  const startPrivateChat = async (targetUserId: number) => {
    try {
      const chat = await createPrivateChat(targetUserId);
      setChats((prev) => {
        const exists = prev.find((c) => c.ID === chat.ID);
        return exists ? prev : [...prev, chat];
      });
      setActiveChatId(chat.ID);
      setActiveTab('chats');
      await loadMessages(chat.ID);
    } catch (err) {
      console.error(err);
    }
  };

  if (!token) return null;

  const renderChatList = () => {
    if (loadingChats) {
      return (
        <div style={{ padding: 24, textAlign: 'center' }}>
          <Spin tip="Đang tải..." />
        </div>
      );
    }

    if (!chats.length) {
      return <Empty description="Chưa có phòng chat" />;
    }

    return (
      <List
        size="small"
        dataSource={chats}
        style={{ padding: '0 8px' }}
        renderItem={(chat) => {
          const isActive = chat.ID === activeChatId;
          const title =
            chat.DisplayName ??
            (chat.Loai === 'building'
              ? chat.ChungCus?.Ten ?? `Nhóm chung cư #${chat.ID_ChungCu}`
              : 'Chat riêng');
          const desc =
            chat.Loai === 'building' ? 'Tất cả cư dân & BQL' : 'Giữa 2 cư dân';

          return (
            <List.Item
              key={chat.ID}
              style={{
                cursor: 'pointer',
                background: isActive
                  ? 'linear-gradient(135deg, #e0e7ff 0%, #f3e7e9 100%)'
                  : '#fff',
                borderRadius: 12,
                marginBottom: 8,
                padding: 12,
                border: isActive ? '2px solid #667eea' : '1px solid #e9ecef',
                transition: 'all 0.2s ease',
                boxShadow: isActive
                  ? '0 4px 12px rgba(102, 126, 234, 0.2)'
                  : '0 2px 4px rgba(0,0,0,0.05)'
              }}
              onClick={() => {
                setActiveChatId(chat.ID);
                setActiveTab('chats');
                void loadMessages(chat.ID);
              }}
            >
              <List.Item.Meta
                avatar={
                  <Avatar
                    src={chat.AvatarUrl ?? undefined}
                    size={44}
                    style={{
                      background:
                        chat.Loai === 'building'
                          ? 'linear-gradient(135deg, #a5b4fc 0%, #6366f1 100%)'
                          : 'linear-gradient(135deg, #f97316 0%, #fb7185 100%)',
                      color: '#fff'
                    }}
                  >
                    {chat.DisplayName?.[0]?.toUpperCase() ??
                      chat.ChungCus?.Ten?.[0]?.toUpperCase() ??
                      'C'}
                  </Avatar>
                }
                title={<Text strong>{title}</Text>}
                description={
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {desc}
                  </Text>
                }
              />
            </List.Item>
          );
        }}
      />
    );
  };

  const renderResidents = () => {
    if (loadingResidents) {
      return (
        <div style={{ padding: 16, textAlign: 'center' }}>
          <Spin />
        </div>
      );
    }

    const q = residentSearch.trim().toLowerCase();
    const filtered = q
      ? residents.filter((r) => {
          const name = r.NguoiDungs?.HoTen?.toLowerCase() ?? '';
          const email = r.NguoiDungs?.Email?.toLowerCase() ?? '';
          const phone = r.NguoiDungs?.SoDienThoai?.toLowerCase() ?? '';
          const maCan = r.CanHos?.MaCan?.toLowerCase() ?? '';
          return (
            name.includes(q) || email.includes(q) || phone.includes(q) || maCan.includes(q)
          );
        })
      : residents;

    if (!filtered.length) {
      return <Empty description="Không tìm thấy cư dân" />;
    }

    return (
      <>
        <Input.Search
          placeholder="Tìm theo tên, email, số điện thoại, căn hộ..."
          allowClear
          value={residentSearch}
          onChange={(e) => setResidentSearch(e.target.value)}
          style={{ marginBottom: 8 }}
        />
        <List
          size="small"
          dataSource={filtered}
          renderItem={(r) => (
            <List.Item
              key={r.ID_NguoiDung}
              style={{
                cursor: 'pointer',
                borderRadius: 8,
                marginBottom: 4,
                paddingInline: 8
              }}
              onClick={() => r.NguoiDungs && startPrivateChat(r.NguoiDungs.ID)}
            >
              <List.Item.Meta
                avatar={
                  <Avatar src={r.NguoiDungs?.HinhAnh}>
                    {r.NguoiDungs?.HoTen?.[0]?.toUpperCase() ?? '?'}
                  </Avatar>
                }
                title={
                  <>
                    {r.NguoiDungs?.HoTen}{' '}
                    {r.CanHos?.MaCan && (
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        ({r.CanHos.MaCan})
                      </Text>
                    )}
                  </>
                }
                description={
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {r.NguoiDungs?.Email}
                  </Text>
                }
              />
            </List.Item>
          )}
        />
      </>
    );
  };

  const renderMessages = () => {
    if (!currentChat) {
      return (
        <Empty
          description="Chọn phòng hoặc cư dân để bắt đầu chat."
          style={{ marginTop: 60 }}
        />
      );
    }

    if (!messages.length) {
      return (
        <Empty
          description="Chưa có tin nhắn, hãy bắt đầu trò chuyện!"
          style={{ marginTop: 60 }}
        />
      );
    }

    return (
      <Space
        direction="vertical"
        size={12}
        style={{ width: '100%', padding: '8px 16px' }}
      >
        {messages.map((m) => {
          const isMe = m.ID_NguoiGui === user?.id;
          return (
            <div
              key={m.ID}
              style={{
                display: 'flex',
                justifyContent: isMe ? 'flex-end' : 'flex-start',
                gap: 8
              }}
            >
              {!isMe && (
                <Avatar
                  src={m.NguoiDungs?.HinhAnh}
                  size={36}
                  style={{
                    background: 'linear-gradient(135deg, #f97316 0%, #fb7185 100%)',
                    border: '2px solid #fff',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                    flexShrink: 0
                  }}
                >
                  {m.NguoiDungs?.HoTen?.[0]?.toUpperCase() ?? '?'}
                </Avatar>
              )}
              <div
                style={{
                  maxWidth: '70%',
                  padding: '10px 14px',
                  borderRadius: 16,
                  background: isMe
                    ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                    : '#fff',
                  color: isMe ? '#fff' : '#212529',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                  border: isMe ? 'none' : '1px solid #e9ecef'
                }}
              >
                {!isMe && (
                  <Text
                    strong
                    style={{
                      fontSize: 12,
                      display: 'block',
                      marginBottom: 4,
                      color: '#667eea'
                    }}
                  >
                    {m.NguoiDungs?.HoTen ?? 'Cư dân'}
                  </Text>
                )}
                <Text
                  style={{
                    color: isMe ? '#fff' : '#212529',
                    display: 'block',
                    marginBottom: 4
                  }}
                >
                  {m.NoiDung}
                </Text>
                <Text
                  style={{
                    fontSize: 10,
                    color: isMe ? 'rgba(255,255,255,0.8)' : '#6c757d',
                    display: 'block'
                  }}
                >
                  {new Date(m.CreatedAt).toLocaleTimeString('vi-VN', {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </Text>
              </div>
              {isMe && (
                <Avatar
                  src={user?.hinhAnh}
                  size={36}
                  icon={<UserOutlined />}
                  style={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    border: '2px solid #fff',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                    flexShrink: 0
                  }}
                />
              )}
            </div>
          );
        })}
      </Space>
    );
  };

  return (
    <>
      {!open && (
        <Button
          type="primary"
          icon={<MessageOutlined style={{ fontSize: 20 }} />}
          onClick={() => setOpen(true)}
          style={{
            position: 'fixed',
            right: 24,
            bottom: 24,
            zIndex: 1100,
            borderRadius: '50%',
            width: 64,
            height: 64,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            border: 'none',
            boxShadow: '0 8px 24px rgba(102, 126, 234, 0.4)',
            transition: 'all 0.3s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.1)';
            e.currentTarget.style.boxShadow =
              '0 12px 32px rgba(102, 126, 234, 0.5)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.boxShadow =
              '0 8px 24px rgba(102, 126, 234, 0.4)';
          }}
        />
      )}

      <Drawer
        open={open}
        onClose={() => setOpen(false)}
        title={
          <div
            style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              margin: '-24px -24px 0',
              padding: '20px 24px',
              color: '#fff',
              fontSize: '18px',
              fontWeight: 600
            }}
          >
            💬 Chat cư dân
          </div>
        }
        width={720}
        placement="right"
        bodyStyle={{
          padding: 0,
          display: 'flex',
          height: '100%',
          background: '#f8f9fa'
        }}
        headerStyle={{ border: 'none', padding: 0 }}
      >
        <div style={{ display: 'flex', height: '100%', width: '100%' }}>
          {/* Sidebar */}
          <div
            style={{
              width: 280,
              background: '#fff',
              borderRight: '2px solid #e9ecef',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '2px 0 8px rgba(0,0,0,0.05)'
            }}
          >
            <Tabs
              activeKey={activeTab}
              onChange={(key) => setActiveTab(key as 'chats' | 'residents' | 'chatbot')}
              style={{ padding: '12px 12px 0' }}
              items={[
                {
                  key: 'chats',
                  label: '💬 Phòng chat',
                  children: renderChatList()
                },
                {
                  key: 'residents',
                  label: '👥 Cư dân',
                  children: renderResidents()
                },
                {
                  key: 'chatbot',
                  label: '🤖 Chatbot',
                  children: (
                    <div style={{ padding: 12, color: '#6b7280' }}>
                      Chatbot hiển thị ở khung bên phải.
                    </div>
                  )
                }
              ]}
            />
          </div>

          {/* Main area */}
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              background: '#f8f9fa'
            }}
          >
            {/* Messages */}
            <div
              style={{
                flex: 1,
                overflow: 'hidden',
                padding: isChatbotTab ? 16 : '12px 8px'
              }}
            >
              {isChatbotTab ? (
                <div style={{ height: '100%', overflow: 'hidden' }}>
                  <ChatbotWidget />
                </div>
              ) : (
                <div style={{ height: '100%', overflowY: 'auto' }}>{renderMessages()}</div>
              )}
            </div>

            {/* Input */}
            {!isChatbotTab && (
              <div
                style={{
                  padding: 16,
                  background: '#fff',
                  borderTop: '2px solid #e9ecef',
                  boxShadow: '0 -2px 8px rgba(0,0,0,0.05)'
                }}
              >
                <div style={{ display: 'flex', gap: 12 }}>
                <Input.TextArea
                  rows={2}
                  placeholder={
                    currentChat
                      ? 'Nhập tin nhắn...'
                      : 'Chọn phòng hoặc cư dân để chat...'
                  }
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onPressEnter={(e) => {
                    if (!e.shiftKey) {
                      e.preventDefault();
                      void onSend();
                    }
                  }}
                  disabled={!currentChat || sending}
                  style={{
                    flex: 1,
                    borderRadius: 12,
                    border: '2px solid #e9ecef',
                    fontSize: 14,
                    resize: 'none'
                  }}
                />
                <Button
                  type="primary"
                  loading={sending}
                  onClick={onSend}
                  disabled={!currentChat || !input.trim()}
                  icon={<SendOutlined />}
                  style={{
                    height: 66,
                    borderRadius: 12,
                    background:
                      'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    border: 'none',
                    boxShadow: '0 4px 12px rgba(102, 126, 234, 0.4)',
                    fontWeight: 600,
                    paddingInline: 24
                  }}
                >
                  Gửi
                </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </Drawer>
    </>
  );
};

export default ChatPanel;

