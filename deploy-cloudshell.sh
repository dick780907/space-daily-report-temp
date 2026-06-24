#!/bin/bash
# ============================================
# 史貝斯商務中心日報系統 - Cloud Shell 一鍵部署腳本
# 用法: bash deploy-cloudshell.sh
# ============================================

set -e

echo "=========================================="
echo "  史貝斯商務中心日報系統 - 一鍵部署"
echo "=========================================="
echo ""

PROJECT_ID="slasherspace-e37bc"
REPO_URL="https://github.com/dick780907/space-daily-report-temp.git"
DIR_NAME="space-daily-report-temp"

# Step 1: 檢查並 clone 專案
echo "[1/5] 檢查專案..."
if [ -d "$HOME/$DIR_NAME" ]; then
  echo "      專案已存在，更新中..."
  cd "$HOME/$DIR_NAME"
  git pull origin main
else
  echo "      下載專案..."
  cd "$HOME"
  git clone "$REPO_URL"
  cd "$DIR_NAME"
fi

# Step 2: 檢查 Firebase CLI
echo "[2/5] 檢查 Firebase CLI..."
if ! command -v firebase &> /dev/null; then
  echo "      安裝 Firebase CLI（約需 1-2 分鐘）..."
  npm install -g firebase-tools
else
  echo "      Firebase CLI 已安裝 ✓"
fi

# Step 3: 設定 Firebase 專案
echo "[3/5] 設定 Firebase 專案..."
firebase use "$PROJECT_ID" 2>/dev/null || true

# Step 4: 部署 Firestore 安全規則（如果有）
echo "[4/5] 檢查 Firestore 規則..."
if [ -f "firestore.rules" ]; then
  echo "      部署 Firestore 安全規則..."
  firebase deploy --only firestore:rules --project "$PROJECT_ID" 2>/dev/null || echo "      （規則部署跳過或失敗，繼續部署 Hosting）"
else
  echo "      無規則文件，跳過"
fi

# Step 5: 部署 Hosting
echo "[5/5] 部署到 Firebase Hosting..."
firebase deploy --only hosting --project "$PROJECT_ID"

echo ""
echo "=========================================="
echo "  部署完成！"
echo "=========================================="
echo ""
echo "  網站網址："
echo "    https://$PROJECT_ID.web.app"
echo "    https://$PROJECT_ID.firebaseapp.com"
echo ""
echo "  請用無痕模式開啟網站測試登入"
echo "=========================================="
