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

try:
    import pyautogui
    import pygetwindow as gw
except ImportError:
    print("\n[LỖI] Thiếu thư viện pyautogui hoặc pygetwindow.")
    print("Đang tự động cài đặt...")
    os.system(f'"{sys.executable}" -m pip install pyautogui pygetwindow')
    import pyautogui
    import pygetwindow as gw

pyautogui.FAILSAFE = True
pyautogui.PAUSE = 0.5

CURRENT_YEAR = datetime.now().year
PROJECT_DIR = r"I:\My Drive\APP\Projects\quan-ly-ke-hoach"
OUTPUT_DIR = os.path.join(PROJECT_DIR, "BRAVO Daily")
OUTPUT_FILE = f"Báo cáo thực hiện chi phí {CURRENT_YEAR}.xlsx"
FULL_SAVE_PATH = os.path.join(OUTPUT_DIR, OUTPUT_FILE)

BRAVO_USER = "vca"
BRAVO_PASS = "vca123"
BRAVO_UNIT = "A08"

def log(step, msg):
    now = datetime.now().strftime("%H:%M:%S")
    print(f"[{now}] [{step}] {msg}")

def find_bravo_window():
    """Tìm xem có cửa sổ Bravo nào đang mở hay không"""
    windows = gw.getAllWindows()
    for w in windows:
        if w.title and "bravo" in w.title.lower():
            return w
    return None

def find_bravo_shortcut():
    """Tìm shortcut Bravo 10 trên Desktop hoặc thư mục APP"""
    patterns = [
        os.path.expanduser(r"~\Desktop\APP\Bravo10*.lnk"),
        os.path.expanduser(r"~\Desktop\Bravo10*.lnk"),
        r"C:\Users\*\Desktop\APP\Bravo10*.lnk",
        r"C:\Users\*\Desktop\Bravo10*.lnk",
        r"D:\APP\Bravo10*.lnk",
        r"D:\APP\Bravo10.exe",
    ]
    for p in patterns:
        matches = glob.glob(p)
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

    if not os.path.exists(OUTPUT_DIR):
        os.makedirs(OUTPUT_DIR, exist_ok=True)

    countdown(4)

    # 1. KIỂM TRA XEM BRAVO 10 ĐÃ MỞ CHƯA
    existing_win = find_bravo_window()
    if existing_win:
        log("BƯỚC 1/6", f"Phát hiện Bravo 10 đang mở: '{existing_win.title}'. Đang kích hoạt...")
        try:
            existing_win.restore()
            existing_win.activate()
        except Exception:
            pass
        time.sleep(2)
    else:
        log("BƯỚC 1/6", "Bravo 10 chưa mở. Đang tìm shortcut để khởi động...")
        shortcut = find_bravo_shortcut()
        if shortcut and os.path.exists(shortcut):
            log("BƯỚC 1/6", f"Khởi động: {shortcut}")
            os.startfile(shortcut)
            time.sleep(6)
        else:
            log("THÔNG BÁO", "Không tìm thấy shortcut tự động. Vui lòng mở Bravo 10 lên màn hình...")
            for _ in range(15):
                existing_win = find_bravo_window()
                if existing_win:
                    break
                time.sleep(1)

    # 2. KIỂM TRA ĐĂNG NHẬP NẾU ĐANG Ở MÀN HÌNH ĐĂNG NHẬP
    current_win = find_bravo_window()
    if current_win and "chào mừng" in current_win.title.lower() or not current_win:
        log("BƯỚC 2/6", f"Đang điền thông tin đăng nhập: {BRAVO_USER} / {BRAVO_UNIT}...")
        screen_w, screen_h = pyautogui.size()
        pyautogui.click(screen_w // 2, screen_h // 2 - 50)
        time.sleep(0.5)

        # Gõ User
        pyautogui.hotkey('ctrl', 'a')
        pyautogui.typewrite(BRAVO_USER, interval=0.08)
        pyautogui.press('tab')
        time.sleep(0.4)

        # Gõ Pass
        pyautogui.hotkey('ctrl', 'a')
        pyautogui.typewrite(BRAVO_PASS, interval=0.08)
        pyautogui.press('tab')
        time.sleep(0.4)

        # Chọn Đơn vị A08
        pyautogui.typewrite(BRAVO_UNIT, interval=0.08)
        time.sleep(0.4)
        pyautogui.press('enter')
        time.sleep(0.4)

        # Bấm Đăng nhập
        pyautogui.press('tab')
        pyautogui.press('enter')
        log("BƯỚC 2/6", "Đã gửi thông tin đăng nhập. Chờ tải Màn hình cá nhân (7 giây)...")
        time.sleep(7)
    else:
        log("BƯỚC 2/6", "Bravo 10 đã ở trạng thái đăng nhập sẵn.")

    # 3. MỞ THẺ ĐÃ PIN HOẶC VÀO BÁO CÁO
    screen_w, screen_h = pyautogui.size()
    log("BƯỚC 3/6", "Đang mở thẻ 'Báo cáo thực hiện chi phí'...")
    # Tọa độ thẻ pin trên Màn hình cá nhân (khoảng 22% W, 25% H)
    card_x = int(screen_w * 0.22)
    card_y = int(screen_h * 0.25)
    pyautogui.click(card_x, card_y)
    time.sleep(4)

    # 4. NẠP SỐ LIỆU BÁO CÁO
    log("BƯỚC 4/6", "Đang bấm nút 'Báo cáo' để nạp số liệu mới nhất...")
    # Nút "Báo cáo" ở góc dưới bên trái của panel điều kiện lọc
    btn_x = int(screen_w * 0.035)
    btn_y = screen_h - int(screen_h * 0.065)
    pyautogui.click(btn_x, btn_y)
    log("BƯỚC 4/6", "Đang chờ Bravo 10 truy vấn SQL và tải dữ liệu bảng (6 giây)...")
    time.sleep(6)

    # 5. MỞ MENU VÀ KẾT XUẤT EXCEL
    log("BƯỚC 5/6", "Đang mở menu '≡ Báo cáo' -> Chọn '7. Kết xuất...'...")
    # Menu ≡ Báo cáo ở góc trên bên trái thanh công cụ
    menu_x = int(screen_w * 0.035)
    menu_y = int(screen_h * 0.04)
    pyautogui.click(menu_x, menu_y)
    time.sleep(1)

    # Phím '7' để chọn mục "7. Kết xuất..."
    pyautogui.press('7')
    time.sleep(3)

    # 6. HỘP THOẠI SAVE AS: LƯU FILE VÀO GOOGLE DRIVE
    log("BƯỚC 6/6", f"Đang lưu file vào: {FULL_SAVE_PATH}...")
    pyautogui.hotkey('ctrl', 'a')
    time.sleep(0.3)
    pyautogui.typewrite(FULL_SAVE_PATH, interval=0.02)
    time.sleep(0.5)
    pyautogui.press('enter')
    time.sleep(1.5)

    # Xử lý xác nhận ghi đè file cũ (nếu có)
    pyautogui.press('left')
    pyautogui.press('enter')
    time.sleep(3)

    log("HOÀN TẤT", "Quy trình kết xuất hoàn tất!")
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
