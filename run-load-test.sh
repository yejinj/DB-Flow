timestamp=$(date +"%Y%m%d-%H%M%S")
yaml_file="load-test.yml"
json_result="result-$timestamp.json"
html_report="report-$timestamp.html"

echo "[+] Running Artillery load test..."
artillery run "$yaml_file" -o "$json_result"

echo "[+] Generating HTML report..."
artillery report "$json_result" -o "$html_report"

requests=$(jq '.aggregate.counters["http.requests"]' "$json_result")
responses=$(jq '.aggregate.counters["http.responses"] // 0' "$json_result")
failures=$(jq '.aggregate.counters["vusers.failed"] // 0' "$json_result")
mean_response_time=$(jq '.aggregate.summaries["http.response_time"].mean' "$json_result")

slack_webhook_url="https://hooks.slack.com/services/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"
slack_channel="#ncp-project-1"

slack_message="Artillery 부하 테스트 완료
시간: $timestamp
총 요청 수: $requests
성공 응답 수: $responses
실패 수: $failures
평균 응답 시간: ${mean_response_time}ms
결과 파일: $json_result
리포트 파일: $html_report"

echo "[+] Sending Slack summary..."
curl -X POST -H 'Content-type: application/json' \
  --data "{\"text\": \"$slack_message\"}" \
  "$slack_webhook_url"

echo "테스트 완료 및 요약 전송 완료"