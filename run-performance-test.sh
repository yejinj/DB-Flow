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

total_requests=$(jq '.aggregate.counters["http.requests"]' "$json_result")
total_responses=$(jq '.aggregate.counters["http.responses"]' "$json_result")
failed_vusers=$(jq '.aggregate.counters["vusers.failed"] // 0' "$json_result")
response_time_mean=$(jq '.aggregate.summaries["http.response_time"].mean' "$json_result")
response_time_p95=$(jq '.aggregate.summaries["http.response_time"].p95' "$json_result")
response_time_p99=$(jq '.aggregate.summaries["http.response_time"].p99' "$json_result")
response_time_max=$(jq '.aggregate.summaries["http.response_time"].max' "$json_result")
rps=$(jq '.aggregate.rates["http.request_rate"]' "$json_result")

fail_rate=$(awk "BEGIN { printf \"%.2f\", ($failed_vusers/$total_requests)*100 }")

if (( $(echo "$fail_rate >= 5.0" | bc -l) )); then
  status_emoji=""
  status_text="Warning"
elif (( $(echo "$response_time_p95 >= 1000" | bc -l) )); then
  status_emoji=""
  status_text="Caution"
else
  status_emoji=""
  status_text="Success"
fi

build_url=${BUILD_URL:-"http://223.130.153.17:8080/job/main-pipeline/$BUILD_NUMBER"}
report_url="${build_url}/artifact/results/perf_report-$timestamp.html"

slack_message="{
  \"blocks\": [
    {
      \"type\": \"header\",
      \"text\": {
        \"type\": \"plain_text\",
        \"text\": \"$status_text (Build #${BUILD_NUMBER:-N/A})\"
      }
    },
    {
      \"type\": \"section\",
      \"fields\": [
        {
          \"type\": \"mrkdwn\",
          \"text\": \"*Requests:*\\n$total_requests\"
        },
        {
          \"type\": \"mrkdwn\",
          \"text\": \"*Failure Rate:*\\n${fail_rate}%\"
        },
        {
          \"type\": \"mrkdwn\",
          \"text\": \"*RPS:*\\n${rps}\"
        },
        {
          \"type\": \"mrkdwn\",
          \"text\": \"*Avg Response Time:*\\n${response_time_mean}ms\"
        },
        {
          \"type\": \"mrkdwn\",
          \"text\": \"*P95 Response Time:*\\n${response_time_p95}ms\"
        },
        {
          \"type\": \"mrkdwn\",
          \"text\": \"*Max Response Time:*\\n${response_time_max}ms\"
        }
      ]
    },
    {
      \"type\": \"section\",
      \"text\": {
        \"type\": \"mrkdwn\",
        \"text\": \"<$report_url|View detailed report>\"
      }
    }
  ]
}"

echo "[+] Sending Slack message..."
curl -X POST -H 'Content-type: application/json' \
  --data "$slack_message" \
  "$SLACK_WEBHOOK_URL"

echo "Performance test completed."