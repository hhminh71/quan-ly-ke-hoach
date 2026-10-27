"""
=============================================================================
KỊCH BẢN TỰ ĐỘNG HÓA XUẤT BÁO CÁO BRAVO 10 VÀO GOOGLE DRIVE
Cảng Hàng không Quốc tế Cần Thơ - Phòng Tài chính Kế hoạch
=============================================================================
"""

import os
import sys
import time
import glob
from datetime import datetime

# Cố gắng import pyautogui, nếu chưa có thì báo lỗi rõ ràng
try:
    import pyautogui
except ImportError:
    print("\n[LỖI] Chưa cài đặt thư viện pyautogui.")
    print("Vui lòng chạy lệnh: pip install pyautogui pygetwindow\n")
    sys.exit(1)

# Thiết lập an toàn cho PyAutoGUI: di chuột vào góc màn hình sẽ dừng khẩn cấp nếu cần
pyautogui.FAILSAFE = True
pyautogui.PAUSE = 0.5

# Cấu hình niên độ và đường dẫn lưu file
CURRENT_YEAR = datetime.now().year
PROJECT_DIR = r"I:\My Drive\APP\Projects\quan-ly-ke-hoach"
OUTPUT_DIR = os.path.join(PROJECT_DIR, "BRAVO Daily")
OUTPUT_FILE = f"Báo cáo thực hiện chi phí {CURRENT_YEAR}.xlsx"
FULL_SAVE_PATH = os.path.join(OUTPUT_DIR, OUTPUT_FILE)

# Cấu hình tài khoản đăng nhập Bravo 10
BRAVO_USER = "vca"
BRAVO_PASS = "vca123"
BRAVO_UNIT = "A08"

def log(step, msg):
    now = datetime.now().strftime("%H:%M:%S")
    print(f"[{now}] [{step}] {msg}")

def find_bravo_shortcut():
    """Tìm shortcut Bravo 10 trên Desktop hoặc thư mục APP"""
    candidates = [
        os.path.expanduser(r"~\Desktop\APP\Bravo10.exe - Shortcut.lnk"),
        os.path.expanduser(r"~\Desktop\APP\Bravo10*.lnk"),
        os.path.expanduser(r"~\Desktop\Bravo10*.lnk"),
        r"C:\Users\Admin\Desktop\APP\Bravo10.exe - Shortcut.lnk",
        r"C:\Users\Admin\Desktop\APP\Bravo10*.lnk",
        r"D:\APP\Bravo10.exe",
    ]
    for pattern in candidates:
        matches = glob.glob(pattern)
        if matches:
            return matches[0]
    return None

def countdown(seconds):
    for i in range(seconds, 0, -1):
        print(f"--> Chuẩn bị chạy tự động sau {i} giây... (Vui lòng thả tay khỏi chuột)", end="\r")
        time.sleep(1)
    print("\n")

