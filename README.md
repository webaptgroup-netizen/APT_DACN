# APT-CONNECT (PHQ-TECH)

> **2025 update**: Repository nay da kem backend Node.js + Supabase (`src/**/*`) de thay the ASP.NET Core neu ban muon rewrite. Tai lieu goc van duoc giu lai ben duoi.

### Node.js + Supabase rewrite snapshot
- Stack: **Express + TypeScript** tach module (auth, chung cu, can ho, cu dan, dich vu, hoa don, tin tuc, phan anh, chatbot).
- Database: **Supabase Postgres** voi cac bang giu nguyen ten `ChungCus`, `CanHos`, `NguoiDungs`, `CuDans`, `DichVus`, `HoaDonDichVus`, `HoaDonDichVu_DichVus`, `TinTucs`, `PhanAnhs`. Import seed trong phu luc hoac dung file `QLCC.sql`.
- Auth: JWT + bcrypt, role `Khach` -> `Cu dan` -> `Ban quan ly` nhu tai lieu goc.
- Media: Toan bo anh/chung minh duoc day len **Supabase Storage** (bucket `SUPABASE_STORAGE_BUCKET`) qua API `/api/storage/upload`, nhan URL cong khai roi luu vao cac truong `HinhAnh*`, `URLs`, ...
- Front-end: Thu muc `client/` (Vite + React + TypeScript) cung cap giao dien BQL/cư dan, goi cac endpoint Node.js va ho tro upload anh, chatbot, dang ky dich vu, quan ly hoa don...
- Chạy UI mới:
  ```bash
  cd client
  npm install
  npm run dev # http://localhost:5173
  ```
- Webhook/AI: module tin tuc goi POST toi `N8N_WEBHOOK_URL`, chatbot dung OpenAI (`OPENAI_API_KEY`) hoac fallback neu chua cau hinh.
- Cau hinh: tao file `.env` tu `.env.example`, dien Supabase/SMTP/OpenAI -> `npm install` -> `npm run dev`.
- API prefix `/api`: xem `src/routes/index.ts` de biet danh sach route (auth, buildings, apartments, residents, services, invoices, news, complaints, chatbot/ask).

#### Supabase Storage setup
1. Trong Supabase Dashboard -> Storage tao bucket public co ten trung voi bien `SUPABASE_STORAGE_BUCKET`.
2. Backend chi luu **public URL** vao cac truong `HinhAnh*`, `URLs`, ... nen hay upload file truoc qua API:
   ```http
   POST /api/storage/upload
   Authorization: Bearer <token>
   Content-Type: application/json

   {
     "base64": "data:image/png;base64,iVBORw0KGgoAAA...",
     "folder": "buildings",
     "fileName": "mat-tien.png"
   }
   ```
   Response: `{ "path": "buildings/mat-tien-<timestamp>.png", "url": "https://your-project.supabase.co/storage/v1/object/public/..." }`.
3. Khi khong can nua (vd xoa tin tuc), admin co the goi `DELETE /api/storage/file` voi body `{ "path": "<duong-dan>" }` (chi role `Ban quan ly`).


Tài liệu này mô tả toàn bộ chức năng, cấu trúc và các luồng nghiệp vụ của hệ thống **APT-CONNECT** – nền tảng quản lý cư dân & trải nghiệm chung cư được phát triển trên ASP.NET Core. Nội dung nhằm giúp bạn có thể tái triển khai hệ thống bằng ngôn ngữ lập trình khác mà vẫn giữ nguyên hành vi và tích hợp hiện tại.

