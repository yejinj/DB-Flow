#!/bin/bash

echo "=========================================="
echo "[DEBUG] Slack Notify Script Started"
echo "=========================================="

# .env 파일 로딩
if [ -f .env ]; then
  echo "[INFO] Loading environment variables from .env file"
  export $(grep -v '^#' .env | xargs)
else
  echo "[WARN] .env file not found. Using environment variables from system."
fi

# 필수 환경변수 확인
if [ -z "${SLACK_WEBHOOK_URL}" ]; then
  echo "[ERROR] Missing required env variable: SLACK_WEBHOOK_URL"
  exit 1
fi

# 파라미터로 메시지 받기
MESSAGE="$1"
BUILD_STATUS="$2"
BUILD_URL="$3"

# 파라미터 유효성 검사
if [ -z "$MESSAGE" ]; then
  echo "[ERROR] Missing required parameter: MESSAGE"
  echo "Usage: $0 <message> [build_status] [build_url]"
  exit 1
fi

# 기본값 설정
BUILD_STATUS="${BUILD_STATUS:-INFO}"
BUILD_URL="${BUILD_URL:-#}"

# Webhook URL 설정
WEBHOOK_URL="${SLACK_WEBHOOK_URL}"

# 컬러 설정
if [ "$BUILD_STATUS" == "SUCCESS" ]; then
  COLOR="#36a64f"  # 녹색
elif [ "$BUILD_STATUS" == "FAILURE" ]; then
  COLOR="#dc3545"  # 빨간색
else
  COLOR="#ffcc00"  # 노란색
fi

# 입력 디버깅
echo "[DEBUG] MESSAGE: ${MESSAGE}"
echo "[DEBUG] BUILD_STATUS: ${BUILD_STATUS}"
echo "[DEBUG] BUILD_URL: ${BUILD_URL}"
echo "[DEBUG] SLACK_WEBHOOK_URL (length): ${#WEBHOOK_URL} characters"

# JSON 페이로드 생성
PAYLOAD=$(cat <<EOF
{
  "channel": "#ncp-project-1",
  "attachments": [
    {
      "color": "${COLOR}",
      "pretext": "Jenkins 빌드 알림",
      "title": "빌드 상태: ${BUILD_STATUS}",
      "title_link": "${BUILD_URL}",
      "text": "${MESSAGE}",
      "footer": "Jenkins Pipeline",
      "ts": $(date +%s)
    }
  ]
}
EOF
)

# 페이로드 디버깅
echo "[DEBUG] Slack Payload:"
echo "${PAYLOAD}"

# Slack Webhook 호출
echo "[INFO] Calling Slack Webhook..."
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST -H 'Content-type: application/json' --data "${PAYLOAD}" "${WEBHOOK_URL}")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
CURL_OUTPUT=$(echo "$RESPONSE" | sed '$d')

# 전송 결과 확인
if [ "$HTTP_CODE" -eq 200 ]; then
  echo "[SUCCESS] Slack notification sent successfully"
else
  echo "[ERROR] Failed to send Slack notification. HTTP code: $HTTP_CODE"
  echo "[ERROR] Response: $CURL_OUTPUT"
  exit 1
fi

echo "=========================================="
echo "[DEBUG] Slack Notify Script Completed"
echo "=========================================="
