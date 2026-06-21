# Hướng Dẫn Triển Khai Lên GitHub Pages

Dưới đây là chi tiết các bước đã thực hiện để đưa dự án **100-Day Workout Tracker** lên GitHub Pages.

## 1. Khởi tạo Git và lưu (Commit) cục bộ
Ban đầu dự án chưa được quản lý bằng Git. Các lệnh sau đã được chạy ở máy tính của bạn:

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
```

## 2. Tạo kho lưu trữ (Repository) trên GitHub
Thay vì lên web tạo thủ công, chúng ta đã dùng GitHub API cùng với mã Token (Personal Access Token) bạn cung cấp để tạo repo tự động:

```bash
curl -X POST -H "Authorization: token <YOUR_GITHUB_TOKEN>" \
     -H "Accept: application/vnd.github.v3+json" \
     -d '{"name":"workout-tracker", "private":false, "description":"100-Day Workout Tracker"}' \
     https://api.github.com/user/repos
```
*Kết quả:* Tạo thành công kho lưu trữ Public tại địa chỉ `https://github.com/lex4vn/workout-tracker`.

## 3. Đẩy code lên GitHub (Push)
Sau khi repo đã tồn tại, chúng ta thiết lập đường dẫn từ máy lên GitHub và đẩy (push) code:

```bash
git remote add origin https://lex4vn:<YOUR_GITHUB_TOKEN>@github.com/lex4vn/workout-tracker.git
git push -u origin main
```
*Kết quả:* Toàn bộ code đã nằm trên nhánh `main` của repo trên GitHub.

## 4. Kích hoạt GitHub Pages
Cuối cùng, chúng ta lại gọi GitHub API để tự động bật tính năng GitHub Pages trỏ vào nhánh `main`:

```bash
curl -X POST -H "Authorization: token <YOUR_GITHUB_TOKEN>" \
     -H "Accept: application/vnd.github.v3+json" \
     -d '{"source":{"branch":"main","path":"/"}}' \
     https://api.github.com/repos/lex4vn/workout-tracker/pages
```

## 🎉 Kết Quả

Dự án PWA của bạn hiện đã được đưa lên mạng hoàn tất! 

- **Đường link trang web:** [https://lex4vn.github.io/workout-tracker/](https://lex4vn.github.io/workout-tracker/)
- **Đường link mã nguồn:** [https://github.com/lex4vn/workout-tracker](https://github.com/lex4vn/workout-tracker)

*(Lưu ý: Bạn có thể cần đợi từ 1-3 phút sau khi kích hoạt thì đường link web mới bắt đầu hoạt động).*

Để cài đặt lên điện thoại Android, bạn chỉ việc lấy điện thoại truy cập vào link web ở trên bằng Chrome, sau đó chọn **"Thêm vào màn hình chính" (Add to Home screen)** hoặc **"Cài đặt ứng dụng" (Install app)**.
