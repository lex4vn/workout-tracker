# Prompt Yêu Cầu Tạo Ứng Dụng Flutter: 100-Day Workout Tracker

**Đóng vai (Role):** Bạn là một chuyên gia lập trình Flutter (Senior Flutter Developer) có nhiều kinh nghiệm trong thiết kế UI/UX hiện đại và kiến trúc ứng dụng (State Management, Local Storage).

**Mục tiêu (Goal):** Viết mã nguồn Flutter cho một ứng dụng theo dõi tập luyện "Thử Thách 100 Ngày" (100-Day Workout Tracker). Ứng dụng này được chuyển đổi từ một bản PWA thuần HTML/CSS/JS sang nền tảng di động đa nền tảng bằng Flutter.

---

## 1. Thiết Kế (UI/UX Design)
- **Chủ đề (Theme):** Dark Mode (Nền đen/tối).
- **Phong cách (Style):** Glassmorphism (Kính mờ) với các viền mờ ảo, kết hợp hiệu ứng Glow (phát sáng) ở viền các thẻ card và các nút nhấn.
- **Màu sắc chủ đạo (Color Palette):**
  - Background: Đen thẫm (`#07080c` đến `#0d0f17`).
  - Card/Bảng điều khiển: Đen hơi xanh (`#161929` với độ trong suốt 0.65) và blur mờ.
  - Điểm nhấn (Accents): Neon Mint (`#00f5a0`), Electric Blue (`#00d9f5`), Indigo (`#7b2ff7`), Coral (`#ff5e62`).
- **Typography:** Sử dụng Font `Outfit` cho các tiêu đề/số liệu lớn và `Inter` cho nội dung văn bản.
- **Điều hướng (Navigation):** Dùng `BottomNavigationBar` với 3 tab chính: Lịch trình, Thống kê, Cài đặt.

## 2. Kiến Trúc (Architecture)
- **State Management:** Sử dụng `Provider` (hoặc `Riverpod`) để quản lý các trạng thái toàn cục (dữ liệu tập luyện, chuỗi ngày streak, cấu hình, cài đặt).
- **Local Storage:** 
  - `shared_preferences` để lưu các cấu hình nhỏ gọn (Tên mục tiêu, Ngày bắt đầu, Mã PIN, Trạng thái khoá).
  - `hive` (hoặc `sqflite`) để lưu cơ sở dữ liệu lịch sử tập luyện hàng ngày (cờ hoàn thành, thời gian tập, nhóm cơ, ghi chú).

## 3. Các Tính Năng Cốt Lõi (Core Features)

### A. Màn hình bảo mật (PIN Lock Screen)
- Đóng vai trò làm màn hình đầu tiên (Initial Route) mỗi khi mở ứng dụng.
- Đọc config xem người dùng có kích hoạt mã PIN không. Nếu có, hiển thị bàn phím số (Grid) và 4 dấu chấm để nhập PIN.
- Có hiệu ứng rung (shake animation) và viền đỏ nếu nhập sai.
- **Tính năng bảo mật (Anti-bruteforce):** Nếu nhập sai 3 lần liên tiếp, khoá màn hình và vô hiệu hoá bàn phím số trong đúng 24 giờ. Hiển thị thông báo thời gian mở khoá.

### B. Tab 1: Lịch trình (Dashboard & 100-Day Grid)
- **Header:** Hiển thị thông tin tổng quan bằng các Widget bắt mắt:
  - Tỉ lệ hoàn thành (sử dụng Radial Progress Indicator hình tròn có gradient).
  - Chuỗi ngày hiện tại (Current Streak) & Chuỗi kỷ lục (Longest Streak).
  - Tổng thời gian đã tập (phút).
- **Nội dung:** Một `GridView.builder` hiển thị lưới 100 ô vuông tương ứng với 100 ngày (hoặc theo cấu hình mục tiêu).
  - Các trạng thái ô: "Tương lai" (mờ ảo), "Hôm nay" (viền chớp nháy highlight), "Đã tập" (đổ màu Gradient), "Bỏ lỡ" (màu đỏ mờ).
- Khi người dùng chạm (Tap) vào một ô, sẽ bật lên một `ModalBottomSheet` để ghi nhận ngày tập đó.

### C. Ghi nhận tập luyện (Log Bottom Sheet)
- Một modal trượt từ dưới lên chứa biểu mẫu:
  - Switch/Checkbox: Đánh dấu đã hoàn thành buổi tập.
  - Slider: Thanh trượt thời gian tập (từ 1 đến 90 phút).
  - Chips (Lựa chọn nhiều): Chọn các nhóm cơ đã tập (Bụng trên, Bụng dưới, Cơ liên sườn, Toàn thân, ...).
  - TextField: Text box đa dòng để nhập ghi chú (Notes).

### D. Tab 2: Thống Kê (Stats View)
- Dùng thư viện (như `fl_chart`) vẽ biểu đồ cột (Bar Chart) thể hiện thời gian tập của 7 ngày gần nhất.
- Một danh sách (List/Row) phân bổ các nhóm cơ đã tập (để biết tập nhóm cơ nào nhiều nhất).
- Một feed cuộn dọc hiển thị lại lịch sử toàn bộ các ngày đã log.

### E. Tab 3: Cài đặt (Settings View)
- Form cài đặt thông tin: Tên thử thách, Số ngày mục tiêu (mặc định 100), Ngày bắt đầu.
- Cài đặt Mã PIN (TextField định dạng số). Để trống là tắt mã PIN.
- Nút Xóa toàn bộ dữ liệu (cần có Dialog xác nhận).
- (Tùy chọn) Nút Export/Import dữ liệu dạng chuỗi JSON.

---

## 4. Yêu Cầu Đầu Ra (Output Requirements)
- Cấu trúc thư mục (Folder structure) theo chuẩn MVC hoặc MVVM: `models/`, `screens/`, `widgets/`, `providers/`, `utils/`.
- Cung cấp mã nguồn chi tiết cho tệp `main.dart` và hướng dẫn cài đặt các gói dependencies (trong `pubspec.yaml`).
- Mã nguồn phải sạch sẽ (Clean Code), tách widget hợp lý để không bị trùng lặp, và phải có comment đầy đủ bằng tiếng Việt ở những khối logic quan trọng.
- Khi áp dụng thư viện ngoài, ưu tiên sử dụng các package phổ biến trên `pub.dev`.
