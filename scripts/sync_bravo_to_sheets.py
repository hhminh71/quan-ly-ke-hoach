"""
=============================================================================
ĐỒNG BỘ DỮ LIỆU TỪ EXCEL BRAVO DAILY VÀO WEB APP VÀ GOOGLE SHEETS (INFO)
Cảng Hàng không Quốc tế Cần Thơ - Phòng Tài chính Kế hoạch
=============================================================================
"""

import os
import sys
import json
from datetime import datetime

# Đảm bảo UTF-8 cho Windows console
if sys.platform.startswith("win"):
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

try:
    import openpyxl
    import requests
    import urllib3
    urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
except ImportError:
    print("[*] Đang cài đặt thư viện cần thiết: openpyxl, requests...")
    os.system(f'"{sys.executable}" -m pip install openpyxl requests')
    import openpyxl
    import requests
    import urllib3
    urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

CURRENT_YEAR = datetime.now().year
PROJECT_DIR = r"I:\My Drive\APP\Projects\quan-ly-ke-hoach"
EXCEL_PATH = os.path.join(PROJECT_DIR, "BRAVO Daily", f"Báo cáo thực hiện chi phí {CURRENT_YEAR}.xlsx")
BRAVO_INFO_JSON = os.path.join(PROJECT_DIR, "src", "data", "bravoInfo.json")
BUDGETS_JSON = os.path.join(PROJECT_DIR, "src", "data", "budgets.json")

