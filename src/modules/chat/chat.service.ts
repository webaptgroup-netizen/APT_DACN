import { supabase } from '../../config/supabase';
import { AppError } from '../../utils/appError';

const CHAT_TABLE = 'Chats';
const MEMBER_TABLE = 'ChatMembers';
const MESSAGE_TABLE = 'ChatMessages';
const USER_TABLE = 'NguoiDungs';
const RESIDENT_TABLE = 'CuDans';
const BUILDING_TABLE = 'ChungCus';
const BUILDING_IMAGE_TABLE = 'HinhAnhChungCus';

export type ChatType = 'building' | 'private';

export interface Chat {
  ID: number;
  Loai: ChatType;
  ID_ChungCu: number | null;
  PrivateKey: string | null;
  CreatedAt: string;
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

const ensureBuildingChatInternal = async (buildingId: number) => {
  const { data: existing, error: existingError } = await supabase
    .from<Chat>(CHAT_TABLE)
    .select('*')
    .eq('Loai', 'building')
    .eq('ID_ChungCu', buildingId)
    .maybeSingle();

  if (existingError) {
    throw new AppError('Failed to load building chat', 500, existingError);
  }

  if (existing) {
    return existing;
  }

  const { data: created, error: createError } = await supabase
    .from<Chat>(CHAT_TABLE)
    .insert({
      Loai: 'building',
      ID_ChungCu: buildingId
    } as any)
    .select()
    .single();

  if (createError) {
    throw new AppError('Failed to create building chat', 500, createError);
  }

  return created;
};

export const ensureBuildingChat = async (buildingId: number) => {
  const chat = await ensureBuildingChatInternal(buildingId);

  const { data: managers, error: managerError } = await supabase
    .from(USER_TABLE)
    .select('ID')
    .eq('LoaiNguoiDung', 'Ban quan ly');

  if (managerError) {
    throw new AppError('Failed to load managers for chat', 500, managerError);
  }

  const managerIds = (managers ?? []).map((m: any) => m.ID as number);

  if (!managerIds.length) {
    return chat;
  }

  const rows = managerIds.map((userId) => ({
    ID_Chat: chat.ID,
    ID_NguoiDung: userId,
    VaiTro: 'admin'
  }));

  const { error: memberError } = await supabase
    .from(MEMBER_TABLE)
    .upsert(rows as any, { onConflict: 'ID_Chat,ID_NguoiDung' as any });

  if (memberError) {
    throw new AppError('Failed to add managers to building chat', 500, memberError);
  }

  return chat;
};

export const addResidentToBuildingChat = async (userId: number, buildingId: number) => {
  const chat = await ensureBuildingChatInternal(buildingId);

  const { error } = await supabase
    .from(MEMBER_TABLE)
    .upsert(
      {
        ID_Chat: chat.ID,
        ID_NguoiDung: userId,
        VaiTro: 'member'
      } as any,
      {
        onConflict: 'ID_Chat,ID_NguoiDung' as any
      }
    );

  if (error) {
    throw new AppError('Failed to add resident to building chat', 500, error);
  }
};

export const removeResidentFromBuildingChat = async (userId: number, buildingId: number) => {
  const { data: chat, error: chatError } = await supabase
    .from<Chat>(CHAT_TABLE)
    .select('ID')
    .eq('Loai', 'building')
    .eq('ID_ChungCu', buildingId)
    .maybeSingle();

  if (chatError) {
    throw new AppError('Failed to load building chat for removal', 500, chatError);
  }

  if (!chat) {
    return;
  }

  const { error } = await supabase
    .from(MEMBER_TABLE)
    .delete()
    .eq('ID_Chat', chat.ID)
    .eq('ID_NguoiDung', userId);

  if (error) {
    throw new AppError('Failed to remove resident from building chat', 500, error);
  }
};

export const createOrGetPrivateChat = async (userId: number, targetUserId: number) => {
  if (userId === targetUserId) {
    throw new AppError('Cannot create private chat with yourself', 400);
  }

  const [a, b] = userId < targetUserId ? [userId, targetUserId] : [targetUserId, userId];
  const key = `${a}-${b}`;

  const { data: existing, error: existingError } = await supabase
    .from<Chat>(CHAT_TABLE)
    .select('*')
    .eq('Loai', 'private')
    .eq('PrivateKey', key)
    .maybeSingle();

  if (existingError) {
    throw new AppError('Failed to load private chat', 500, existingError);
  }

  let chat = existing;

  if (!chat) {
    const { data: created, error: createError } = await supabase
      .from<Chat>(CHAT_TABLE)
      .insert({
        Loai: 'private',
        PrivateKey: key
      } as any)
      .select()
      .single();

    if (createError) {
      throw new AppError('Failed to create private chat', 500, createError);
    }

    chat = created;

    const { error: memberError } = await supabase.from(MEMBER_TABLE).insert([
      { ID_Chat: chat.ID, ID_NguoiDung: a, VaiTro: 'member' } as any,
      { ID_Chat: chat.ID, ID_NguoiDung: b, VaiTro: 'member' } as any
    ]);

    if (memberError) {
      throw new AppError('Failed to add members to private chat', 500, memberError);
    }
  }

  return chat;
};

export const listUserChats = async (userId: number) => {
  const loadMemberChatIds = async () => {
    const { data, error } = await supabase
      .from(MEMBER_TABLE)
      .select('ID_Chat')
      .eq('ID_NguoiDung', userId);

    if (error) {
      throw new AppError('Failed to load chat memberships', 500, error);
    }

    return (data ?? []).map((row: any) => row.ID_Chat as number);
  };

  const loadChatsByIds = async (ids: number[]) => {
    if (!ids.length) {
      return [];
    }

    const { data, error } = await supabase
      .from<Chat>(CHAT_TABLE)
      .select('ID, Loai, ID_ChungCu, PrivateKey, CreatedAt')
      .in('ID', ids)
      .order('CreatedAt', { ascending: true });

    if (error) {
      throw new AppError('Failed to load chats', 500, error);
    }

    return data ?? [];
  };

  let chatIds = await loadMemberChatIds();

  const { data: user, error: userError } = await supabase
    .from(USER_TABLE)
    .select('ID, LoaiNguoiDung')
    .eq('ID', userId)
    .maybeSingle();

  if (userError) {
    throw new AppError('Failed to load user for chat bootstrap', 500, userError);
  }

  if (!user) {
    return [];
  }

  // Bootstrap nếu user chưa thuộc phòng nào
  if (!chatIds.length) {
    if (user.LoaiNguoiDung === 'Ban quan ly') {
      const { data: buildings, error: buildingError } = await supabase.from(BUILDING_TABLE).select('ID');

      if (buildingError) {
        throw new AppError('Failed to load buildings for chat bootstrap', 500, buildingError);
      }

      for (const b of buildings ?? []) {
        await ensureBuildingChat((b as any).ID as number);
      }
    } else if (user.LoaiNguoiDung === 'Cu dan') {
      const { data: resident, error: residentError } = await supabase
        .from(RESIDENT_TABLE)
        .select('ID_ChungCu')
        .eq('ID_NguoiDung', userId)
        .maybeSingle();

      if (residentError) {
        throw new AppError('Failed to load resident for chat bootstrap', 500, residentError);
      }

      if (resident?.ID_ChungCu) {
        await addResidentToBuildingChat(userId, resident.ID_ChungCu as number);
      }
    }

    // Reload memberships sau bootstrap
    chatIds = await loadMemberChatIds();
  }

  const chats = await loadChatsByIds(chatIds);

  if (!chats.length) {
    return [];
  }

  // Map tên và avatar chung cư cho các phòng building
  const buildingIds = Array.from(
    new Set(chats.filter((c) => c.Loai === 'building' && c.ID_ChungCu).map((c) => c.ID_ChungCu as number))
  );

  let buildingMap: Record<
    number,
    {
      Ten: string;
      AvatarUrl?: string | null;
    }
  > = {};

  if (buildingIds.length) {
    const [{ data: buildings, error: buildingsError }, { data: images, error: imagesError }] = await Promise.all([
      supabase.from(BUILDING_TABLE).select('ID, Ten').in('ID', buildingIds),
      supabase.from(BUILDING_IMAGE_TABLE).select('ID_ChungCu, DuongDan').in('ID_ChungCu', buildingIds)
    ]);

    if (buildingsError) {
      throw new AppError('Failed to load buildings for chat display', 500, buildingsError);
    }
    if (imagesError) {
      throw new AppError('Failed to load building images for chat display', 500, imagesError);
    }

    const avatarMap: Record<number, string | null> = {};
    (images ?? []).forEach((img: any) => {
      const bId = img.ID_ChungCu as number;
      if (!avatarMap[bId]) {
        avatarMap[bId] = img.DuongDan as string;
      }
    });

    buildingMap = Object.fromEntries(
      (buildings ?? []).map((b: any) => [
        b.ID as number,
        {
          Ten: b.Ten as string,
          AvatarUrl: avatarMap[b.ID as number] ?? null
        }
      ])
    );
  }

  // Lấy tên chung cư mà cư dân đang thuộc (cho private chat)
  let buildingName: string | undefined;

  if (user.LoaiNguoiDung === 'Cu dan') {
    const { data: residentWithBuilding, error: residentBuildingError } = await supabase
      .from(RESIDENT_TABLE)
      .select(
        `
        ID_ChungCu,
        ChungCus (
          Ten
        )
      `
      )
      .eq('ID_NguoiDung', userId)
      .maybeSingle();

    if (residentBuildingError) {
      throw new AppError('Failed to load resident building for chat display', 500, residentBuildingError);
    }

    if (residentWithBuilding?.ChungCus) {
      buildingName = (residentWithBuilding as any).ChungCus.Ten as string;
    }
  }

  return chats.map((chat: any) => {
    if (chat.Loai === 'building') {
      const info = chat.ID_ChungCu ? buildingMap[chat.ID_ChungCu] : undefined;
      return {
        ...chat,
        DisplayName: info?.Ten ?? `Nhóm chung cư #${chat.ID_ChungCu}`,
        AvatarUrl: info?.AvatarUrl ?? null
      };
    }

    return {
      ...chat,
      DisplayName: buildingName ? `${buildingName} - Chat cư dân` : 'Chat cư dân',
      AvatarUrl: null
    };
  });
};

export const listChatMessages = async (chatId: number, limit = 50) => {
  const { data, error } = await supabase
    .from(MESSAGE_TABLE)
    .select(
      `
      ID,
      ID_Chat,
      ID_NguoiGui,
      NoiDung,
      CreatedAt,
      NguoiDungs (
        HoTen,
        HinhAnh
      )
    `
    )
    .eq('ID_Chat', chatId)
    .order('CreatedAt', { ascending: true })
    .limit(limit);

  if (error) {
    throw new AppError('Failed to load messages', 500, error);
  }

  return (data ?? []) as ChatMessage[];
};

export const sendMessage = async (chatId: number, senderId: number, content: string) => {
  const { data: membership, error: memberError } = await supabase
    .from(MEMBER_TABLE)
    .select('ID')
    .eq('ID_Chat', chatId)
    .eq('ID_NguoiDung', senderId)
    .maybeSingle();

  if (memberError) {
    throw new AppError('Failed to verify chat membership', 500, memberError);
  }

  if (!membership) {
    throw new AppError('You are not a member of this chat', 403);
  }

  const { data, error } = await supabase
    .from<ChatMessage>(MESSAGE_TABLE)
    .insert({
      ID_Chat: chatId,
      ID_NguoiGui: senderId,
      NoiDung: content
    } as any)
    .select(
      `
      ID,
      ID_Chat,
      ID_NguoiGui,
      NoiDung,
      CreatedAt,
      NguoiDungs (
        HoTen,
        HinhAnh
      )
    `
    )
    .single();

  if (error) {
    throw new AppError('Failed to send message', 500, error);
  }

  return data;
};

export const listResidentsInSameBuilding = async (userId: number) => {
  const { data: user, error: userError } = await supabase
    .from(USER_TABLE)
    .select('ID, LoaiNguoiDung')
    .eq('ID', userId)
    .maybeSingle();

  if (userError) {
    throw new AppError('Failed to load user for residents list', 500, userError);
  }

  if (!user) {
    return [];
  }

  // Admin: xem được tất cả cư dân ở mọi chung cư
  if (user.LoaiNguoiDung === 'Ban quan ly') {
    const { data, error } = await supabase
      .from(RESIDENT_TABLE)
      .select(
        `
        ID_NguoiDung,
        ID_ChungCu,
        NguoiDungs (
          ID,
          HoTen,
          Email,
          SoDienThoai,
          LoaiNguoiDung,
          HinhAnh
        ),
        CanHos (
          MaCan
        )
      `
      )
      .neq('ID_NguoiDung', userId);

    if (error) {
      throw new AppError('Failed to load all residents', 500, error);
    }

    return data ?? [];
  }

  // Cư dân: chỉ xem cư dân trong cùng chung cư
  const { data: resident, error: residentError } = await supabase
    .from(RESIDENT_TABLE)
    .select('ID_ChungCu')
    .eq('ID_NguoiDung', userId)
    .maybeSingle();

  if (residentError) {
    throw new AppError('Failed to load resident building', 500, residentError);
  }

  if (!resident) {
    return [];
  }

  const { data, error } = await supabase
    .from(RESIDENT_TABLE)
    .select(
      `
      ID_NguoiDung,
      ID_ChungCu,
      NguoiDungs (
        ID,
        HoTen,
        Email,
        SoDienThoai,
        LoaiNguoiDung,
        HinhAnh
      ),
      CanHos (
        MaCan
      )
    `
    )
    .eq('ID_ChungCu', resident.ID_ChungCu)
    .neq('ID_NguoiDung', userId);

  if (error) {
    throw new AppError('Failed to load building residents', 500, error);
  }

  return data ?? [];
};

