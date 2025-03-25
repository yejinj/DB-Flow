    #!/bin/bash

if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
else
  echo "[!] .env file not found. Please set SLACK_WEBHOOK_URL."
  exit 1
fi

timestamp=$(date +"%Y%m%d-%H%M%S")
yaml_file="performance-test.yml"

mkdir -p results

json_result="results/perf_result-$timestamp.json"
html_report="results/perf_report-$timestamp.html"

echo "Running Artillery performance test..."
artillery run "$yaml_file" -o "$json_result"

echo "Generating HTML report..."
artillery report "$json_result" -o "$html_report"

# 테스트 결과 데이터 추출
total_requests=$(jq '.aggregate.counters["http.requests"]' "$json_result")
total_responses=$(jq '.aggregate.counters["http.responses"]' "$json_result")
failed_vusers=$(jq '.aggregate.counters["vusers.failed"] // 0' "$json_result")
response_time_mean=$(jq '.aggregate.summaries["http.response_time"].mean' "$json_result")
response_time_p95=$(jq '.aggregate.summaries["http.response_time"].p95' "$json_result")
response_time_p99=$(jq '.aggregate.summaries["http.response_time"].p99' "$json_result")
response_time_max=$(jq '.aggregate.summaries["http.response_time"].max' "$json_result")
rps=$(jq '.aggregate.rates["http.request_rate"]' "$json_result")

# 실패율 계산
fail_rate=$(awk "BEGIN { printf \"%.2f\", ($failed_vusers/$total_requests)*100 }")

# 상태 결정
if (( $(echo "$fail_rate >= 5.0" | bc -l) )); then
  status_emoji=":warning:"
  status_text="성능 테스트 경고"
elif (( $(echo "$response_time_p95 >= 1000" | bc -l) )); then
  status_emoji=":large_yellow_circle:"
  status_text="성능 테스트 주의"
else
  status_emoji=":white_check_mark:"
  status_text="성능 테스트 성공"
fi

# Jenkins 링크 생성 (환경 변수에서 가져오기)
build_url=${BUILD_URL:-"http://223.130.153.17:8080/job/main-pipeline/$BUILD_NUMBER"}
report_url="${build_url}/artifact/results/perf_report-$timestamp.html"

# 슬랙 메시지 작성
slack_message="{
  \"blocks\": [
    {
      \"type\": \"header\",
      \"text\": {
        \"type\": \"plain_text\",
        \"text\": \"$status_emoji $status_text (Build #${BUILD_NUMBER:-N/A})\"
      }
    },
    {
      \"type\": \"section\",
      \"fields\": [
        {
          \"type\": \"mrkdwn\",
          \"text\": \"*요청 수:*\\n$total_requests\"
        },
        {
          \"type\": \"mrkdwn\",
          \"text\": \"*실패율:*\\n${fail_rate}%\"
        },
        {
          \"type\": \"mrkdwn\",
          \"text\": \"*초당 요청:*\\n${rps}\"
        },
        {
          \"type\": \"mrkdwn\",
          \"text\": \"*평균 응답시간:*\\n${response_time_mean}ms\"
        },
        {
          \"type\": \"mrkdwn\",
          \"text\": \"*P95 응답시간:*\\n${response_time_p95}ms\"
        },
        {
          \"type\": \"mrkdwn\",
          \"text\": \"*최대 응답시간:*\\n${response_time_max}ms\"
        }
      ]
    },
    {
      \"type\": \"section\",
      \"text\": {
        \"type\": \"mrkdwn\",
        \"text\": \"<$report_url|상세 보고서 보기>\"
      }
    }
  ]
}"

echo "[+] Sending Slack message..."
curl -X POST -H 'Content-type: application/json' \
  --data "$slack_message" \
  "$SLACK_WEBHOOK_URL"

echo "Performance test completed."