#!/bin/bash

# .env 파일 로딩
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
else
  echo "[ERROR] .env file not found."
  exit 1
fi

# 필수 환경변수 확인
required_vars=(SLACK_WEBHOOK_URL MAX_FAIL_RATE MAX_P95_RESPONSE)
for var in "${required_vars[@]}"; do
  if [ -z "${!var}" ]; then
    echo "[ERROR] Missing required env variable: $var"
    exit 1
  fi
done

# 기본 설정
timestamp=$(date +"%Y%m%d-%H%M%S")
yaml_file="performance-db-test.yml"
result_dir="results/db_${timestamp}"
mkdir -p "$result_dir"

json_result="${result_dir}/result.json"
html_report="${result_dir}/report.html"

# Artillery 실행
echo "[INFO] Running DB performance test..."
artillery run "$yaml_file" -o "$json_result"

# HTML 리포트 생성
artillery report "$json_result" -o "$html_report"

# 결과 분석
req=$(jq -r '.aggregate.counters["http.requests"] // 0' "$json_result")
fail=$(jq -r '.aggregate.counters["vusers.failed"] // 0' "$json_result")
avg=$(jq -r '.aggregate.summaries["http.response_time"].mean // 0' "$json_result")
p95=$(jq -r '.aggregate.summaries["http.response_time"].p95 // 0' "$json_result")

avg=${avg//null/0}
p95=${p95//null/0}
fail_rate="0.00"
if [ "$req" -gt 0 ]; then
  fail_rate=$(awk "BEGIN { printf \"%.2f\", ($fail/$req)*100 }")
fi

status_emoji="✅"
status="DB Performance Test Passed"
exit_code=0

if (( $(echo "$fail_rate > $MAX_FAIL_RATE" | bc -l) )) || (( $(echo "$p95 > $MAX_P95_RESPONSE" | bc -l) )); then
  status_emoji="❌"
  status="DB Performance Test Failed"
  exit_code=1
fi

# Slack 메시지 전송
slack_message="*${status_emoji} ${status}*
- Total Requests: ${req}
- Failures: ${fail} (${fail_rate}%)
- Avg Response Time: ${avg}ms
- P95 Response Time: ${p95}ms
- Report: $(realpath $html_report)"

slack_payload=$(jq -n --arg text "$slack_message" '{"text": $text}')

echo "[INFO] Sending Slack notification..."
curl -X POST -H 'Content-type: application/json' \
  --data "$slack_payload" \
  "$SLACK_WEBHOOK_URL"

# 종료
exit $exit_code
