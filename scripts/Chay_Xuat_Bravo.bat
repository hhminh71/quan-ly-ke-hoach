@echo off
chcp 65001 > nul
title TỰ ĐỘNG XUẤT BÁO CÁO BRAVO 10 VÀO GOOGLE DRIVE - CTIA
color 0b

echo =====================================================================
echo       CẢNG HÀNG KHÔNG QUỐC TẾ CẦN THƠ - PHÒNG TÀI CHÍNH KẾ HOẠCH
echo              HỆ THỐNG TỰ ĐỘNG XUẤT DỮ LIỆU TỪ BRAVO 10
echo =====================================================================
echo.

:: 1. KIỂM TRA PYTHON TRÊN MÁY TÍNH
set PYTHON_CMD=python
python --version >nul 2>&1
if %errorlevel% neq 0 (
    :: Thử tìm py launcher
    py --version >nul 2>&1
    if %errorlevel% equ 0 (
        set PYTHON_CMD=py
    ) else (
        echo [!] CHƯA TÌM THẤY PYTHON TRÊN MÁY TÍNH CỦA BẠN.
        echo.
        echo Để kịch bản tự động hoạt động, bạn chỉ cần cài đặt Python (1 phút):
        echo 1. Tải bản cài đặt miễn phí tại: https://www.python.org/downloads/
        echo 2. Khi cài đặt, QUAN TRỌNG: Tích chọn vào ô [x] "Add python.exe to PATH"
        echo 3. Sau khi cài xong, mở lại file này để bắt đầu!
        echo.
        pause
        exit /b 1
    )
)

echo [✓] Đã tìm thấy môi trường Python: 
%PYTHON_CMD% --version
echo.

:: 2. KIỂM TRA VÀ TỰ ĐỘNG CÀI ĐẶT THƯ VIỆN PYAUTOGUI NẾU THIẾU
echo [*] Đang kiểm tra thư viện điều khiển chuột/bàn phím (pyautogui)...
%PYTHON_CMD% -c "import pyautogui" >nul 2>&1
if %errorlevel% neq 0 (
    echo [*] Đang tự động cài đặt thư viện pyautogui (vui lòng chờ vài giây)...
    %PYTHON_CMD% -m pip install pyautogui pygetwindow
    if %errorlevel% neq 0 (
        echo [!] Lỗi khi cài đặt thư viện. Vui lòng kiểm tra kết nối mạng Internet.
        pause
        exit /b 1
    )
)
echo [✓] Thư viện tự động hóa đã sẵn sàng!
echo.

:: 3. XÁC ĐỊNH ĐƯỜNG DẪN FILE SCRIPT PYTHON
set SCRIPT_DIR=%~dp0
if exist "%SCRIPT_DIR%scripts\auto_export_bravo.py" (
    set SCRIPT_PATH=%SCRIPT_DIR%scripts\auto_export_bravo.py
) else if exist "%SCRIPT_DIR%auto_export_bravo.py" (
    set SCRIPT_PATH=%SCRIPT_DIR%auto_export_bravo.py
) else (
    set SCRIPT_PATH=I:\My Drive\APP\Projects\quan-ly-ke-hoach\scripts\auto_export_bravo.py
)

:: 4. TIẾN HÀNH CHẠY QUY TRÌNH XUẤT BRAVO 10
echo [*] Bắt đầu kích hoạt quy trình tự động hóa...
echo.
%PYTHON_CMD% "%SCRIPT_PATH%"

echo.
echo =====================================================================
echo  NHẤN PHÍM BẤT KỲ ĐỂ ĐÓNG CỬA SỔ NÀY...
echo =====================================================================
pause > nul
