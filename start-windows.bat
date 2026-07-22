@echo off
chcp 65001 >nul
title Reptile Gallery Shipping Site
cd /d "%~dp0"
echo.
echo 렙타일갤러리 배송 신청 사이트를 실행합니다.
echo 처음 실행이라면 필요한 파일을 설치합니다.
echo.
call npm install
if errorlevel 1 (
  echo.
  echo npm install 중 오류가 발생했습니다. Node.js 설치 여부를 확인해 주세요.
  pause
  exit /b 1
)
echo.
echo 사이트를 실행합니다. 이 창을 닫으면 사이트 접속이 중단됩니다.
echo.
call npm start
pause
