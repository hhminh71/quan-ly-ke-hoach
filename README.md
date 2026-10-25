# Dự Án Web App Quản Lý Kế Hoạch & Chi Phí Doanh Nghiệp

Dự án web application được xây dựng bằng **React (Vite)** và **Tailwind CSS**, cung cấp giao diện hiện đại, tối giản và chuyên nghiệp cho doanh nghiệp theo dõi kế hoạch định mức ngân sách, quản lý phát sinh chi tiêu thực tế và đối soát số liệu.

Dữ liệu được chuẩn hóa và chuyển đổi hoàn toàn từ file bảng tính nghiệp vụ `TONG-HOP-KE-HOACH.xlsx` (88 sheets) thành cơ sở dữ liệu quan hệ tinh gọn cho Web App.

---

## 🌟 Tính Năng Nổi Bật

### 1. Quản Lý Ngân Sách Định Mức (76 Khoản Mục)
- Bảng tổng hợp kế hoạch theo dõi các mã tài khoản kế toán (`62721`, `62762101`, `62762209`, `627701`, `6412`...).
- Theo dõi: **Số tiền được duyệt**, **Đã thực hiện thực tế**, **Còn lại** và **Tỷ lệ % giải ngân**.
- Thanh tiến độ màu động:
  - 🟢 **An toàn:** Giải ngân < 80%.
  - 🟡 **Cảnh báo (Gần hết):** Giải ngân từ 80% - 100%.
  - 🔴 **Vượt định mức:** Giải ngân vượt quá 100%.

### 2. Sổ Cái Chi Tiết (1.216 Phiếu Chi Thực Tế)
- Danh sách 1.216 giao dịch phát sinh thực tế bóc tách từ các sheet tài khoản.
- Tìm kiếm tức thì theo: Tên cán bộ/kỹ sư, Mã tài khoản (627...), Nội dung công việc.
- Bộ lọc theo từng mã tài khoản và sắp xếp linh hoạt.
- Phân trang mượt mà (25 dòng/trang) giúp tải nhanh chóng không bị đơ giật.

### 3. Biểu Mẫu Ghi Nhận Phiếu Chi & Cảnh Báo Vượt Định Mức
- Chọn mã khoản mục kế hoạch kèm hiển thị số dư ngân sách còn lại theo thời gian thực.
- Tự động hiển thị **Cảnh báo màu vàng** nếu số tiền nhập vào vượt quá số dư còn lại của hạng mục đó.
- Danh sách gợi ý hơn 110 nhân sự/kỹ sư phụ trách từ dữ liệu thực tế.
- Các nút cộng nhanh tiền tệ (+500k, +2M, +5M, +10M) và định dạng VNĐ trực quan.

### 4. Báo Cáo & Xuất Dữ Liệu
- Nút **Xuất Excel/CSV** hỗ trợ bảng mã tiếng Việt UTF-8 BOM chuẩn cho Excel.
- 4 Thẻ thống kê tài chính thông minh: Tổng ngân sách duyệt, Đã thực hiện, Ngân sách còn lại, Số lượng nhân sự tham gia.
- Nút **Nạp lại gốc** để khôi phục nhanh về trạng thái ban đầu khi cần kiểm thử.

---

## 📁 Cấu Trúc Thư Mục

```text
quan-ly-ke-hoach/
├── src/
│   ├── components/
│   │   ├── Navbar.jsx           # Thanh điều hướng trên cùng
│   │   ├── StatCards.jsx        # 4 thẻ tóm tắt ngân sách & tỷ lệ giải ngân
│   │   ├── BudgetOverview.jsx   # Bảng theo dõi 76 khoản mục kế hoạch định mức
│   │   ├── TransactionForm.jsx  # Biểu mẫu nhập phiếu chi & cảnh báo ngân sách
│   │   └── TransactionList.jsx  # Sổ cái 1.216 phiếu chi, phân trang, tìm kiếm
│   ├── data/
│   │   ├── budgets.json         # 76 khoản mục kế hoạch từ sheet TỔNG HỢP
│   │   ├── transactions.json    # 1.216 phiếu chi thực tế trích xuất từ 85 sheet
│   │   └── employees.json       # Danh sách 112 nhân sự / kỹ sư phụ trách
│   ├── pages/
│   │   ├── LoginPage.jsx        # Màn hình đăng nhập
│   │   └── DashboardPage.jsx    # Bảng điều khiển quản lý trung tâm
│   ├── App.jsx                  # Điều hướng & quản lý phiên người dùng
│   ├── index.css
│   └── main.jsx
├── TONG-HOP-KE-HOACH.xlsx       # File bảng tính gốc 88 sheets
├── index.html
├── package.json
└── vite.config.js
```

---

## 🚀 Khởi Chạy

```bash
# Khởi chạy môi trường phát triển
npm run dev

# Đóng gói sản phẩm
npm run build
```
Mở trình duyệt tại [http://localhost:3000](http://localhost:3000)
Tài khoản demo: `admin@company.vn` / `123456`
