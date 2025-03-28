#!/bin/bash

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$SCRIPT_DIR/../.."

ENV_PATH="$PROJECT_ROOT/.env"
YAML_FILE="$SCRIPT_DIR/performance-test.yml"
RESULT_DIR="$PROJECT_ROOT/results"

if [ -f "$ENV_PATH" ]; then
  export $(grep -v '^#' "$ENV_PATH" | xargs)
else
  echo "[!] .env 파일을 찾을 수 없습니다. SLACK_WEBHOOK_URL을 설정해주세요."
  exit 1
fi

timestamp=$(date +"%Y%m%d%H%M%S")
formatted_time=$(date "+%m월 %d일 %H시 %M분")
json_result="$RESULT_DIR/perf_result-$timestamp.json"

mkdir -p "$RESULT_DIR"

echo "성능 테스트 실행 시작"
artillery run "$YAML_FILE" -o "$json_result"

total_requests=$(jq '.aggregate.counters["http.requests"]' "$json_result")
response_time_mean=$(jq '.aggregate.summaries["http.response_time"].mean' "$json_result")
response_time_p95=$(jq '.aggregate.summaries["http.response_time"].p95' "$json_result")
response_time_p99=$(jq '.aggregate.summaries["http.response_time"].p99' "$json_result")
response_time_max=$(jq '.aggregate.summaries["http.response_time"].max' "$json_result")
response_time_min=$(jq '.aggregate.summaries["http.response_time"].min' "$json_result")
rps=$(jq '.aggregate.rates["http.request_rate"]' "$json_result")

fail_rate=$(awk "BEGIN { printf \"%.2f\", ($failed_vusers/$total_requests)*100 }")

if (( $(echo "$response_time_p95 >= ${MAX_P95_RESPONSE:-1000}" | bc -l) )); then
  status_text="경고"
elif (( $(echo "$response_time_mean >= ${MAX_AVG_RESPONSE:-500}" | bc -l) )); then
  status_text="주의"
else
  status_text="성공"
fi

build_url="http://223.130.153.17:8081/job/main-pipeline"
report_url="${build_url}/artifact/results/perf_result-$timestamp.json"

slack_message="{
  \"blocks\": [
    {
      \"type\": \"header\",
      \"text\": {
        \"type\": \"plain_text\",
        \"text\": \"성능 테스트 결과\"
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
          \"text\": \"*초당 처리량*\\n${rps}회\"
        },
        {
          \"type\": \"mrkdwn\",
          \"text\": \"*총 요청 수*\\n${total_requests}회\"
        },
        {
          \"type\": \"mrkdwn\",
          \"text\": \"*최소 응답 시간*\\n${response_time_min}ms\"
        },
        {
          \"type\": \"mrkdwn\",
          \"text\": \"*평균 응답 시간*\\n${response_time_mean}ms\"
        },
        {
          \"type\": \"mrkdwn\",
          \"text\": \"*P95 응답 시간*\\n${response_time_p95}ms\"
        },
        {
          \"type\": \"mrkdwn\",
          \"text\": \"*P99 응답 시간*\\n${response_time_p99}ms\"
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

echo "성능 테스트가 완료되었습니다."