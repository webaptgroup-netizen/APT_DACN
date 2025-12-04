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
export declare const fetchMyChats: () => Promise<ChatSummary[]>;
export declare const fetchChatMessages: (chatId: number, limit?: number) => Promise<ChatMessage[]>;
export declare const sendChatMessage: (chatId: number, content: string) => Promise<ChatMessage>;
export declare const ensureBuildingChat: (buildingId: number) => Promise<ChatSummary>;
export declare const createPrivateChat: (targetUserId: number) => Promise<ChatSummary>;
//# sourceMappingURL=chat.d.ts.map