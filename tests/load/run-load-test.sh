#!/bin/bash

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$SCRIPT_DIR/../.."

ENV_PATH="$PROJECT_ROOT/.env"
YAML_FILE="$SCRIPT_DIR/load-test.yml"
RESULT_DIR="$PROJECT_ROOT/results"

if [ -f "$ENV_PATH" ]; then
  export $(grep -v '^#' "$ENV_PATH" | xargs)
else
  echo "[!] .env 파일을 찾을 수 없습니다. SLACK_WEBHOOK_URL을 설정해주세요."
  exit 1
fi

timestamp=$(date +"%Y%m%d%H%M%S")
formatted_time=$(date "+%m월 %d일 %H시 %M분")
json_result="$RESULT_DIR/result-$timestamp.json"

mkdir -p "$RESULT_DIR"

echo "부하 테스트 실행 시작"
artillery run "$YAML_FILE" -o "$json_result"

total_requests=$(jq '.aggregate.counters["http.requests"]' "$json_result")
total_responses=$(jq '.aggregate.counters["http.responses"] // 0' "$json_result")
failed_vusers=$(jq '.aggregate.counters["vusers.failed"] // 0' "$json_result")
completed_vusers=$(jq '.aggregate.counters["vusers.completed"] // 0' "$json_result")
concurrent_users=$(jq '.aggregate.metrics["concurrency"].max' "$json_result")
error_rate=$(jq '.aggregate.counters["errors.ECONNREFUSED"] // 0' "$json_result")

total_vusers=$((completed_vusers + failed_vusers))
fail_rate=$(awk "BEGIN { printf \"%.2f\", ($failed_vusers/$total_vusers)*100 }")

if (( $(echo "$fail_rate >= ${MAX_FAIL_RATE:-5.0}" | bc -l) )); then
  status_text="경고"
elif (( $(echo "$error_rate >= ${MAX_ERROR_RATE:-10}" | bc -l) )); then
  status_text="주의"
else
  status_text="성공"
fi

build_url="http://223.130.153.17:8081/job/main-pipeline"
report_url="${build_url}/artifact/results/result-$timestamp.json"

slack_message="{
  \"blocks\": [
    {
      \"type\": \"header\",
      \"text\": {
        \"type\": \"plain_text\",
        \"text\": \"부하 테스트 결과\"
      }
    },
    {
      \"type\": \"section\",
      \"text\": {
        \"type\": \"mrkdwn\",
        \"text\": \"*상태: $status_text*\\n*테스트 시간: $formatted_time*\"
      }
    },
    {
      \"type\": \"section\",
      \"fields\": [
        {
          \"type\": \"mrkdwn\",
          \"text\": \"*동시 접속자*\\n${concurrent_users}명\"
        },
        {
          \"type\": \"mrkdwn\",
          \"text\": \"*총 사용자*\\n${total_vusers}명\"
        },
        {
          \"type\": \"mrkdwn\",
          \"text\": \"*요청 수*\\n${total_requests}회\"
        },
        {
          \"type\": \"mrkdwn\",
          \"text\": \"*응답 수*\\n${total_responses}회\"
        },
        {
          \"type\": \"mrkdwn\",
          \"text\": \"*실패율*\\n${fail_rate}%\"
        },
        {
          \"type\": \"mrkdwn\",
          \"text\": \"*에러 발생*\\n${error_rate}회\"
        }
      ]
    },
    {
      \"type\": \"section\",
      \"text\": {
        \"type\": \"mrkdwn\",
        \"text\": \"<$report_url|상세 리포트 보기>\"
      }
    }
  ]
}"

echo "[+] Slack 메시지 전송 시작"
curl -X POST -H 'Content-type: application/json' \
  --data "$slack_message" \
  "$SLACK_WEBHOOK_URL"

echo "부하 테스트가 완료되었습니다."