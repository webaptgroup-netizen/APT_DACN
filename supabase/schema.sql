-- APT-CONNECT Supabase schema & seed data
-- Run inside Supabase SQL editor or `supabase db push`.

create extension if not exists citext;

begin;

create table if not exists "ChungCus" (
  "ID" bigserial primary key,
  "Ten" text not null,
  "DiaChi" text not null,
  "ChuDauTu" text,
  "NamXayDung" int,
  "SoTang" int,
  "MoTa" text,
  "CreatedAt" timestamptz not null default now()
);

create table if not exists "HinhAnhChungCus" (
  "ID" bigserial primary key,
  "ID_ChungCu" bigint not null references "ChungCus"("ID") on delete cascade,
  "DuongDan" text not null
);

create table if not exists "CanHos" (
  "ID" bigserial primary key,
  "MaCan" text not null,
  "ID_ChungCu" bigint not null references "ChungCus"("ID") on delete cascade,
  "DienTich" numeric(10,2),
  "SoPhong" int,
  "Gia" numeric(18,2),
  "TrangThai" text not null check ("TrangThai" in ('Dang ban','Da ban','Cho thue','Da thue')),
  "MoTa" text,
  "Model3DUrl" text,
  "URLs" text default '[]',
  "CreatedAt" timestamptz not null default now()
);

create table if not exists "HinhAnhCanHos" (
  "ID" bigserial primary key,
  "ID_CanHo" bigint not null references "CanHos"("ID") on delete cascade,
  "DuongDan" text not null
);

create table if not exists "HinhAnhDichVus" (
  "ID" bigserial primary key,
  "ID_DichVu" bigint not null references "DichVus"("ID") on delete cascade,
  "DuongDan" text not null
);

create table if not exists "NguoiDungs" (
  "ID" bigserial primary key,
  "HoTen" text not null,
  "Email" citext not null unique,
  "MatKhau" text not null,
  "SoDienThoai" text,
  "LoaiNguoiDung" text not null default 'Khach' check ("LoaiNguoiDung" in ('Khach','Cu dan','Ban quan ly')),
  "CreatedAt" timestamptz not null default now()
);

create table if not exists "PasswordResetRequests" (
  "ID" bigserial primary key,
  "ID_NguoiDung" bigint not null references "NguoiDungs"("ID") on delete cascade,
  "Email" citext not null unique,
  "CodeHash" text not null,
  "ExpiresAt" timestamptz not null,
  "FailedAttempts" int not null default 0,
  "LockedUntil" timestamptz,
  "VerifiedAt" timestamptz,
  "ResetTokenHash" text,
  "ResetTokenExpiresAt" timestamptz,
  "ConsumedAt" timestamptz,
  "CreatedAt" timestamptz not null default now()
);

create table if not exists "CuDans" (
  "ID" bigserial primary key,
  "ID_NguoiDung" bigint not null references "NguoiDungs"("ID") on delete cascade,
  "ID_CanHo" bigint not null references "CanHos"("ID") on delete cascade,
  "ID_ChungCu" bigint not null references "ChungCus"("ID") on delete cascade,
  "LaChuHo" boolean not null default false,
  constraint "IX_CanHos_MaCan_ID_ChungCu" unique ("MaCan","ID_ChungCu")
);

-- Allow one user to be linked to multiple apartments/buildings.
-- Some deployments may have a legacy unique constraint on ID_NguoiDung (e.g. UQ_CuDans_User); drop it if present.
alter table "CuDans" drop constraint if exists "UQ_CuDans_User";
-- Also handle the same constraint created without quotes (Postgres folds to lowercase).
alter table "CuDans" drop constraint if exists UQ_CuDans_User;
-- If a legacy unique index exists instead of a constraint, drop it too.
drop index if exists "UQ_CuDans_User";
drop index if exists UQ_CuDans_User;

-- Prevent duplicate mappings for the same user + apartment.
do $$
begin
  alter table "CuDans" add constraint "UQ_CuDans_User_Apartment" unique ("ID_NguoiDung","ID_CanHo");
exception
  when duplicate_object then null;
end $$;