def run():
    print("=====================================================================")
    print("      ĐỒNG BỘ DỮ LIỆU EXCEL BRAVO DAILY -> WEB APP & GOOGLE SHEET   ")
    print("=====================================================================")
    print(f"File nguồn       : {EXCEL_PATH}")
    print(f"Thời gian thực hiện: {datetime.now().strftime('%d/%m/%Y %H:%M:%S')}")
    print("---------------------------------------------------------------------")

    if not os.path.exists(EXCEL_PATH):
        print(f"\n[LỖI] Không tìm thấy file Excel tại:")
        print(f"      {EXCEL_PATH}")
        print("Vui lòng xuất file từ phần mềm Bravo vào thư mục BRAVO Daily trước.")
        input("\nNhấn Enter để thoát...")
        return

    # 1. Đọc dữ liệu từ file Excel
    print("[1/3] Đang phân tích file Excel Bravo...")
    wb = openpyxl.load_workbook(EXCEL_PATH, data_only=True)
    sheet = wb.active

    items = []
    current_category = "Chi phí sản xuất kinh doanh"

    # Hàng dữ liệu bắt đầu từ dòng 9 trong mẫu báo cáo của Bravo
    for r in range(9, sheet.max_row + 1):
        name = sheet.cell(r, 1).value
        code = sheet.cell(r, 2).value
        plan = sheet.cell(r, 3).value or 0
        actual_period = sheet.cell(r, 4).value or 0
        rate_period = sheet.cell(r, 5).value or 0
        actual_ytd = sheet.cell(r, 6).value or 0
        rate_ytd = sheet.cell(r, 7).value or 0

        if not name and not code:
            continue

        code_str = str(code).strip() if code is not None else ""
        name_str = str(name).strip() if name is not None else ""

        # Nếu không có mã tài khoản nhưng có tên -> đây là dòng nhóm / đề mục cha
        if not code_str and name_str:
            current_category = name_str

        rate_val = float(rate_period)
        rate_pct = round(rate_val * 100, 2) if rate_val < 10 else round(rate_val, 2)

        rate_ytd_val = float(rate_ytd)
        rate_ytd_pct = round(rate_ytd_val * 100, 2) if rate_ytd_val < 10 else round(rate_ytd_val, 2)

        items.append({
            "row": r,
            "code": code_str,
            "name": name_str,
            "category": current_category,
            "approvedAmount": float(plan),
            "bravoAmount": float(actual_period),
            "rate": rate_pct,
            "actualYTD": float(actual_ytd),
            "rateYTD": rate_ytd_pct,
            "note": ""
        })

    accounts = [it for it in items if it["code"]]
    print(f"      -> Đã trích xuất thành công: {len(items)} dòng (gồm {len(accounts)} tài khoản có mã).")

    # 2. Cập nhật dữ liệu vào bravoInfo.json
    print("[2/3] Đang cập nhật dữ liệu vào Web App (bravoInfo.json)...")
    try:
        # Giữ lại các trường bổ trợ nếu đã có trong file cũ
        existing_map = {}
        if os.path.exists(BRAVO_INFO_JSON):
            with open(BRAVO_INFO_JSON, "r", encoding="utf-8") as f:
                old_list = json.load(f)
                for o in old_list:
                    if o.get("code"):
                        existing_map[o["code"]] = o

        for it in items:
            c = it["code"]
            if c in existing_map:
                it["isPlanningTracked"] = existing_map[c].get("isPlanningTracked", False)
                it["nonPlanningReason"] = existing_map[c].get("nonPlanningReason", "")
                if existing_map[c].get("note"):
                    it["note"] = existing_map[c]["note"]

        with open(BRAVO_INFO_JSON, "w", encoding="utf-8") as f:
            json.dump(items, f, ensure_ascii=False, indent=2)
        print("      -> Đã ghi mới src/data/bravoInfo.json.")
    except Exception as e:
        print(f"      [CẢNH BÁO] Không thể ghi bravoInfo.json: {e}")

    # Cập nhật số thực hiện Bravo vào budgets.json
    try:
        if os.path.exists(BUDGETS_JSON):
            with open(BUDGETS_JSON, "r", encoding="utf-8") as f:
                budgets = json.load(f)

            code_to_bravo = {it["code"]: it["bravoAmount"] for it in accounts}
            updated_count = 0
            for b in budgets:
                c = b.get("code")
                if c in code_to_bravo:
                    b["bravoActual"] = code_to_bravo[c]
                    updated_count += 1

            with open(BUDGETS_JSON, "w", encoding="utf-8") as f:
                json.dump(budgets, f, ensure_ascii=False, indent=2)
            print(f"      -> Đã đồng bộ số liệu thực hiện Bravo vào {updated_count} khoản mục kế hoạch (budgets.json).")
    except Exception as e:
        print(f"      [CẢNH BÁO] Không thể ghi budgets.json: {e}")

    update_time_str = datetime.now().strftime("%d/%m/%Y %H:%M:%S")

    # 3. Gửi lên Google Apps Script Webhook để đồng bộ vào Sheet INFO
    print(f"[3/3] Đồng bộ trực tiếp lên Sheet INFO (Google Sheets)...")
    # Đọc URL Webhook nếu có lưu trong config
    webhook_cfg = os.path.join(PROJECT_DIR, ".webhook_url.txt")
    webhook_url = ""
    if os.path.exists(webhook_cfg):
        with open(webhook_cfg, "r", encoding="utf-8") as f:
            webhook_url = f.read().strip()

    if webhook_url and webhook_url.startswith("https://script.google.com"):
        try:
            print(f"      Đang gửi {len(items)} dòng (Kèm ghi chú cập nhật: {update_time_str})...")
            payload = {
                "action": "syncBravoInfo",
                "updateTime": update_time_str,
                "items": items
            }
            res = requests.post(webhook_url, json=payload, verify=False, timeout=30)
            if res.status_code == 200:
                res_data = {}
                try:
                    res_data = res.json()
                except Exception:
                    pass
                if res_data.get("status") == "success":
                    print(f"      [THÀNH CÔNG] Đã ghi đè vào tab INFO của Google Sheet!")
                    print(f"      -> Ghi chú thời gian: {update_time_str}")
                else:
                    msg = res_data.get("message", res.text)
                    print(f"      [CHÚ Ý TỪ GOOGLE SCRIPT]: {msg}")
                    if "Hành động POST không hợp lệ" in str(msg) or "không hợp lệ" in str(msg):
                        print("      >> Vui lòng mở Google Sheets -> Tiện ích mở rộng -> Apps Script -> Dán nội dung Code.gs mới và Triển khai (Deploy) Phiên bản mới!")
            else:
                print(f"      [CẢNH BÁO] Phản hồi Webhook HTTP {res.status_code}")
        except Exception as e:
            print(f"      [THÔNG BÁO] Không thể gửi Webhook: {e}")
    else:
        print("      (Chưa cấu hình URL Webhook Google Sheet trong .webhook_url.txt)")

    print("\n=====================================================================")
    print(" [HOÀN TẤT] DỮ LIỆU ĐÃ ĐƯỢC ĐỒNG BỘ THÀNH CÔNG!")
    print(f" File Excel       : Báo cáo thực hiện chi phí {CURRENT_YEAR}.xlsx")
    print(f" Tổng số dòng     : {len(items)} dòng")
    print(f" Số tài khoản     : {len(accounts)} tài khoản kế toán")
    print(" Dữ liệu trên Web App hiện đã phản ánh số liệu mới nhất từ Bravo!")
    print("=====================================================================\n")

if __name__ == "__main__":
    try:
        run()
    except Exception as e:
        print(f"\n[LỖI]: {e}")
    if sys.stdin.isatty():
        input("Nhấn Enter để đóng cửa sổ...")