def run():
    print("=====================================================================")
    print("       HỆ THỐNG TỰ ĐỘNG XUẤT DỮ LIỆU TỪ BRAVO 10 VÀO GOOGLE DRIVE   ")
    print("=====================================================================")
    print(f"Niên độ tài chính : Năm {CURRENT_YEAR}")
    print(f"Thư mục lưu file  : {OUTPUT_DIR}")
    print(f"Tên file kết xuất : {OUTPUT_FILE}")
    print("---------------------------------------------------------------------")

    # Đảm bảo thư mục lưu tồn tại
    if not os.path.exists(OUTPUT_DIR):
        os.makedirs(OUTPUT_DIR, exist_ok=True)

    # Đếm ngược 5 giây để người dùng chuẩn bị
    countdown(5)

    # BƯỚC 1: TÌM VÀ KHỞI ĐỘNG BRAVO 10
    log("BƯỚC 1/6", "Đang tìm kiếm và khởi động phần mềm Bravo 10...")
    shortcut = find_bravo_shortcut()
    if shortcut and os.path.exists(shortcut):
        log("BƯỚC 1/6", f"Tìm thấy shortcut: {shortcut}")
        os.startfile(shortcut)
    else:
        log("CẢNH BÁO", "Không tìm thấy shortcut tự động, vui lòng đảm bảo Bravo 10 đã được mở!")

    # Chờ cửa sổ đăng nhập Bravo 10 hiện lên
    log("BƯỚC 1/6", "Chờ cửa sổ đăng nhập Bravo 10 xuất hiện (6 giây)...")
    time.sleep(6)

    # BƯỚC 2: TỰ ĐỘNG ĐĂNG NHẬP
    log("BƯỚC 2/6", f"Đang điền thông tin đăng nhập: User: {BRAVO_USER} | Đơn vị: {BRAVO_UNIT}...")
    # Click nhẹ vào giữa màn hình để kích hoạt focus
    screen_w, screen_h = pyautogui.size()
    pyautogui.click(screen_w // 2, screen_h // 2 - 50)
    time.sleep(0.5)

    # 1. Gõ Tên đăng nhập
    pyautogui.hotkey('ctrl', 'a')
    pyautogui.typewrite(BRAVO_USER, interval=0.08)
    pyautogui.press('tab')
    time.sleep(0.5)

    # 2. Gõ Mật khẩu
    pyautogui.hotkey('ctrl', 'a')
    pyautogui.typewrite(BRAVO_PASS, interval=0.08)
    pyautogui.press('tab')
    time.sleep(0.5)

    # 3. Chọn Đơn vị cơ sở A08
    pyautogui.typewrite(BRAVO_UNIT, interval=0.08)
    time.sleep(0.5)
    pyautogui.press('enter')
    time.sleep(0.5)

    # 4. Bấm nút Đăng nhập
    pyautogui.press('tab')
    time.sleep(0.3)
    pyautogui.press('enter')
    log("BƯỚC 2/6", "Đã bấm Đăng nhập! Chờ tải Màn hình cá nhân (8 giây)...")
    time.sleep(8)

    # BƯỚC 3: MỞ THẺ PIN "BÁO CÁO THỰC HIỆN CHI PHÍ"
    log("BƯỚC 3/6", "Đang click vào thẻ đã PIN: 'Báo cáo thực hiện chi phí'...")
    # Vị trí thẻ pin trên màn hình cá nhân (nằm ở khoảng 22% chiều rộng, 25% chiều cao)
    card_x = int(screen_w * 0.22)
    card_y = int(screen_h * 0.25)
    pyautogui.click(card_x, card_y)
    log("BƯỚC 3/6", "Chờ giao diện báo cáo mở ra (5 giây)...")
    time.sleep(5)

    # BƯỚC 4: NẠP DỮ LIỆU BÁO CÁO
    log("BƯỚC 4/6", "Đang bấm nút 'Báo cáo' để nạp số liệu mới nhất...")
    # Nút "Báo cáo" ở góc dưới bên trái của panel điều kiện lọc
    btn_x = int(screen_w * 0.035)
    btn_y = screen_h - int(screen_h * 0.065)
    pyautogui.click(btn_x, btn_y)
    log("BƯỚC 4/6", "Đang chờ Bravo 10 truy vấn SQL và tải dữ liệu bảng (6 giây)...")
    time.sleep(6)

    # BƯỚC 5: MỞ MENU VÀ KẾT XUẤT EXCEL
    log("BƯỚC 5/6", "Đang mở menu '≡ Báo cáo' -> Chọn '7. Kết xuất...'...")
    # Menu ≡ Báo cáo ở góc trên bên trái thanh công cụ
    menu_x = int(screen_w * 0.035)
    menu_y = int(screen_h * 0.04)
    pyautogui.click(menu_x, menu_y)
    time.sleep(1)

    # Nhấn phím '7' để chọn mục "7. Kết xuất..."
    pyautogui.press('7')
    time.sleep(3)

    # BƯỚC 6: HỘP THOẠI SAVE AS - LƯU FILE VÀO GOOGLE DRIVE
    log("BƯỚC 6/6", f"Đang lưu file vào: {FULL_SAVE_PATH}...")
    pyautogui.hotkey('ctrl', 'a')
    time.sleep(0.3)
    pyautogui.typewrite(FULL_SAVE_PATH, interval=0.02)
    time.sleep(0.5)
    pyautogui.press('enter')
    time.sleep(1.5)

    # Nếu có hộp thoại xác nhận ghi đè file cũ ("Do you want to replace it?")
    pyautogui.press('left')   # Chọn nút 'Yes'
    pyautogui.press('enter')
    time.sleep(3)

    # BƯỚC 7: HOÀN TẤT VÀ ĐÓNG ỨNG DỤNG
    log("HOÀN TẤT", "Đang đóng Bravo 10...")
    pyautogui.hotkey('alt', 'f4')
    time.sleep(1)
    pyautogui.hotkey('alt', 'f4')

    print("\n=====================================================================")
    print(" [THÀNH CÔNG] ĐÃ TỰ ĐỘNG XUẤT BÁO CÁO BRAVO 10 VÀO GOOGLE DRIVE!")
    print(f" Vị trí file: {FULL_SAVE_PATH}")
    print(" Google Drive sẽ tự động đồng bộ file mới lên Đám mây.")
    print("=====================================================================\n")

if __name__ == "__main__":
    try:
        run()
    except Exception as e:
        print(f"\n[LỖI TRONG QUÁ TRÌNH THỰC THI]: {e}")
        input("Nhấn Enter để thoát...")
