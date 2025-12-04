export type UserRole = 'Khach' | 'Cu dan' | 'Ban quan ly';
export interface AuthUser {
    id: number;
    hoTen: string;
    email: string;
    role: UserRole;
    soDienThoai?: string;
    hinhAnh?: string;
}
export interface Building {
    ID: number;
    Ten: string;
    DiaChi: string;
    ChuDauTu?: string;
    NamXayDung?: number;
    SoTang?: number;
    MoTa?: string;
    URLs?: string[];
}
export interface Apartment {
    ID: number;
    MaCan: string;
    ID_ChungCu: number;
    DienTich?: number;
    SoPhong?: number;
    Gia?: number;
    TrangThai: string;
    MoTa?: string;
    Model3DUrl?: string;
    URLs?: string[];
}
export interface Service {
    ID: number;
    TenDichVu: string;
    MoTa?: string;
    Gia: number;
    HinhAnh?: string;
}
export interface Invoice {
    ID: number;
    ID_CanHo: number;
    ID_ChungCu: number;
    SoTien: number;
    NgayLap: string;
    NgayThucHien?: string;
    TrangThai: 'Chua thanh toan' | 'Da thanh toan';
    CanHos?: {
        MaCan: string;
    };
    ChungCus?: {
        Ten: string;
    };
    HoaDonDichVu_DichVus?: {
        DichVus: Service;
    }[];
}
export interface News {
    ID: number;
    TieuDe: string;
    NoiDung: string;
    NgayDang: string;
    HinhAnh?: string;
}
export interface Complaint {
    ID: number;
    NoiDung: string;
    TrangThai: 'Chua xu ly' | 'Dang xu ly' | 'Da xu ly';
    NgayGui: string;
    PhanHoi?: string;
    HinhAnh?: string;
    NguoiDungs?: {
        HoTen: string;
        Email: string;
    };
}
export interface Resident {
    ID: number;
    ID_NguoiDung: number;
    ID_CanHo: number;
    ID_ChungCu: number;
    LaChuHo: boolean;
    NguoiDungs?: {
        HoTen: string;
        Email: string;
        SoDienThoai?: string;
        LoaiNguoiDung: UserRole;
    };
    CanHos?: {
        MaCan: string;
        TrangThai?: string;
    };
}
export interface UserSummary {
    ID: number;
    HoTen: string;
    Email: string;
    SoDienThoai?: string;
    HinhAnh?: string;
    LoaiNguoiDung: UserRole;
}
//# sourceMappingURL=index.d.ts.map