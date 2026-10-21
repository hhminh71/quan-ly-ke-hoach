# Dự Án Web App Quản Lý Kế Hoạch

Dự án web application được xây dựng bằng **React (Vite)** và **Tailwind CSS**, cung cấp giao diện hiện đại, tối giản và thân thiện cho doanh nghiệp theo dõi kế hoạch, quản lý thu chi và công tác phí nội bộ.

---

## 🌟 Tính Năng Chính

### 1. Trang Đăng Nhập (Login)
- Giao diện hiện đại (Modern Glassmorphism Card) trên nền tối sang trọng.
- Trường nhập liệu: **Tài khoản / Email** và **Mật khẩu** (có nút bật/tắt hiển thị mật khẩu).
- Nút **"Tự điền"** tài khoản dùng thử tiện lợi:
  - **Tài khoản demo:** `admin@company.vn`
  - **Mật khẩu demo:** `123456`
- Kiểm tra tính hợp lệ (Validation) và hiệu ứng chuyển trạng thái mượt mà.

### 2. Trang Bảng Điều Khiển (Dashboard)
- **Thanh điều hướng (Navbar)**: Hiển thị logo nhận diện, thông tin người dùng đang đăng nhập, nút Đăng xuất.
- **Thẻ thống kê thông minh (Stat Cards)**:
  - Tổng số tiền chi tiêu / thu chi.
  - Tổng số phiếu đã ghi nhận.
  - Giá trị trung bình mỗi phiếu.
  - Số lượng nhân viên tham gia.
- **Biểu mẫu (Form) nhập liệu**:
  - 📅 **Ngày giao dịch (Date)**: Bộ chọn ngày kèm phím tắt chọn nhanh *Hôm nay*.
  - 👤 **Tên nhân viên (Employee Name)**: Ô nhập liệu có gợi ý sẵn danh sách nhân sự phổ biến.
  - 💵 **Số tiền (Amount)**: Định dạng tiền tệ VNĐ trực quan kèm các nút cộng nhanh (+100k, +500k, +1M, +5M).
  - 📝 **Ghi chú (Notes)**: Ô mô tả chi tiết mục đích chi tiêu hoặc công tác.
  - 🏷️ **Phân loại danh mục (Category)**: Chi phí vận hành, công tác phí, tiếp khách, văn phòng phẩm...
- **Bảng danh sách dữ liệu phiếu (Transaction List)**:
  - Xem danh sách giao dịch cập nhật theo thời gian thực (Real-time).
  - Tìm kiếm nhanh theo tên nhân viên hoặc nội dung ghi chú.
  - Lọc theo danh mục và sắp xếp (Mới nhất, Cũ nhất, Số tiền cao/thấp).
  - Nút **Xóa** từng phiếu với thông báo xác nhận an toàn.
  - Nút **Xuất CSV** để tải báo cáo dữ liệu về máy tính (Excel tương thích).
- **Phím chuyển nhanh (Quick Switcher)** ở góc dưới bên phải màn hình để dễ dàng kiểm thử qua lại giữa trang Login và Dashboard.

---

## 🚀 Hướng Dẫn Cài Đặt & Khởi Chạy

### 1. Yêu cầu hệ thống
- **Node.js**: Phiên bản 18+ hoặc 20+ trở lên (Hệ thống đã được thiết lập sẵn phiên bản LTS Node v24).

### 2. Khởi chạy máy chủ phát triển (Development Server)
Mở cửa sổ dòng lệnh tại thư mục dự án và chạy:

```bash
npm run dev
```

Mở trình duyệt tại địa chỉ: [http://localhost:3000](http://localhost:3000)

### 3. Đóng gói cho Production
```bash
npm run build
```

---

## 📁 Cấu Trúc Thư Mục

```text
quan-ly-ke-hoach/
├── src/
│   ├── components/
│   │   ├── Navbar.jsx           # Thanh điều hướng trên cùng
│   │   ├── StatCards.jsx        # 4 thẻ tóm tắt số liệu
│   │   ├── TransactionForm.jsx  # Biểu mẫu nhập liệu (Ngày, Tên, Số tiền, Ghi chú)
│   │   └── TransactionList.jsx  # Bảng danh sách phiếu thu chi & bộ lọc
│   ├── pages/
│   │   ├── LoginPage.jsx        # Trang đăng nhập
│   │   └── DashboardPage.jsx    # Trang bảng điều khiển chính
│   ├── App.jsx                  # Điều hướng & quản lý phiên đăng nhập
│   ├── index.css                # Cấu hình Tailwind CSS & Custom scrollbar
│   └── main.jsx                 # Entry point React
├── index.html                   # HTML Template
├── package.json                 # Cấu hình thư viện phụ thuộc
├── tailwind.config.js           # Cấu hình Tailwind CSS
├── postcss.config.js            # Cấu hình PostCSS
└── vite.config.js               # Cấu hình Vite (Port 3000)
```
