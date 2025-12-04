import api from './client';

export interface ChatSummary {
  ID: number;
  Loai: 'building' | 'private';
  ID_ChungCu?: number | null;
  PrivateKey?: string | null;
  CreatedAt: string;
  ChungCus?: {
    ID: number;
    Ten: string;
  } | null;
  AvatarUrl?: string | null;
  DisplayName?: string | null;
}

export interface ChatMessage {
  ID: number;
  ID_Chat: number;
  ID_NguoiGui: number;
  NoiDung: string;
  CreatedAt: string;
  NguoiDungs?: {
    HoTen: string;
    HinhAnh?: string;
  };
}

export const fetchMyChats = async () => {
  const { data } = await api.get<ChatSummary[]>('/chat/my-chats');
  return data;
};

export const fetchChatMessages = async (chatId: number, limit = 50) => {
  const { data } = await api.get<ChatMessage[]>(`/chat/${chatId}/messages`, {
    params: { limit }
  });
  return data;
};

export const sendChatMessage = async (chatId: number, content: string) => {
  const { data } = await api.post<ChatMessage>(`/chat/${chatId}/messages`, { content });
  return data;
};

export const ensureBuildingChat = async (buildingId: number) => {
  const { data } = await api.post<ChatSummary>(`/chat/ensure-building/${buildingId}`);
  return data;
};

export const createPrivateChat = async (targetUserId: number) => {
  const { data } = await api.post<ChatSummary>('/chat/private', { targetUserId });
  return data;
};