## Mục lục
1. [Tổng quan & mục tiêu](#1)
2. [Kiến trúc & công nghệ](#2)
3. [Vai trò người dùng](#3)
4. [Chức năng chi tiết theo phân hệ](#4)
5. [Các luồng nghiệp vụ quan trọng](#5)
6. [Mô hình dữ liệu & ràng buộc](#6)
7. [Controller / Endpoint map](#7)
8. [Tích hợp bên thứ ba & cấu hình](#8)
9. [Thư mục & tài nguyên dự án](#9)
10. [Thiết lập & vận hành](#10)
11. [Invariants cần giữ khi rewrite](#11)
12. [Kiểm thử & giám sát gợi ý](#12)
13. [Phụ lục: Seed SQL](#13)

<a id="1"></a>

## 1. Tổng quan & mục tiêu
- **Phạm vi**: Quản lý chung cư, căn hộ, cư dân, dịch vụ tiện ích, hóa đơn, phản ánh và truyền thông nội bộ.
- **Người dùng mục tiêu**:
  - Ban quản lý vận hành toàn bộ hệ thống.
  - Cư dân tương tác (đăng ký dịch vụ, xem hóa đơn, gửi phản ánh...).
  - Khách/khách vãng lai chỉ xem thông tin công khai.
- **Giá trị cốt lõi**:
  1. Minh bạch dữ liệu giữa cư dân và ban quản lý.
  2. Tự động hóa thông báo (email, webhook n8n, chatbot).
  3. Dễ dàng mở rộng sang các ngôn ngữ/khuôn khổ khác nhờ kiến trúc phân lớp (Controller → Repository → DbContext/SQL).

<a id="2"></a>

## 2. Kiến trúc & công nghệ
| Lớp | Công nghệ / Thư viện | Ghi chú |
| --- | --- | --- |
| Web & MVC | ASP.NET Core 9.0, Razor Views, Bootstrap/CSS tùy chỉnh | Cookie Authentication với Claims (`UserId`, `Role`, `Email`). |
| Data access | Entity Framework Core 9 + SQL Server | Migration sẵn, kèm file `QLCC.sql` seed thủ công. |
| Repository layer | Repository pattern cho Chung cư, Căn hộ, Cư dân, Dịch vụ, Tin tức, Hóa đơn, Phản ánh, Người dùng | Giúp tách logic khỏi Controller. |
| Services | `EmailService` (SMTP Gmail), `OpenAIService` (chat GPT), `IHttpClientFactory` cho imgbb/n8n | Weather ViewComponent goi OpenWeather API truc tiep. |
  2. ASP.NET: upload song song len imgbb (API key). Node.js: khong can imgbb vi da co Supabase Storage; co the tiep tuc sync toi he thong ngoai neu muon.
| AI/Chatbot | Google Dialogflow V2 (qua `SessionsClient`), tùy chọn bypass để dùng parser nội bộ; bộ script Node/Python để huấn luyện intents | Chatbot phản hồi JSON qua `POST /api/ChatBot`. |
| Front-end realtime | SignalR `ChatHub` (dùng `OpenAIService`) – hiện ở trạng thái prototype, cần đăng ký DI nếu dùng. |
- Cu dan gui phan anh (Authorize), dinh kem hinh anh file hoac duong dan. Ban ASP.NET luu file tai `wwwroot/uploads/phananh`; ban Node.js upload len Supabase Storage va luu URL trong truong `HinhAnh`.

<a id="3"></a>

## 3. Vai trò người dùng & phân quyền
| Vai trò | Quyền hạn chính | Chi tiết |
| --- | --- | --- |
| **Khách** | Truy cập thông tin công khai | Trang chủ, danh sách chung cư/căn hộ/dịch vụ, tin tức, chatbot (ở chế độ khách). |
| **Cư dân** (`LoaiNguoiDung = "Cu dân"`) | Toàn bộ quyền khách + dữ liệu cá nhân | Xem hóa đơn căn hộ của mình, đăng ký dịch vụ, gửi phản ánh, cập nhật hồ sơ, nhận email thông báo. |
| **Ban quản lý** | Toàn quyền | CRUD tất cả thực thể, duyệt hóa đơn/dịch vụ, xử lý phản ánh, xuất dữ liệu, xem báo cáo chatbot. |
| **Khách mới đăng ký** (`LoaiNguoiDung = "Khách"`) | Tài khoản mặc định sau khi register | Chỉ khi được nâng cấp (SetAdminRole hoặc tạo hồ sơ cư dân) mới có quyền cao hơn. |

> **Phân quyền kỹ thuật**: Dựa trên Claims + `[Authorize]` ở Controller. Một số action (ví dụ PhanAnh/Create, DichVu/RegisterService, HoaDon/Index filter) kiểm tra role thủ công để giới hạn dữ liệu.

<a id="4"></a>

## 4. Chức năng chi tiết theo phân hệ

### 4.1. Quản trị tài khoản & xác thực (`AuthController`, `NguoiDungController`, `ThongTinCaNhanController`)
- Đăng ký (mặc định gán role *Khách*), đăng nhập cookie, đăng xuất.
- Set quyền admin `SetAdminRole(userId)` dành cho BQL.
- Trang hồ sơ cá nhân (`Auth/UserProfile`, `ThongTinCaNhan/Index`) hiển thị thông tin cư dân + căn hộ liên kết.
- Đổi mật khẩu thường, quên mật khẩu (random password + email), đổi mật khẩu sau reset (TempData truyền tạm).
- Email cảnh báo mỗi khi đổi mật khẩu.
- `NguoiDungController` cung cấp CRUD, hạn chế hạ role từ “Ban quản lý” xuống role thấp hơn.

### 4.2. Quản lý toà nhà & căn hộ (`ChungCuController`, `CanHoController`, `Repositories/*`)
- Chung cu: CRUD, dinh kem nhieu anh (`HinhAnhChungCu`). Ban ASP.NET luu file tai `wwwroot/images`, ban Node.js upload len Supabase Storage (`/storage/upload`) va luu public URL.
- Can ho: CRUD + upload nhieu anh (`HinhAnhCanHo`) voi gioi han 5 MB, chi nhan MIME `image/*`. Thuoc tinh `URLs` luu JSON cac public URL (tu Supabase Storage trong ban Node.js).
- Ràng buộc nghiệp vụ:
  - `CanHo.MaCan` unique theo `ID_ChungCu`.
  - `CanHo.TrangThai` chỉ thuộc `{Dang bán, Da bán, Cho thuê, Da thuê}` (check constraint).
  - Xóa căn hộ cascade ảnh.
  - Chung cư cascade căn hộ/ảnh.

### 4.3. Người dùng, cư dân, chủ hộ (`CuDanController`, `ChuHoController`)
- `CuDanController`:
  - Form tạo cư dân với combobox động (Chung cư → Căn hộ via AJAX `/CuDan/GetCanHoByChungCu`).
  - Khi gán cư dân cho `NguoiDung`, tự nâng role từ “Khách” lên “Cư dân”.
  - Xóa cư dân sẽ trả role về “Khách” và từ chối nếu cư dân đang là chủ hộ (`ChuHo`).
  - Endpoints phụ: `/CuDan/GetNguoiDungById`.
- `ChuHoController` quản lý chủ hộ:
  - `GetThongTinCuDan` trả JSON (ID_CanHo, ID_ChungCu) để auto-fill.
  - Đảm bảo mỗi căn hộ chỉ có một chủ hộ (check trước khi thêm).

### 4.4. Dịch vụ & hóa đơn (`DichVuController`, `HoaDonDichVuController`)
- Dịch vụ: CRUD + ảnh (`HinhAnhDichVu`). Các ảnh xóa kèm file vật lý.
- Cư dân đăng ký dịch vụ thông qua AJAX `RegisterService(id)`:
  1. Hệ thống lookup cư dân bằng claim `Email`.
  2. Trả JSON chứa thông tin cư dân + căn hộ + giá dịch vụ để hiển thị form xác nhận.
  3. `ConfirmRegisterService` (POST JSON) tạo `HoaDonDichVu`, map `HoaDonDichVu_DichVu`, gửi email xác nhận chi tiết (tên chung cư, tầng, số phòng...).
- Hóa đơn:
  - `Index` lọc theo role (cư dân chỉ thấy căn hộ mình).
  - `Create` cho phép chọn nhiều dịch vụ và tự tính `SoTien`.
  - `UpdateStatus` và `Duyet` cập nhật trạng thái (`Chua thanh toán` / `Da thanh toán`) qua AJAX.
  - `GetGiaDichVu` trả tổng giá cho danh sách dịch vụ.

### 4.5. Tin tức & truyền thông (`TinTucController`)
- CRUD nội dung + ảnh.
- Quy trình tạo:
  1. ASP.NET: upload anh vao `wwwroot/images`. Node.js: goi `/api/storage/upload` de lay public URL tu Supabase Storage.
  2. ASP.NET: upload song song len imgbb (API key). Node.js: khong can imgbb vi da co Supabase Storage; co the tiep tuc sync toi he thong ngoai neu muon.
  3. Lưu DB (đường dẫn local).
  4. Gửi webhook tới n8n (`appsettings:N8n:WebhookUrl`) để phát hành thông báo realtime (Zalo/Email/Push tuỳ n8n).
- Khi chỉnh sửa/xóa sẽ quản lý lại ảnh cũ.

### 4.6. Quản lý phản ánh (`PhanAnhController`)
- Cu dan gui phan anh (Authorize), dinh kem hinh anh file hoac duong dan. Ban ASP.NET luu file tai `wwwroot/uploads/phananh`; ban Node.js upload len Supabase Storage va luu URL trong truong `HinhAnh`.
- Khi tạo:
  - Tự gắn `ID_NguoiDung` từ claim.
  - Gửi email HTML tới ban quản lý với thông tin cư dân, căn hộ, nội dung.
- Ban quản lý xem, lọc theo trạng thái (`Chưa xử lý`, `Chờ xử lý`, `Hoàn thành`), cập nhật phản hồi.
- Khi phản hồi → gửi email lại cho cư dân với thông tin chi tiết và cập nhật `TrangThai = Hoàn thành`.

### 4.7. Chatbot & trợ lý ảo (`ChatBotController`, `scripts/*`, `ChatBox`, CSS chatbot)
- API: `POST /api/ChatBot` body `{ "message": "..." }`, trả `{ reply, options }`.
- Hỗ trợ 3 chế độ intent:
  1. **General**: menu chung cư/căn hộ/dịch vụ/tin tức.
  2. **Resident-specific**: hóa đơn, phản ánh của chính cư dân (dựa trên claim).
  3. **Admin insights**: tổng cư dân/người dùng/phản ánh.
- Hệ thống có thể:
  - Gọi Dialogflow (`_sessionsClient`) nếu `Dialogflow:Bypass = false`.
  - Hoặc sử dụng parser nội bộ (`ParseIntent`, `_sessionChungCuCache`, `_lastOptions`).
- Scripts chatbot trong `APT/APT/scripts/`:
  - `qlcc_data.json`: snapshot dữ liệu.
  - `generate_qa_pairs.py`: sinh câu hỏi - trả lời từ dữ liệu thật.
  - `import_intents.py`: xóa & import intents vào Dialogflow bằng Google SDK.
  - `server.js`: proxy Node gửi request tới Dialogflow REST (dùng access token tĩnh).
- Front-end chatbot: layout & animation định nghĩa trong `wwwroot/css/site.css`, `Views/ChatBox/Index.cshtml` (nhúng API).

### 4.8. Thành phần phụ trợ khác
- `DataExportController` (API `/api/DataExport`): gom Users, Invoices, Complaints, Services, Residents, ChungCu, CanHo → JSON cho tích hợp ngoài.
- `WeatherViewComponent`: gọi OpenWeather (API key hardcode) để hiển thị thời tiết trên layout.
- `TestEmailController`: endpoint `/TestEmail/SendTestEmail` để kiểm tra cấu hình SMTP.
- `ChatHub` + `OpenAIService`: SignalR hub gửi câu hỏi tới OpenAI ChatCompletion (`gpt-3.5-turbo`). Cần bổ sung cấu hình DI & API key nếu muốn sử dụng thực tế.
- Static assets khác: CSS phong phú (navbar, cards, chatbot widget), JS placeholder (`wwwroot/js/site.js`).

<a id="5"></a>

## 5. Các luồng nghiệp vụ quan trọng
1. **Onboard cư dân**
   - Admin tạo `NguoiDung` (role Khách) → tạo `CuDan` gắn người dùng, căn hộ, chung cư → (tùy chọn) tạo `ChuHo`.
2. **Cư dân đăng ký dịch vụ**
   - Cư dân đăng nhập → xem `DichVu/Index` → `RegisterService` (AJAX) → `ConfirmRegisterService` → tự tạo hóa đơn + email xác nhận.
3. **Quản lý hóa đơn**
   - Admin tạo hóa đơn thủ công hoặc dựa trên service request → cập nhật trạng thái qua `UpdateStatus`/`Duyet`. Cư dân chỉ xem hóa đơn của căn hộ mình.
4. **Xử lý phản ánh**
   - Cư dân gửi phản ánh + ảnh → email tới quản lý → quản lý phản hồi → email trả khách.
5. **Xuất bản tin tức**
  2. ASP.NET: upload song song len imgbb (API key). Node.js: khong can imgbb vi da co Supabase Storage; co the tiep tuc sync toi he thong ngoai neu muon.
6. **Chatbot hỗ trợ**
   - Người dùng mở widget (ChatBox) → gõ câu hỏi → `ChatBotController` đánh giá role + intent → lấy dữ liệu trực tiếp từ DbContext (không cache) → trả reply + gợi ý.

<a id="6"></a>

## 6. Mô hình dữ liệu & ràng buộc
| Thực thể | Thuộc tính chính | Quan hệ / Ràng buộc |
| --- | --- | --- |
| `ChungCu` | `ID`, `Ten`, `DiaChi`, `ChuDauTu`, `NamXayDung`, `SoTang`, `MoTa` | 1-n `CanHo`, 1-n `HinhAnhChungCu`. |
| `CanHo` | `ID`, `MaCan`, `ID_ChungCu`, `DienTich`, `SoPhong`, `Gia`, `TrangThai`, `URLs` | FK → `ChungCu`, 1-n `HinhAnhCanHo`, unique `(MaCan, ID_ChungCu)`, check constraint trạng thái. |
| `NguoiDung` | `ID`, `HoTen`, `Email`, `MatKhau`, `SoDienThoai`, `LoaiNguoiDung` | 1-0..1 `CuDan`. Mật khẩu đang lưu plain text (cần mã hóa khi rewrite). |
| `CuDan` | `ID`, `ID_NguoiDung`, `ID_CanHo`, `ID_ChungCu` | FK tới `NguoiDung`, `CanHo`, `ChungCu` (NoAction trên `ChungCu`). |
| `ChuHo` | `ID`, `ID_CuDan`, `ID_CanHo`, `ID_ChungCu`, `GhiChu` | Không cascade delete; mỗi căn hộ chỉ có 1 chủ hộ (logic ở controller). |
| `DichVu` | `ID`, `TenDichVu`, `MoTa`, `Gia` | 1-n `HinhAnhDichVu`, n-n `HoaDonDichVu` qua `HoaDonDichVu_DichVu`. |
| `HoaDonDichVu` | `ID`, `ID_CanHo`, `ID_ChungCu`, `SoTien`, `NgayLap`, `TrangThai` | FK → `CanHo`, `ChungCu`, 1-n `HoaDonDichVu_DichVu`. TrangThai chỉ `Chua thanh toán`/`Da thanh toán`. |
| `PhanAnh` | `ID`, `ID_NguoiDung`, `NoiDung`, `TrangThai`, `NgayGui`, `PhanHoi`, `HinhAnh` | Enum `TrangThaiPhanAnh` (0-2). |
| `TinTuc` | `ID`, `TieuDe`, `NoiDung`, `NgayDang`, `NgaySuKien`, `HinhAnh` | Có thể liên kết danh sách phản ánh (`DanhSachPhanAnh`) nhưng hiện không dùng. |
| `HinhAnh*` | `DuongDan`, `ID_*` | Lưu đường dẫn tương đối (`/images/...`). |
| `EmailSettings` | `SmtpServer`, `SmtpPort`, `SmtpUser`, `SmtpPass`, `FromAddress`, `FromName` | Bind từ `appsettings.json`. |
| `RegisterServiceRequest` | `DichVuId`, `IdCanHo`, `IdChungCu`, `SoTien` | ViewModel cho AJAX register dịch vụ. |

### 6.1. Chi tiết cài đặt & gợi ý chuyển đổi sang DB khác
- **Khoá chính**: tất cả bảng dùng `int ID IDENTITY(1,1)` trong SQL Server. Khi chuyển sang PostgreSQL/MySQL có thể map sang `SERIAL/BIGSERIAL` hoặc `AUTO_INCREMENT`. EF Core migrations tạo tự động.
- **Chuẩn hóa quan hệ**:
  - FK được khai báo bằng `HasForeignKey` trong `ApplicationDbContext`. Cần giữ nguyên hành vi `OnDelete` (nhiều quan hệ dùng `NoAction` để tránh xóa dây chuyền).
  - Bảng liên kết nhiều-nhiều (`HoaDonDichVu_DichVu`) dùng composite key (`ID_HoaDon`, `ID_DichVu`). Nếu DB mới hỗ trợ bảng trung gian implicit (như EF Core 5+), vẫn nên giữ bảng vật lý để hỗ trợ metadata (giá, chiết khấu... trong tương lai).
- **Kiểu dữ liệu đặc biệt**:
  - `decimal(18,2)` cho `Gia` và `SoTien`. Với MongoDB/NoSQL, nên dùng `decimal128` hoặc lưu integer (VND) để tránh sai số.
  - Enum (`TrangThaiPhanAnh`, `LoaiNguoiDung`, `TrangThai` hóa đơn/căn hộ) đang lưu dạng `nvarchar`. Khi chuyển sang DB khác có thể dùng enum native nhưng vẫn phải đảm bảo các giá trị tương ứng để tương thích ứng dụng và chatbot.
  - `CanHo.URLs` lưu JSON string. Với MySQL/PostgreSQL có thể map sang `JSON` column, nhưng cần cập nhật ORM tương ứng.
- **Ràng buộc & index**:
  - Unique index `IX_CanHos_MaCan_ID_ChungCu`.
  - Check constraint `CK_CanHo_TrangThai`, `CK_NguoiDung_LoaiNguoiDung`, `CK_HoaDonDichVu_TrangThai`, `CK_PhanAnh_TrangThai`. Nếu DB không hỗ trợ check constraint (ví dụ MySQL cũ), phải thay bằng trigger hoặc validation trong ứng dụng.
  - Không dùng `cascade` tại `ChuHo` để tránh lỗi vòng FK; cần đảm bảo DB mới cũng tôn trọng hành vi `ON DELETE NO ACTION`.
- **Seed / migration**:
  - File `QLCC.sql` đóng vai trò seed chuẩn cho SQL Server. Khi chuyển DB khác hãy xuất dữ liệu thông qua `DataExportController` (`/api/DataExport`) rồi import vào hệ mới để tránh lệ thuộc dialect.
  - Migrations của EF Core hỗ trợ `dotnet ef migrations script`. Đối với DB khác, tạo context/ORM tương ứng, sao chép cấu trúc từ bảng trên.
- **Chiến lược porting**:
  1. Trích toàn bộ schema bằng tool như `sqlpackage` hoặc `Script-Migration`.
  2. Map kiểu dữ liệu sang DB đích (ví dụ `nvarchar(max)` → `text`, `datetime2` → `timestamp with time zone`).
  3. Nhập dữ liệu thông qua `BACPAC` hoặc JSON từ `/api/DataExport`.
  4. Cập nhật lớp truy cập dữ liệu (repository/ORM) nhưng giữ nguyên tên bảng, cột để không ảnh hưởng UI/API.

> Tham khảo script SQL đầy đủ tại `APT/QLCC.sql` nếu muốn dựng DB thủ công hoặc làm chuẩn chuyển đổi.

### 6.2. Ví dụ script INSERT mẫu
Đoạn sau minh họa dữ liệu khởi tạo tối thiểu cho các bảng chính (SQL Server). Có thể dùng khi dựng nhanh môi trường mới hoặc chuyển dịch sang DB khác (chỉ cần điều chỉnh syntax INSERT nếu cần).

```sql
-- Chung cư & căn hộ
INSERT INTO ChungCus (Ten, DiaChi, ChuDauTu, NamXayDung, SoTang, MoTa)
VALUES (N'APT Skyline', N'123 Đường Hoa Phượng, TP.HCM', N'PHQ Group', 2020, 25, N'Khu phức hợp cao cấp');

DECLARE @ChungCuId INT = SCOPE_IDENTITY();

INSERT INTO CanHos (MaCan, ID_ChungCu, DienTich, SoPhong, Gia, TrangThai, MoTa, URLs)
VALUES 
(N'A1-05', @ChungCuId, 75, 3, 2500000000, N'Dang bán', N'Căn góc hướng Đông', N'[""/images/canho/A105-1.jpg""]'),
(N'B2-12', @ChungCuId, 68, 2, 1800000000, N'Cho thuê', N'Nội thất đầy đủ', N'[]');

-- Người dùng & cư dân
INSERT INTO NguoiDungs (HoTen, Email, MatKhau, SoDienThoai, LoaiNguoiDung)
VALUES 
(N'Nguyễn Văn Admin', 'admin@apt.local', 'Admin@123', '0909000000', N'Ban quan ly'),
(N'Lê Thị Cư Dân', 'resident@apt.local', 'Resident@123', '0909111222', N'Cu dân');

DECLARE @NguoiDungResident INT = SCOPE_IDENTITY();

INSERT INTO CuDans (ID_NguoiDung, ID_CanHo, ID_ChungCu)
VALUES (@NguoiDungResident, (SELECT TOP 1 ID FROM CanHos WHERE MaCan = N'A1-05'), @ChungCuId);

-- Dịch vụ & hóa đơn mẫu
INSERT INTO DichVus (TenDichVu, MoTa, Gia)
VALUES 
(N'Phí gửi xe ô tô', N'Đăng ký 1 chỗ để xe/tháng', 1500000),
(N'Ve sinh căn hộ', N'Dọn vệ sinh định kỳ mỗi tuần', 800000);

DECLARE @HoaDonId INT;
INSERT INTO HoaDonDichVus (ID_CanHo, ID_ChungCu, SoTien, NgayLap, TrangThai)
VALUES ((SELECT ID FROM CanHos WHERE MaCan = N'A1-05'), @ChungCuId, 1500000, SYSDATETIME(), N'Chua thanh toán');
SET @HoaDonId = SCOPE_IDENTITY();

INSERT INTO HoaDonDichVu_DichVus (ID_HoaDon, ID_DichVu)
VALUES (@HoaDonId, (SELECT ID FROM DichVus WHERE TenDichVu = N'Phí gửi xe ô tô'));

-- Phản ánh & tin tức
INSERT INTO PhanAnhs (ID_NguoiDung, NoiDung, TrangThai, NgayGui, PhanHoi, HinhAnh)
VALUES (@NguoiDungResident, N'Hành lang tầng 5 có đèn hỏng.', 0, SYSDATETIME(), NULL, NULL);

INSERT INTO TinTucs (TieuDe, NoiDung, NgayDang, HinhAnh)
VALUES (N'Thông báo bảo trì thang máy', N'Thang máy tháp A bảo trì ngày 15/03.', SYSDATETIME(), '/images/news/baotri.jpg');
```

> Đây chỉ là ví dụ rút gọn; file `QLCC.sql` chứa đầy đủ INSERT thực tế (bao gồm bảng ảnh, chủ hộ, seed cho chatbot...). Cuối file còn có **"Bộ dữ liệu tham khảo (rút gọn) cho việc migrate"** để bạn copy nhanh sang hệ CSDL khác.

<a id="13"></a>

## Phụ lục: Seed SQL dạng “all-in-one”
Khi chỉ còn `README.md`, hãy dùng đoạn dưới đây để dựng nhanh dữ liệu mẫu. Nội dung được rút gọn nhưng đủ để tái hiện mọi bảng chính; bạn có thể mở rộng thêm dựa trên mô tả trong phần trước.

```sql
---------------------------------------------------------
-- 1) Chung cư & ảnh
---------------------------------------------------------
INSERT INTO ChungCus (Ten, DiaChi, ChuDauTu, NamXayDung, SoTang, MoTa) VALUES
(N'Hoàng Anh Gold House', N'456 Đường Lê Văn Sỹ, Quận 3, TP.HCM', N'Công ty TNHH Đầu Tư BĐS Hoàng Anh', 2021, 20, N'...'),
(N'Sunrise City', N'58 Nguyễn Hữu Thọ, Quận 7, TP.HCM', N'Novaland', 2018, 25, N'...'),
(N'Vinhome Central Park', N'208 Nguyễn Hữu Cảnh, Bình Thạnh, TP.HCM', N'Vingroup', 2017, 45, N'...'),
(N'Eco Green Saigon', N'5 Tôn Thất Thuyết, Quận 7, TP.HCM', N'Sài Gòn Nam Long', 2020, 30, N'...'),
(N'The Vista An Phú', N'628 Nguyễn Hữu Cảnh, Quận 2, TP.HCM', N'CapitaLand', 2014, 30, N'...'),
(N'City Garden', N'59 Ngô Tất Tố, Bình Thạnh, TP.HCM', N'Địa ốc Phú Nhuận', 2014, 17, N'...'),
(N'The Estella', N'88 Song Hành, Quận 2, TP.HCM', N'Kiến Á', 2015, 27, N'...'),
(N'Richstar', N'7 Hòa Bình, Tân Phú, TP.HCM', N'Hưng Thịnh', 2018, 20, N'...'),
(N'Saigon Pearl', N'92 Nguyễn Hữu Cảnh, Bình Thạnh, TP.HCM', N'Saigon Pearl JSC', 2011, 35, N'...'),
(N'The Manor', N'91 Nguyễn Hữu Cảnh, Bình Thạnh, TP.HCM', N'Bitexco', 2006, 22, N'...');

INSERT INTO HinhAnhChungCus (ID_ChungCu, DuongDan) VALUES
(1, N'images/ChungCu/Hoang Anh Gold House.jpg'),
(2, N'images/ChungCu/Sunrise City.jpg'),
...,
(10, N'images/ChungCu/The Manor.jpg');

---------------------------------------------------------
-- 2) Căn hộ & ảnh 3D
---------------------------------------------------------
INSERT INTO CanHos (MaCan, ID_ChungCu, DienTich, SoPhong, Gia, TrangThai, MoTa, URLs) VALUES
(N'010', 1, 140, 3, 4500000000, N'Đang bán', N'Mô tả dài...', N'["https://momento360.com/..."]'),
(N'010', 2, 130, 2, 4200000000, N'Đã bán', N'...', N'[...]'),
...,
(N'003', 10, 100, 2, 3300000000, N'Đang bán', N'...', N'[...]');

INSERT INTO HinhAnhCanHos (DuongDan, ID_CanHo) VALUES
(N'images/CanHo/CanHo10.jpg', 101),
(N'images/CanHo/CanHo10.jpg', 102),
...,
(N'images/CanHo/CanHo10.jpg', 110);

---------------------------------------------------------
-- 3) Người dùng, cư dân, chủ hộ
---------------------------------------------------------
INSERT INTO NguoiDungs (HoTen, Email, MatKhau, SoDienThoai, LoaiNguoiDung) VALUES
(N'Nguyễn Văn Admin', 'admin@apt.local', 'Admin@123', '0909000000', N'Ban quan ly'),
(N'Lê Thị Cư Dân', 'resident@apt.local', 'Resident@123', '0909111222', N'Cu dân');

INSERT INTO CuDans (ID_NguoiDung, ID_CanHo, ID_ChungCu) VALUES
((SELECT ID FROM NguoiDungs WHERE Email='resident@apt.local'),
 (SELECT TOP 1 ID FROM CanHos WHERE MaCan=N'010' AND ID_ChungCu=1), 1);

INSERT INTO ChuHos (ID_CuDan, ID_CanHo, ID_ChungCu, GhiChu) VALUES
((SELECT ID FROM CuDans WHERE ID_NguoiDung=(SELECT ID FROM NguoiDungs WHERE Email='resident@apt.local')),
 (SELECT TOP 1 ID FROM CanHos WHERE MaCan=N'010' AND ID_ChungCu=1), 1, N'Chủ hộ hợp đồng A01/2024');

---------------------------------------------------------
-- 4) Dịch vụ, hình ảnh, hóa đơn
---------------------------------------------------------
INSERT INTO DichVus (TenDichVu, MoTa, Gia) VALUES
(N'Sửa chữa điện nước', N'Xử lý rò rỉ, chập điện...', 200000),
(N'Vệ sinh căn hộ', N'Dọn dẹp định kỳ', 500000),
...,
(N'Lắp đặt nội thất', N'Lắp tủ/kệ/giường...', 400000);

INSERT INTO HinhAnhDichVu (DuongDan, ID_DichVu) VALUES
(N'/images/suanuoc.webp', 1),
(N'/images/vesinh.jpg', 2),
...,
(N'/images/lapdo.jpg', 10);

DECLARE @HoaDon INT;
INSERT INTO HoaDonDichVus (ID_CanHo, ID_ChungCu, SoTien, NgayLap, TrangThai)
VALUES ((SELECT TOP 1 ID FROM CanHos WHERE MaCan=N'010' AND ID_ChungCu=1), 1, 1500000, SYSDATETIME(), N'Chua thanh toán');
SET @HoaDon = SCOPE_IDENTITY();
INSERT INTO HoaDonDichVu_DichVus (ID_HoaDon, ID_DichVu) VALUES (@HoaDon, 1);

---------------------------------------------------------
-- 5) Phản ánh & tin tức
---------------------------------------------------------
INSERT INTO PhanAnhs (ID_NguoiDung, NoiDung, TrangThai, NgayGui, PhanHoi, HinhAnh) VALUES
((SELECT ID FROM NguoiDungs WHERE Email='resident@apt.local'),
 N'Hành lang tầng 5 có đèn hỏng.', 0, SYSDATETIME(), NULL, NULL);

INSERT INTO TinTucs (TieuDe, NoiDung, NgayDang, HinhAnh) VALUES
(N'Thông báo bảo trì thang máy', N'Thang máy tháp A bảo trì ngày 15/03.', SYSDATETIME(), '/images/news/baotri.jpg');
```

- Dấu `...` đại diện cho phần mô tả dài giống `QLCC.sql`; bạn có thể điền đầy đủ nếu cần bản hoàn chỉnh.
- Khi port sang PostgreSQL/MySQL: thay `nvarchar` → `varchar`, `SYSDATETIME()` → `CURRENT_TIMESTAMP`, `SCOPE_IDENTITY()` → `LASTVAL()`/`LAST_INSERT_ID()`.
- Các bảng khác (EmailSettings, Dialogflow, scripts) không cần seed – chỉ cần cấu hình appsettings tương ứng.

<a id="7"></a>

## 7. Controller / Endpoint map (tóm tắt)
| Controller | Tuyến chính | Mô tả |
| --- | --- | --- |
| `HomeController` | `/`, `/Home/Privacy` | Landing page. |
| `AuthController` | `/Auth/Register`, `/Auth/Login`, `/Auth/UserProfile`, `/Auth/ForgotPassword`, `/Auth/ChangePassword*`, `/Auth/SetAdminRole` | Auth & profile. |
| `NguoiDungController` | `/NguoiDung/*` | CRUD người dùng, đổi mật khẩu với email cảnh báo. |
| `ChungCuController` | `/ChungCu/*` | CRUD chung cư + ảnh. |
| `CanHoController` | `/CanHo/*` | CRUD căn hộ, upload/xóa ảnh. |
| `ChuHoController` | `/ChuHo/*`, `/ChuHo/GetThongTinCuDan` | Quản lý chủ hộ. |
| `CuDanController` | `/CuDan/*`, `/CuDan/GetCanHoByChungCu`, `/CuDan/GetNguoiDungById` | Quản lý cư dân, AJAX hỗ trợ form. |
| `DichVuController` | `/DichVu/*`, `/DichVu/RegisterService`, `/DichVu/ConfirmRegisterService`, `/DichVu/DeleteConfirmed` | Dịch vụ & đăng ký. |
| `HoaDonDichVuController` | `/HoaDonDichVu/*`, `/HoaDonDichVu/GetCanHoByChungCu`, `/HoaDonDichVu/GetGiaDichVu`, `/HoaDonDichVu/UpdateStatus`, `/HoaDonDichVu/Duyet` | Quản lý hóa đơn, AJAX update. |
| `PhanAnhController` | `/PhanAnh/*` | Gửi/phản hồi phản ánh, email thông báo. |
| `TinTucController` | `/TinTuc/*` | Tin tức + webhook. |
| `ThongTinCaNhanController` | `/ThongTinCaNhan/Index` | View nhanh info cá nhân. |
| `ChatBotController` | `POST /api/ChatBot` | Xử lý chat. |
| `DataExportController` | `GET /api/DataExport` | Xuất JSON tổng hợp. |
| `ChatBox` | `/ChatBox/Index` | UI chatbot. |
| `TestEmail` | `/TestEmail/SendTestEmail` | Test SMTP. |

<a id="8"></a>

## 8. Tích hợp bên thứ ba & cấu hình
| Tích hợp | File cấu hình / vị trí | Ghi chú |
| --- | --- | --- |
| **SQL Server** | `appsettings.json:ConnectionStrings:DefaultConnection` | Enable `MultipleActiveResultSets`, `Encrypt=False`. |
| **SMTP (Gmail)** | `EmailSettings` (appsettings) | Dùng App Password (`SmtpPass`). Tất cả email (quên mật khẩu, đăng ký dịch vụ, phản ánh) gọi `EmailService`. |
| **Dialogflow** | `appsettings:Dialogflow` (`ProjectId`, `JsonCredentialsPath`, `Bypass`) + file service account (`apartmentchatbot-458712-*.json`) | Nếu `Bypass=true` sẽ dùng parser nội bộ. |
| **OpenWeather** | Hardcode trong `ViewComponents/WeatherViewComponent.cs` (`api.openweathermap.org`, key `96e280...`) | Nên đưa vào cấu hình khi rewrite. |
  2. ASP.NET: upload song song len imgbb (API key). Node.js: khong can imgbb vi da co Supabase Storage; co the tiep tuc sync toi he thong ngoai neu muon.
| **n8n webhook** | `appsettings:N8n:WebhookUrl` (ví dụ `https://n8n.vtcmobile.vn/...`). |
| **OpenAI** | `OpenAIService` yêu cầu API key khi khởi tạo (chưa được inject). |
| **Node server (Dialogflow proxy)** | `scripts/server.js`, chạy bằng `npm start`. |
| **Python tooling** | `scripts/generate_qa_pairs.py`, `import_intents.py` dùng `google.cloud.dialogflow`. Yêu cầu biến môi trường `GOOGLE_APPLICATION_CREDENTIALS`. |

> Khi rewrite, chuẩn hóa việc quản lý secrets (User Secrets, Vault...) thay vì hardcode.

<a id="9"></a>

## 9. Thư mục & tài nguyên
```
PHQ-TECH/
├─ PHQ-TECH.sln
├─ README.md
└─ APT/
   ├─ APT.sln
   └─ APT/
      ├─ APT.csproj
      ├─ Program.cs / appsettings*.json
      ├─ Controllers/
      ├─ Models/
      ├─ Data/ApplicationDbContext.cs
      ├─ Repositories/ (kèm Interfaces/)
      ├─ Services/ (EmailService, OpenAIService)
      ├─ ViewComponents/WeatherViewComponent.cs
      ├─ View*/ (Razor views)
      ├─ wwwroot/
      │   ├─ css/site.css
      │   ├─ js/site.js
      │   ├─ images/, uploads/phananh/
      │   └─ lib/ (Bootstrap, jQuery…)
      ├─ scripts/ (Dialogflow tooling, node_modules, qa_pairs.json…)
      ├─ QLCC.sql
      └─ Migrations/
```

<a id="10"></a>

## 10. Thiết lập & vận hành
1. **Yêu cầu môi trường**
   - .NET SDK 9.0, Node.js 20+, Python 3.10+, SQL Server 2019+, Git.
  2. ASP.NET: upload song song len imgbb (API key). Node.js: khong can imgbb vi da co Supabase Storage; co the tiep tuc sync toi he thong ngoai neu muon.
2. **Cấu hình**
   - Sao chép `appsettings.json` và cập nhật ConnectionString, EmailSettings, Dialogflow, N8n.
   - Đảm bảo file service account `apartmentchatbot-458712-*.json` đúng đường dẫn (`scripts/...`).
3. **Database**
   - Chạy `dotnet ef database update` (hoặc chạy script `QLCC.sql`).
4. **Chạy ứng dụng**
   ```bash
   dotnet restore
   dotnet build
   dotnet run
   ```
   - Ứng dụng mặc định chạy HTTPS (Kestrel). Cookie auth dùng `/Auth/Login`.
5. **Thiết lập chatbot (tùy chọn)**
   - `cd APT/APT/scripts`
   - Chạy `python generate_qa_pairs.py` → `python import_intents.py`.
   - Hoặc chạy proxy node: `npm install` (nếu chưa) → `npm start`.
6. **Kiểm tra email**
   - Gọi `/TestEmail/SendTestEmail` để xác minh SMTP.

<a id="11"></a>

## 11. Invariants cần giữ khi rewrite
- **Phân quyền & Claims**: mọi controller phụ thuộc vào claim `UserId`, `Role`, `Email`. Khi triển khai ngôn ngữ khác cần tái tạo logic cookie/ token tương đương.
- **Ràng buộc dữ liệu**:
  - Duy nhất `MaCan` theo `ChungCu`.
  - Enum `LoaiNguoiDung`, `TrangThaiPhanAnh`, `TrangThai HoaDon`.
  - Một căn hộ chỉ có một `ChuHo`.
  - Cư dân bị xóa phải hạ role người dùng xuống “Khách”.
- **Luồng email**: Quên mật khẩu, đổi mật khẩu, đăng ký dịch vụ, phản ánh (cả hai chiều) – đều gửi HTML theo template. Đảm bảo không mất thông báo này.
  1. ASP.NET: upload anh vao `wwwroot/images`. Node.js: goi `/api/storage/upload` de lay public URL tu Supabase Storage.
- **Chatbot**: Phải giữ được ba nhóm intent (General / Resident / Admin) và cơ chế gợi ý `options`. Dù dùng công nghệ khác, vẫn cần caching tên chung cư theo session để trả lời câu “chung cư này”.
- **Webhook & tích hợp**: Tin tức cần tiếp tục bắn webhook; chatbot scripts cần được hỗ trợ (hoặc thay thế tương đương).
- **Logging**: Hệ thống dựa nhiều vào `ILogger`. Khi chuyển ngôn ngữ khác nên tiếp tục log intents, lỗi email, Parser... để dễ vận hành.

<a id="12"></a>

## 12. Kiểm thử & giám sát gợi ý
- **Unit/Integration**: 
  - Repository tests với InMemory DB.
  - Controller tests cho các endpoint AJAX (`RegisterService`, `UpdateStatus`, `GetCanHoByChungCu`...).
- **Manual checklist**:
  - Đăng nhập bằng 3 vai trò và xác nhận menu/ dữ liệu khác nhau.
  - Upload ảnh (chung cư, căn hộ, dịch vụ) → kiểm tra file vật lý.
  - Quy trình phản ánh: tạo → email quản lý → phản hồi → email cư dân.
  - Đăng ký dịch vụ → kiểm tra hóa đơn + email.
  2. ASP.NET: upload song song len imgbb (API key). Node.js: khong can imgbb vi da co Supabase Storage; co the tiep tuc sync toi he thong ngoai neu muon.
  - Chatbot: thử câu hỏi thuộc cả 3 nhóm, kiểm tra `options`.
- **Giám sát**:
  - Sử dụng Console logger mặc định hoặc kết nối Application Insights/ELK.
  - SMTP & Dialogflow lỗi cần được alert (hiện log ra console).

---

Tài liệu này phản ánh trạng thái mã nguồn trong thư mục `APT/APT`. Khi tái hiện bằng ngôn ngữ khác, hãy bám sát các mô-đun và luồng nghiệp vụ ở trên để không làm mất chức năng hay tích hợp hiện hữu. Chúc bạn triển khai thành công!