create table if not exists "DichVus" (
  "ID" bigserial primary key,
  "TenDichVu" text not null,
  "MoTa" text,
  "Gia" numeric(18,2) not null,
  "HinhAnh" text,
  "CreatedAt" timestamptz not null default now()
);

create table if not exists "HoaDonDichVus" (
  "ID" bigserial primary key,
  "ID_CanHo" bigint not null references "CanHos"("ID") on delete cascade,
  "ID_ChungCu" bigint not null references "ChungCus"("ID") on delete cascade,
  "SoTien" numeric(18,2) not null,
  "NgayLap" timestamptz not null default now(),
  "TrangThai" text not null default 'Chua thanh toan' check ("TrangThai" in ('Chua thanh toan','Da thanh toan')),
  "NgayThucHien" timestamptz,
  "HinhThucThanhToan" text
);

create table if not exists "HoaDonDichVu_DichVus" (
  "ID" bigserial primary key,
  "ID_HoaDon" bigint not null references "HoaDonDichVus"("ID") on delete cascade,
  "ID_DichVu" bigint not null references "DichVus"("ID") on delete cascade,
  constraint "UQ_HoaDon_DichVu" unique ("ID_HoaDon","ID_DichVu")
);

create table if not exists "PhieuThus" (
  "ID" bigserial primary key,
  "ID_HoaDon" bigint not null references "HoaDonDichVus"("ID") on delete cascade,
  "ID_Admin" bigint not null references "NguoiDungs"("ID") on delete cascade,
  "NgayXuat" timestamptz not null default now(),
  constraint "UQ_PhieuThu_HoaDon" unique ("ID_HoaDon")
);

create table if not exists "TinTucs" (
  "ID" bigserial primary key,
  "TieuDe" text not null,
  "NoiDung" text not null,
  "NgayDang" timestamptz not null default now(),
  "HinhAnh" text
);

create table if not exists "PhanAnhs" (
  "ID" bigserial primary key,
  "ID_NguoiDung" bigint not null references "NguoiDungs"("ID") on delete cascade,
  "NoiDung" text not null,
  "TrangThai" text not null default 'Chua xu ly' check ("TrangThai" in ('Chua xu ly','Dang xu ly','Da xu ly')),
  "NgayGui" timestamptz not null default now(),
  "PhanHoi" text,
  "HinhAnh" text
);

-- Chat & messaging ----------------------------------------------------------

create table if not exists "Chats" (
  "ID" bigserial primary key,
  "Loai" text not null check ("Loai" in ('building','private')),
  "ID_ChungCu" bigint references "ChungCus"("ID") on delete cascade,
  -- PrivateKey dA1m bA�o 1 cA-Bp cA-v dA-n chA� cA3 1 phA2ng chat riA-ng
  "PrivateKey" text unique,
  "CreatedAt" timestamptz not null default now(),
  constraint "CHK_Chat_BuildingOrPrivate"
    check (
      ("Loai" = 'building' and "ID_ChungCu" is not null and "PrivateKey" is null) or
      ("Loai" = 'private' and "ID_ChungCu" is null)
    )
);

create table if not exists "ChatMembers" (
  "ID" bigserial primary key,
  "ID_Chat" bigint not null references "Chats"("ID") on delete cascade,
  "ID_NguoiDung" bigint not null references "NguoiDungs"("ID") on delete cascade,
  "VaiTro" text not null default 'member' check ("VaiTro" in ('member','admin')),
  "JoinedAt" timestamptz not null default now(),
  constraint "UQ_Chat_User" unique ("ID_Chat","ID_NguoiDung")
);

create table if not exists "ChatMessages" (
  "ID" bigserial primary key,
  "ID_Chat" bigint not null references "Chats"("ID") on delete cascade,
  "ID_NguoiGui" bigint not null references "NguoiDungs"("ID") on delete cascade,
  "NoiDung" text not null,
  "CreatedAt" timestamptz not null default now()
);

-- Seed data ---------------------------------------------------------------

