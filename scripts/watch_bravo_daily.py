"""
=============================================================================
TỰ ĐỘNG THEO DÕI THƯ MỤC BRAVO DAILY (FOLDER WATCHER)
Cảng Hàng không Quốc tế Cần Thơ - Phòng Tài chính Kế hoạch
=============================================================================
Script này chạy ẩn dưới nền. Mỗi khi bạn xuất file đè vào thư mục BRAVO Daily,
hệ thống sẽ phát hiện ngay trong 1 giây và tự động đồng bộ dữ liệu vào Web App!
"""

import os
import sys
import time
from datetime import datetime

# Đảm bảo UTF-8 cho Windows console
if sys.platform.startswith("win"):
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

CURRENT_YEAR = datetime.now().year
PROJECT_DIR = r"I:\My Drive\APP\Projects\quan-ly-ke-hoach"
EXCEL_PATH = os.path.join(PROJECT_DIR, "BRAVO Daily", f"Báo cáo thực hiện chi phí {CURRENT_YEAR}.xlsx")
SYNC_SCRIPT = os.path.join(PROJECT_DIR, "scripts", "sync_bravo_to_sheets.py")

def log(msg):
    now = datetime.now().strftime("%H:%M:%S")
    print(f"[{now}] {msg}")

def run_watcher():
    print("=====================================================================")
    print("        HỆ THỐNG TỰ ĐỘNG THEO DÕI VÀ ĐỒNG BỘ THƯ MỤC BRAVO DAILY    ")
    print("=====================================================================")
    print(f"File theo dõi: {EXCEL_PATH}")
    print("Trạng thái   : Đang canh giữ... Mỗi khi bạn xuất đè file từ Bravo,")
    print("               hệ thống sẽ tự động đồng bộ vào Web App ngay lập tức!")
    print("---------------------------------------------------------------------")

    last_mtime = os.path.getmtime(EXCEL_PATH) if os.path.exists(EXCEL_PATH) else 0

    while True:
        try:
            time.sleep(2)
            if os.path.exists(EXCEL_PATH):
                current_mtime = os.path.getmtime(EXCEL_PATH)
                if current_mtime > last_mtime:
                    # Đợi 1 giây để phần mềm Bravo hoàn tất quá trình ghi đĩa
                    time.sleep(1.5)
                    log(f"Phát hiện file mới từ Bravo! (Sửa đổi lúc: {datetime.fromtimestamp(current_mtime).strftime('%H:%M:%S')})")
                    log("Đang kích hoạt quy trình đồng bộ tự động...")
                    os.system(f'"{sys.executable}" "{SYNC_SCRIPT}"')
                    last_mtime = os.path.getmtime(EXCEL_PATH)
                    log("Đồng bộ hoàn tất! Tiếp tục canh giữ...")
        except KeyboardInterrupt:
            print("\nĐã dừng theo dõi.")
            break
        except Exception as e:
            time.sleep(3)

if __name__ == "__main__":
    run_watcher()
