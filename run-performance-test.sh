if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
else
  echo "[!] .env file not found. Please set SLACK_WEBHOOK_URL."
  exit 1
fi

timestamp=$(date +"%Y%m%d-%H%M%S")
yaml_file="performance-test.yml"

mkdir -p results

json_result="results/result-$timestamp.json"
html_report="results/report-$timestamp.html"

echo "Running Artillery performance test..."
artillery run "$yaml_file" -o "$json_result"

echo "Generating HTML report..."
artillery report "$json_result" -o "$html_report"

total_requests=$(jq '.aggregate.counters["http.requests"]' "$json_result")
total_responses=$(jq '.aggregate.counters["http.responses"]' "$json_result")
failed_vusers=$(jq '.aggregate.counters["vusers.failed"]' "$json_result")
response_time_mean=$(jq '.aggregate.summaries["http.response_time"].mean' "$json_result")
response_time_p95=$(jq '.aggregate.summaries["http.response_time"].p95' "$json_result")
response_time_p99=$(jq '.aggregate.summaries["http.response_time"].p99' "$json_result")
response_time_max=$(jq '.aggregate.summaries["http.response_time"].max' "$json_result")
fail_rate=$(awk "BEGIN { printf \"%.2f\", ($failed_vusers/$total_requests)*100 }")

if (( $(echo "$fail_rate >= 5.0" | bc -l) )); then
  status_text="\n[Performance Warning]\n"
else
  status_text="\n[Performance OK]\n"
fi

slack_message="$status_text\nTimestamp: $timestamp\nResult file: $json_result\nReport file: $html_report\n\nSummary:\n- Total requests: $total_requests\n- Responses: $total_responses\n- Failed users: $failed_vusers (Fail rate: ${fail_rate}%)\n- Avg response time: ${response_time_mean}ms\n- p95 response time: ${response_time_p95}ms\n- p99 response time: ${response_time_p99}ms\n- Max response time: ${response_time_max}ms"

echo "[+] Sending Slack message..."
curl -X POST -H 'Content-type: application/json' \
  --data "{\"text\":\"$slack_message\"}" \
  "$SLACK_WEBHOOK_URL"

echo "Load test completed."