insert into "ChungCus" ("Ten","DiaChi","ChuDauTu","NamXayDung","SoTang","MoTa")
values
  ('APT Skyline','123 Đường Hoa Phượng, TP.HCM','PHQ Group',2020,25,'Khu phức hợp cao cấp'),
  ('Sunrise City','58 Nguyễn Hữu Thọ, Quận 7, TP.HCM','Novaland',2018,25,'Tổ hợp thương mại - căn hộ'),
  ('Eco Green Saigon','5 Tân Thuận Tây, Quận 7, TP.HCM','Sài Gòn Nam Long',2020,30,'Phân khu xanh và tiện ích');

-- Ensure deterministic ids for follow-up inserts
with ordered as (
  select "ID","Ten" from "ChungCus"
)
select * from ordered;

insert into "CanHos" ("MaCan","ID_ChungCu","DienTich","SoPhong","Gia","TrangThai","MoTa","URLs")
values
  ('A1-05', (select "ID" from "ChungCus" where "Ten"='APT Skyline'), 75, 3, 2500000000, 'Dang ban',
   'Căn góc hướng Đông, nội thất cao cấp', '["/images/canho/A105-1.jpg","/images/canho/A105-2.jpg"]'),
  ('B2-12', (select "ID" from "ChungCus" where "Ten"='APT Skyline'), 68, 2, 1800000000, 'Cho thue',
   'View hồ bơi, đầy đủ nội thất', '[]'),
  ('S1-09', (select "ID" from "ChungCus" where "Ten"='Sunrise City'), 90, 3, 3200000000, 'Dang ban',
   'Ban công lớn, tầng trung', '["/images/canho/S109.jpg"]');

insert into "NguoiDungs" ("HoTen","Email","MatKhau","SoDienThoai","LoaiNguoiDung")
values
  ('Nguyễn Văn Admin','admin@apt.local','$2b$10$oBHOIVqSFCyXrVqSSH9e8e.xbgw0aQMxg2N03QzMWZYUm9t6WwoGG','0909000000','Ban quan ly'),
  ('Lê Thị Cư Dân','resident@apt.local','$2b$10$QydiocIhAPfF1JVhHRVjGeRQGa8vzSVnKFgsKEQBikop0wFEmyW3S','0909111222','Cu dan');

insert into "CuDans" ("ID_NguoiDung","ID_CanHo","ID_ChungCu","LaChuHo")
values (
  (select "ID" from "NguoiDungs" where "Email"='resident@apt.local'),
  (select "ID" from "CanHos" where "MaCan"='A1-05'),
  (select "ID_ChungCu" from "CanHos" where "MaCan"='A1-05'),
  true
);

insert into "DichVus" ("TenDichVu","MoTa","Gia")
values
  ('Phí gửi xe ô tô','Đăng ký 1 chỗ đậu xe/tháng',1500000),
  ('Vệ sinh căn hộ','Dọn vệ sinh định kỳ mỗi tuần',800000);

insert into "HoaDonDichVus" ("ID_CanHo","ID_ChungCu","SoTien","NgayLap","TrangThai")
values (
  (select "ID" from "CanHos" where "MaCan"='A1-05'),
  (select "ID_ChungCu" from "CanHos" where "MaCan"='A1-05'),
  1500000,
  now(),
  'Chua thanh toan'
);

insert into "HoaDonDichVu_DichVus" ("ID_HoaDon","ID_DichVu")
values (
  (select "ID" from "HoaDonDichVus" order by "ID" desc limit 1),
  (select "ID" from "DichVus" where "TenDichVu"='Phí gửi xe ô tô')
);

insert into "TinTucs" ("TieuDe","NoiDung","HinhAnh")
values
  ('Thông báo bảo trì thang máy','Thang máy tháp A bảo trì ngày 15/03. Quý cư dân vui lòng sử dụng thang B.','/images/news/baotri.jpg'),
  ('Sự kiện cuối tuần','BBQ cộng đồng tại khu vườn tầng 5 lúc 18h ngày 20/03.','/images/news/bbq.jpg');

insert into "PhanAnhs" ("ID_NguoiDung","NoiDung","TrangThai","HinhAnh")
values (
  (select "ID" from "NguoiDungs" where "Email"='resident@apt.local'),
  'Hành lang tầng 5 đang bị hỏng đèn và có mùi khó chịu.',
  'Chua xu ly',
  null
);

commit;
