"""
=============================================================================
HỆ THỐNG TỰ ĐỘNG XUẤT BÁO CÁO BRAVO 10 VÀO GOOGLE DRIVE
Cảng Hàng không Quốc tế Cần Thơ - Phòng Tài chính Kế hoạch
=============================================================================
"""

import os
import sys
import time
import glob
import ctypes
import argparse
from datetime import datetime

# Đảm bảo UTF-8 cho Windows console để hiển thị tiếng Việt không bị lỗi charmap
if sys.platform.startswith("win"):
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

try:
    import pyautogui
    import pygetwindow as gw
    import pyperclip
except ImportError:
    print("\n[LỖI] Đang cài đặt các thư viện cần thiết...")
    os.system(f'"{sys.executable}" -m pip install pyautogui pygetwindow pyperclip pillow')
    import pyautogui
    import pygetwindow as gw
    import pyperclip

pyautogui.FAILSAFE = True
pyautogui.PAUSE = 0.5

# Xử lý tham số năm tài chính (Mặc định: Năm hiện tại)
parser = argparse.ArgumentParser(description="Tự động xuất báo cáo Bravo 10")
parser.add_argument("--year", type=int, default=datetime.now().year, help="Năm tài chính cần xuất")
args, _ = parser.parse_known_args()
CURRENT_YEAR = args.year

PROJECT_DIR = r"I:\My Drive\APP\Projects\quan-ly-ke-hoach"
OUTPUT_DIR = os.path.join(PROJECT_DIR, "BRAVO Daily")
OUTPUT_FILE = f"Báo cáo thực hiện chi phí {CURRENT_YEAR}.xlsx"
FULL_SAVE_PATH = os.path.join(OUTPUT_DIR, OUTPUT_FILE)

BRAVO_USER = "vca"
BRAVO_PASS = "vca123"
BRAVO_UNIT = "A08"

# Các từ khóa để loại trừ cửa sổ CMD/Terminal của chính công cụ này
IGNORE_KEYWORDS = [
    "cmd.exe",
    "powershell",
    "terminal",
    "console",
    "dong bo bao cao",
    "tu dong xuat",
    "chay_xuat",
    "auto_export",
    "antigravity",
    "visual studio code",
    "cursor",
    "python",
    "ctia - dong bo",
    "he thong dong bo",
    "chi phi ctia",
]

def log(step, msg):
    now = datetime.now().strftime("%H:%M:%S")
    print(f"[{now}] [{step}] {msg}")

def is_ignored(title):
    if not title:
        return True
    t = title.strip().lower()
    return any(k in t for k in IGNORE_KEYWORDS)

def find_target_window():
    """
    Tìm cửa sổ Bravo:
    Ưu tiên 1: Cửa sổ "Báo cáo thực hiện chi phí" (đã mở sẵn báo cáo)
    Ưu tiên 2: Cửa sổ Bravo 10 chính ("Màn hình cá nhân" hoặc có "Bravo 10")
    Ưu tiên 3: Cửa sổ Đăng nhập Bravo ("Chào mừng...")
    """
    try:
        console_hwnd = ctypes.windll.kernel32.GetConsoleWindow()
    except Exception:
        console_hwnd = 0

    windows = gw.getAllWindows()

    # 1. Ưu tiên cao nhất: Cửa sổ "Báo cáo thực hiện chi phí"
    for w in windows:
        if not w.title or is_ignored(w.title):
            continue
        if hasattr(w, '_hWnd') and w._hWnd == console_hwnd:
            continue
        t = w.title.strip().lower()
        if "báo cáo thực hiện chi phí" in t or "bao cao thuc hien chi phi" in t or "thực hiện chi phí" in t:
            return w, 'report'

    # 2. Ưu tiên 2: Cửa sổ Bravo 10 chính
    for w in windows:
        if not w.title or is_ignored(w.title):
            continue
        if hasattr(w, '_hWnd') and w._hWnd == console_hwnd:
            continue
        t = w.title.strip().lower()
        if "bravo" in t and ("chào mừng" not in t and "đăng nhập" not in t and "dang nhap" not in t):
            return w, 'main'

    # 3. Ưu tiên 3: Cửa sổ Đăng nhập Bravo
    for w in windows:
        if not w.title or is_ignored(w.title):
            continue
        if hasattr(w, '_hWnd') and w._hWnd == console_hwnd:
            continue
        t = w.title.strip().lower()
        if "chào mừng đến với bravo" in t or "chao mung" in t or ("bravo" in t and "đăng nhập" in t):
            return w, 'login'

    return None, None

def find_save_as_window():
    """Tìm cửa sổ Save As của Windows"""
    windows = gw.getAllWindows()
    for w in windows:
        if w.title:
            t = w.title.strip().lower()
            if "save as" in t or "lưu dưới dạng" in t or "lưu tệp" in t or t == "save":
                return w
    return None

def activate_window(win):
    """Kích hoạt và phóng to cửa sổ lên màn hình"""
    try:
        hwnd = win._hWnd
        ctypes.windll.user32.ShowWindow(hwnd, 9)  # SW_RESTORE
        ctypes.windll.user32.ShowWindow(hwnd, 3)  # SW_MAXIMIZE
        ctypes.windll.user32.SetForegroundWindow(hwnd)
        time.sleep(0.8)
    except Exception:
        try:
            win.restore()
            win.maximize()
            win.activate()
            time.sleep(0.8)
        except Exception:
            pass

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
    print(f"Đường dẫn lưu     : {FULL_SAVE_PATH}")
    print("---------------------------------------------------------------------")

    if not os.path.exists(OUTPUT_DIR):
        os.makedirs(OUTPUT_DIR, exist_ok=True)

    # Ghi nhận thời gian sửa đổi cũ của file để đối chiếu kết quả
    old_mtime = os.path.getmtime(FULL_SAVE_PATH) if os.path.exists(FULL_SAVE_PATH) else 0

    # 1. TÌM KIẾM CỬA SỔ PHẦN MỀM BRAVO 10
    win, kind = find_target_window()

    if not win:
        log("THÔNG BÁO", "Chưa phát hiện phần mềm Bravo 10 đang mở trên màn hình.")
        if sys.stdin.isatty():
            print("\n" + "="*69)
            print(" [HƯỚNG DẪN DÀNH CHO BẠN]")
            print(" 1. Vui lòng mở phần mềm Bravo 10 lên màn hình.")
            print(" 2. (Gợi ý) Bạn có thể bấm sẵn vào thẻ 'Báo cáo thực hiện chi phí'.")
            print(" 3. Sau khi màn hình Bravo 10 đã hiện lên, hãy quay lại cửa sổ này:")
            print("="*69)
            try:
                input(" >> Nhấn phím ENTER để công cụ bắt đầu tự động kết xuất... ")
            except Exception:
                pass
            print()
            win, kind = find_target_window()
        else:
            log("CHỜ ĐỢI", "Đang chờ 10 giây để tìm cửa sổ Bravo 10...")
            for _ in range(10):
                time.sleep(1)
                win, kind = find_target_window()
                if win:
                    break

        if not win:
            log("CẢNH BÁO", "Vẫn chưa phát hiện Bravo 10. Đang chờ thêm 3 giây...")
            time.sleep(3)
            win, kind = find_target_window()
            if not win:
                log("LỖI", "Không tìm thấy cửa sổ Bravo 10. Vui lòng mở Bravo 10 và chạy lại.")
                return

    log("BƯỚC 1/5", f"Đã tìm thấy cửa sổ: '{win.title}' (Trạng thái: {kind})")
    log("BƯỚC 1/5", "Đang đưa Bravo 10 lên màn hình chính và kích hoạt...")
    activate_window(win)
    time.sleep(1.5)

    countdown(3)

    # 2. XỬ LÝ ĐĂNG NHẬP NẾU ĐANG Ở MÀN HÌNH ĐĂNG NHẬP
    if kind == 'login':
        log("BƯỚC 2/5", f"Đang điền thông tin đăng nhập: {BRAVO_USER} / {BRAVO_UNIT}...")
        w_left, w_top, w_w, w_h = win.left, win.top, win.width, win.height
        pyautogui.click(w_left + w_w // 2, w_top + w_h // 2 - 50)
        time.sleep(0.5)

        pyautogui.hotkey('ctrl', 'a')
        pyautogui.typewrite(BRAVO_USER, interval=0.08)
        pyautogui.press('tab')
        time.sleep(0.4)

        pyautogui.hotkey('ctrl', 'a')
        pyautogui.typewrite(BRAVO_PASS, interval=0.08)
        pyautogui.press('tab')
        time.sleep(0.4)

        pyautogui.typewrite(BRAVO_UNIT, interval=0.08)
        time.sleep(0.4)
        pyautogui.press('enter')
        time.sleep(0.4)

        pyautogui.press('tab')
        pyautogui.press('enter')
        log("BƯỚC 2/5", "Đã gửi thông tin đăng nhập. Chờ tải Màn hình chính (6 giây)...")
        time.sleep(6)
        kind = 'main'

    # 3. NẾU ĐANG Ở MÀN HÌNH CHÍNH -> MỞ THẺ BÁO CÁO ĐÃ PIN
    if kind == 'main':
        # Cập nhật lại tọa độ cửa sổ sau khi đăng nhập
        win_main, _ = find_target_window()
        if win_main:
            activate_window(win_main)
            w_left, w_top, w_w, w_h = win_main.left, win_main.top, win_main.width, win_main.height
        else:
            w_left, w_top, w_w, w_h = win.left, win.top, win.width, win.height

        log("BƯỚC 2/5", "Đang mở thẻ pin 'Báo cáo thực hiện chi phí'...")
        # Tọa độ thẻ pin: ~22% width, ~25% height
        card_x = w_left + int(w_w * 0.22)
        card_y = w_top + int(w_h * 0.25)
        pyautogui.click(card_x, card_y)
        log("BƯỚC 2/5", "Đã bấm mở thẻ. Đang chờ giao diện báo cáo tải lên (5 giây)...")
        time.sleep(5)

    # 4. TẢI DỮ LIỆU BÁO CÁO MỚI NHẤT
    win_rep, _ = find_target_window()
    if win_rep:
        activate_window(win_rep)
        w_left, w_top, w_w, w_h = win_rep.left, win_rep.top, win_rep.width, win_rep.height
    else:
        w_left, w_top, w_w, w_h = win.left, win.top, win.width, win.height

    log("BƯỚC 3/5", "Đang bấm nút 'Báo cáo' (hoặc F5) để tải số liệu mới nhất...")
    # Nút 'Báo cáo' ở góc dưới bên trái panel lọc (~2.5% width, ~95.1% height)
    btn_x = w_left + int(w_w * 0.025)
    btn_y = w_top + int(w_h * 0.951)
    pyautogui.click(btn_x, btn_y)
    time.sleep(0.5)
    pyautogui.press('f5')

    log("BƯỚC 3/5", "Đang chờ máy chủ Bravo 10 truy vấn số liệu (6 giây)...")
    time.sleep(6)

    # 5. MỞ MENU '≡ Báo cáo' -> CHỌN '7. Kết xuất...'
    log("BƯỚC 4/5", "Đang mở menu '≡ Báo cáo' góc trên bên trái...")
    # Menu ≡ Báo cáo: ~2.8% width, ~6.8% height
    menu_x = w_left + int(w_w * 0.028)
    menu_y = w_top + int(w_h * 0.068)
    pyautogui.click(menu_x, menu_y)
    time.sleep(1.2)

    log("BƯỚC 4/5", "Đang chọn mục '7. Kết xuất...'...")
    # Bấm phím '7' và click trực tiếp vị trí dòng thứ 7 (~4.4% W, ~35.8% H)
    item7_x = w_left + int(w_w * 0.044)
    item7_y = w_top + int(w_h * 0.358)
    pyautogui.press('7')
    time.sleep(0.5)
    pyautogui.click(item7_x, item7_y)
    time.sleep(2.5)

    # 6. HỘP THOẠI SAVE AS: LƯU ĐƯỜNG DẪN VÀO GOOGLE DRIVE
    log("BƯỚC 5/5", "Đang chờ hộp thoại Save As xuất hiện...")
    save_win = None
    for _ in range(8):
        save_win = find_save_as_window()
        if save_win:
            break
        time.sleep(0.5)

    if save_win:
        log("BƯỚC 5/5", f"Đã phát hiện hộp thoại lưu: '{save_win.title}'")
        activate_window(save_win)
        time.sleep(0.5)
    else:
        log("BƯỚC 5/5", "Đang gửi đường dẫn lưu file trực tiếp...")

    # Copy full path vào clipboard để dán (tránh UniKey biến đổi ký tự tiếng Việt)
    pyperclip.copy(FULL_SAVE_PATH)
    time.sleep(0.4)

    pyautogui.hotkey('ctrl', 'a')
    time.sleep(0.3)
    pyautogui.hotkey('ctrl', 'v')
    time.sleep(0.6)
    pyautogui.press('enter')
    time.sleep(1.5)

    # Xử lý xác nhận ghi đè file cũ (nếu có hộp thoại "already exists")
    pyautogui.press('left')
    time.sleep(0.2)
    pyautogui.press('enter')
    time.sleep(0.3)
    pyautogui.hotkey('alt', 'y')
    time.sleep(3)

    # 7. XÁC THỰC KẾT QUẢ GHI FILE THỰC TẾ
    log("KIỂM TRA", "Đang kiểm tra tệp tin trên Google Drive...")
    file_updated = False
    for _ in range(12):
        time.sleep(1)
        if os.path.exists(FULL_SAVE_PATH) and os.path.getmtime(FULL_SAVE_PATH) > old_mtime:
            file_updated = True
            break

    if file_updated:
        file_size_kb = os.path.getsize(FULL_SAVE_PATH) / 1024
        mod_time = datetime.fromtimestamp(os.path.getmtime(FULL_SAVE_PATH)).strftime("%d/%m/%Y %H:%M:%S")
        print("\n" + "="*69)
        print(" [THÀNH CÔNG] ĐÃ TỰ ĐỘNG XUẤT VÀ CẬP NHẬT FILE BRAVO 10!")
        print(f" Tệp tin     : {OUTPUT_FILE}")
        print(f" Thư mục     : {OUTPUT_DIR}")
        print(f" Kích thước  : {file_size_kb:.1f} KB")
        print(f" Thời gian   : {mod_time}")
        print(" Trạng thái  : File đã được cập nhật mới trên Google Drive thành công!")
        print("="*69 + "\n")
    else:
        print("\n" + "="*69)
        print(" [CHÚ Ý] Chưa phát hiện file mới được tạo hoặc cập nhật!")
        if os.path.exists(FULL_SAVE_PATH):
            old_date = datetime.fromtimestamp(old_mtime).strftime("%d/%m/%Y %H:%M:%S")
            print(f" Tệp tin trong thư mục vẫn là bản cũ lúc: {old_date}")
        print("\n Gợi ý khắc phục:")
        print("  1. Hãy MỞ SẴN BÁO CÁO BRAVO TRÊN MÀN HÌNH (như ảnh bạn chụp sáng nay).")
        print("  2. Chạy lại file Chay_Xuat_Bravo.bat, công cụ sẽ tự động bấm xuất trong 5 giây.")
        print("="*69 + "\n")

if __name__ == "__main__":
    try:
        run()
    except Exception as e:
        print(f"\n[LỖI TRONG QUÁ TRÌNH THỰC THI]: {e}")
        input("Nhấn Enter để thoát...")
