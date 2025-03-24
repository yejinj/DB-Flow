#!/bin/bash

# .env 파일 경로 확인 (절대 경로 사용)
ENV_FILE="${WORKSPACE:-.}/.env"

# .env 파일 존재 여부 확인 및 출력 (디버깅용)
if [ -f "$ENV_FILE" ]; then
  echo "[INFO] Loading environment variables from $ENV_FILE"
  cat "$ENV_FILE" | grep -v "^#" | grep "SLACK_WEBHOOK"
  export $(grep -v '^#' "$ENV_FILE" | xargs)
else
  echo "[ERROR] .env file not found at: $ENV_FILE"
  # Jenkins 환경에서 fallback으로 credentials 사용
  if [ ! -z "$SLACK_WEBHOOK_URL" ]; then
    echo "[INFO] Using SLACK_WEBHOOK_URL from Jenkins credentials"
  else
    echo "[ERROR] SLACK_WEBHOOK_URL not found in environment"
    exit 1
  fi
fi

# Slack Webhook URL 검증
if [ -z "$SLACK_WEBHOOK_URL" ]; then
  echo "[ERROR] Missing required env variable: SLACK_WEBHOOK_URL"
  exit 1
else
  echo "[INFO] SLACK_WEBHOOK_URL is set (length: ${#SLACK_WEBHOOK_URL} characters)"
fi

required_vars=(SLACK_WEBHOOK_URL MAX_FAIL_RATE MAX_P95_RESPONSE)
for var in "${required_vars[@]}"; do
  if [ -z "${!var}" ]; then
    echo "[ERROR] Missing required env variable: $var"
    exit 1
  fi
done

timestamp=$(date +"%Y%m%d-%H%M%S")
test_type="${1:-standard}"
yaml_file="${test_type}-test.yml"

result_dir="results/${test_type}_${timestamp}"
mkdir -p "$result_dir"

json_result="${result_dir}/result.json"
html_report="${result_dir}/report.html"
config_file="${result_dir}/config.yml"

cp "$yaml_file" "$config_file" 2>/dev/null || {
  echo "[ERROR] Test configuration file $yaml_file not found."
  cat > "$config_file" << EOF
config:
  target: "http://localhost:3000"
  phases:
    - duration: 10
      arrivalRate: 5
  name: "$test_type Performance Test"
scenarios:
  - name: "Basic API Test"
    flow:
      - get:
          url: "/"
      - get:
          url: "/api/health"
EOF
  echo "[INFO] Created default test configuration file: $config_file"
}

monitor_resources() {
  local monitor_file="${result_dir}/resource_usage.log"
  
  echo "[INFO] Resource usage monitoring started"
  
  (
    echo "Timestamp,CPU(%),Memory(%),DiskIO(KB/s),NetworkIO(KB/s)" > "$monitor_file"
    
    while true; do
      local timestamp=$(date +"%H:%M:%S")
      local cpu=$(top -bn1 | grep "Cpu(s)" | awk '{print $2 + $4}')
      local mem=$(free | grep Mem | awk '{print $3/$2 * 100.0}')
      local disk=$(iostat -d -k 1 1 2>/dev/null | tail -n 2 | head -n 1 | awk '{print $6}' 2>/dev/null || echo "0")
      local net=$(sar -n DEV 1 1 2>/dev/null | grep -E '(eth0|ens)' | tail -n 1 | awk '{print ($5 + $6) / 1024}' 2>/dev/null || echo "0")
      
      echo "${timestamp},${cpu},${mem},${disk},${net}" >> "$monitor_file"
      sleep 1
      
      if [ ! -f "/proc/$PPID" ]; then
        break
      fi
    done
  ) &
  
  MONITOR_PID=$!
  echo $MONITOR_PID > "${result_dir}/monitor.pid"
}

stop_monitoring() {
  if [ -f "${result_dir}/monitor.pid" ]; then
    local pid=$(cat "${result_dir}/monitor.pid")
    if kill -0 $pid 2>/dev/null; then
      kill $pid
      echo "[INFO] Resource usage monitoring stopped"
    fi
  fi
}

monitor_resources
trap stop_monitoring EXIT

echo "[INFO] Running Artillery performance test..."
artillery run "$config_file" -o "$json_result"

echo "[INFO] Generating HTML report..."
artillery report "$json_result" -o "$html_report"

echo "[INFO] Processing results..."

req=$(jq -r '.aggregate.counters["http.requests"] // 0' "$json_result")
resp=$(jq -r '.aggregate.counters["http.responses"] // 0' "$json_result")
fail=$(jq -r '.aggregate.counters["vusers.failed"] // 0' "$json_result")

req=${req//null/0}
resp=${resp//null/0}
fail=${fail//null/0}

avg=$(jq -r '.aggregate.summaries["http.response_time"].mean // 0' "$json_result")
p95=$(jq -r '.aggregate.summaries["http.response_time"].p95 // 0' "$json_result")
p99=$(jq -r '.aggregate.summaries["http.response_time"].p99 // 0' "$json_result")
max=$(jq -r '.aggregate.summaries["http.response_time"].max // 0' "$json_result")

avg=${avg//null/0}
p95=${p95//null/0}
p99=${p99//null/0}
max=${max//null/0}

avg=$(printf "%.2f" $avg)
p95=$(printf "%.2f" $p95)
p99=$(printf "%.2f" $p99)
max=$(printf "%.2f" $max)

if [ "$req" -eq 0 ]; then
  fail_rate="0.00"
else
  fail_rate=$(awk "BEGIN { printf \"%.2f\", ($fail/$req)*100 }")
fi

if (( $(echo "$fail_rate > $MAX_FAIL_RATE" | bc -l) )) || (( $(echo "$p95 > $MAX_P95_RESPONSE" | bc -l) )); then
  overall_status="[WARNING] Performance issues detected"
  status_emoji="⚠️"
else
  overall_status="[SUCCESS] All tests passed"
  status_emoji="✅"
fi

trend_dir="results/trends"
mkdir -p "$trend_dir"

trend_file="${trend_dir}/performance_history.csv"
if [ ! -f "$trend_file" ]; then
  echo "Date,TestType,TotalRequests,FailRate,AvgResponseTime,P95ResponseTime,MaxResponseTime" > "$trend_file"
fi

echo "$(date +"%Y-%m-%d %H:%M:%S"),$test_type,$req,$fail_rate,$avg,$p95,$max" >> "$trend_file"

if command -v gnuplot &> /dev/null; then
  cat > "${trend_dir}/plot_trends.gnuplot" << EOF
set terminal pngcairo size 1200,800
set output '${trend_dir}/response_time_trend.png'
set title 'Response Time Trend'
set xlabel 'Test Run'
set ylabel 'Response Time (ms)'
set datafile separator ','
set key outside
set grid
plot '${trend_file}' using 0:5 with linespoints title 'Avg Response', \
     '${trend_file}' using 0:6 with linespoints title 'P95 Response', \
     '${trend_file}' using 0:7 with linespoints title 'Max Response'
EOF
  gnuplot "${trend_dir}/plot_trends.gnuplot" 2>/dev/null || echo "[WARNING] Failed to generate trend chart"
fi

compare_with_previous() {
  local prev_result=$(ls -1t results/*/result.json 2>/dev/null | head -n 2 | tail -n 1)
  
  if [ -z "$prev_result" ] || [ "$prev_result" == "$json_result" ]; then
    return
  fi
  
  local prev_avg=$(jq -r '.aggregate.summaries["http.response_time"].mean // 0' "$prev_result")
  local prev_p95=$(jq -r '.aggregate.summaries["http.response_time"].p95 // 0' "$prev_result")
  
  prev_avg=${prev_avg//null/0}
  prev_p95=${prev_p95//null/0}
  
  if (( $(echo "$prev_avg == 0" | bc -l) )); then prev_avg=0.01; fi
  if (( $(echo "$prev_p95 == 0" | bc -l) )); then prev_p95=0.01; fi
  
  local avg_diff=$(awk "BEGIN { printf \"%.2f\", $avg - $prev_avg }")
  local p95_diff=$(awk "BEGIN { printf \"%.2f\", $p95 - $prev_p95 }")
  
  local avg_percent=$(awk "BEGIN { printf \"%.2f\", ($avg_diff/$prev_avg)*100 }")
  local p95_percent=$(awk "BEGIN { printf \"%.2f\", ($p95_diff/$prev_p95)*100 }")
  
  local avg_emoji="🔄"
  if (( $(echo "$avg_diff < -1.0" | bc -l) )); then avg_emoji="🚀"; fi
  if (( $(echo "$avg_diff > 1.0" | bc -l) )); then avg_emoji="🐢"; fi
  
  local p95_emoji="🔄"
  if (( $(echo "$p95_diff < -1.0" | bc -l) )); then p95_emoji="🚀"; fi
  if (( $(echo "$p95_diff > 1.0" | bc -l) )); then p95_emoji="🐢"; fi
  
  echo "*Performance Change*:
- Average Response Time: ${avg_emoji} ${avg_diff}ms (${avg_percent}%)
- P95 Response Time: ${p95_emoji} ${p95_diff}ms (${p95_percent}%)"
}

comparison_results=$(compare_with_previous)

analyze_endpoints() {
  local endpoints=$(jq -r '.aggregate.summaries | keys[] | select(startswith("http.response_time"))' "$json_result" | grep -v "^http.response_time$")
  
  if [ -z "$endpoints" ]; then
    return
  fi
  
  local endpoint_analysis="*Endpoint Analysis*:\n"
  
  for endpoint in $endpoints; do
    local path=$(echo $endpoint | sed 's/http.response_time.//g')
    local mean=$(jq -r ".aggregate.summaries[\"$endpoint\"].mean // 0" "$json_result")
    local p95=$(jq -r ".aggregate.summaries[\"$endpoint\"].p95 // 0" "$json_result")
    local count=$(jq -r ".aggregate.counters[\"http.codes.200.$path\"] // 0" "$json_result")
    
    mean=${mean//null/0}
    p95=${p95//null/0}
    count=${count//null/0}
    
    mean=$(printf "%.2f" $mean)
    p95=$(printf "%.2f" $p95)
    
    endpoint_analysis+="- \`$path\`: $count requests, avg ${mean}ms, P95 ${p95}ms\n"
  done
  
  echo -e "$endpoint_analysis"
}

endpoint_results=$(analyze_endpoints)

retry_test() {
  local max_retries=3
  local retry_count=0
  local test_success=false
  local retry_summary=""
  
  while [ $retry_count -lt $max_retries ] && [ "$test_success" = false ]; do
    if (( $(echo "$fail_rate > $MAX_FAIL_RATE" | bc -l) )) || (( $(echo "$p95 > $MAX_P95_RESPONSE" | bc -l) )); then
      retry_count=$((retry_count + 1))
      echo "[WARN] Test failed, retrying $retry_count/$max_retries"
      
      local adjusted_config="${result_dir}/retry_config_${retry_count}.yml"
      cp "$config_file" "$adjusted_config"
      
      local current_rate=$(grep -oP 'arrivalRate: \K\d+' "$adjusted_config" || echo "5")
      local new_rate=$((current_rate / 2))
      if [ $new_rate -lt 1 ]; then new_rate=1; fi
      
      sed -i "s/arrivalRate: $current_rate/arrivalRate: $new_rate/g" "$adjusted_config"
      
      echo "[INFO] Reduced load to $new_rate rps, retrying..."
      artillery run "$adjusted_config" -o "${result_dir}/retry_result_${retry_count}.json"
      artillery report "${result_dir}/retry_result_${retry_count}.json" -o "${result_dir}/retry_report_${retry_count}.html"
      
      local new_req=$(jq -r '.aggregate.counters["http.requests"] // 0' "${result_dir}/retry_result_${retry_count}.json")
      local new_fail=$(jq -r '.aggregate.counters["vusers.failed"] // 0' "${result_dir}/retry_result_${retry_count}.json")
      local new_p95=$(jq -r '.aggregate.summaries["http.response_time"].p95 // 0' "${result_dir}/retry_result_${retry_count}.json")
      
      new_req=${new_req//null/0}
      new_fail=${new_fail//null/0}
      new_p95=${new_p95//null/0}
      
      local new_fail_rate=0
      if [ "$new_req" -gt 0 ]; then
        new_fail_rate=$(awk "BEGIN { printf \"%.2f\", ($new_fail/$new_req)*100 }")
      fi
      
      if (( $(echo "$new_fail_rate <= $MAX_FAIL_RATE" | bc -l) )) && (( $(echo "$new_p95 <= $MAX_P95_RESPONSE" | bc -l) )); then
        test_success=true
        echo "[INFO] Retry successful: test passed with reduced load"
        
        retry_summary="*Auto-Recovery Success*:
- Original load failed (${fail_rate}% failure rate, ${p95}ms P95)
- Succeeded after ${retry_count} retries (with load reduction)
- Reduced load: ${new_rate} rps (${current_rate} originally)
- New failure rate: ${new_fail_rate}%
- New P95: ${new_p95}ms
- Recovery report: $(realpath ${result_dir}/retry_report_${retry_count}.html)"
      fi
    else
      test_success=true
    fi
  done
  
  if [ "$test_success" = false ]; then
    echo "[ERROR] Maximum retry count exceeded"
    retry_summary="*Auto-Recovery Failed*:
- Test still failing after $max_retries retries
- Manual intervention required"
  fi
  
  echo "$retry_summary"
  return $([ "$test_success" = true ] && echo 0 || echo 1)
}

auto_scale_results=""
if [ "$test_type" == "auto" ]; then
  auto_scale_test() {
    local base_dir="results/auto_${timestamp}"
    mkdir -p "$base_dir"
    
    echo "[INFO] Starting auto-scale test - gradually increasing load"
    
    local phase_count=$(grep -c "^\s*- duration:" "$config_file")
    
    for i in $(seq 0 $((phase_count-1))); do
      local var_duration="config_autoScale_phases_${i}_duration"
      local var_rate="config_autoScale_phases_${i}_arrivalRate"
      
      local duration=${!var_duration}
      local rate=${!var_rate}
    done
  }
  
  auto_scale_results=$(auto_scale_test)
fi

retry_results=""
if (( $(echo "$fail_rate > $MAX_FAIL_RATE" | bc -l) )) || (( $(echo "$p95 > $MAX_P95_RESPONSE" | bc -l) )); then
  retry_results=$(retry_test)
  retry_result=$?
  
  if [ $retry_result -eq 0 ]; then
    overall_status="[SUCCESS] Recovered after retry"
  else
    overall_status="[CRITICAL] Failed even after retries"
  fi
fi

resource_analysis=""
if [ -f "${result_dir}/resource_usage.log" ]; then
  if [ $(wc -l < "${result_dir}/resource_usage.log") -gt 1 ]; then
    cpu_avg=$(awk -F ',' 'NR>1 {sum+=$2; count++} END {if(count>0) print sum/count; else print 0}' "${result_dir}/resource_usage.log")
    mem_avg=$(awk -F ',' 'NR>1 {sum+=$3; count++} END {if(count>0) print sum/count; else print 0}' "${result_dir}/resource_usage.log")
    cpu_max=$(awk -F ',' 'NR>1 {if($2>max) max=$2} END {print max}' "${result_dir}/resource_usage.log")
    mem_max=$(awk -F ',' 'NR>1 {if($3>max) max=$3} END {print max}' "${result_dir}/resource_usage.log")
    
    resource_analysis="*Resource Usage*:
- Avg CPU: $(printf "%.2f" $cpu_avg)% (Max: $(printf "%.2f" $cpu_max)%)
- Avg Memory: $(printf "%.2f" $mem_avg)% (Max: $(printf "%.2f" $mem_max)%)
- Detailed log: $(realpath ${result_dir}/resource_usage.log)"
  fi
fi

warning_message=""
if (( $(echo "$fail_rate > $MAX_FAIL_RATE" | bc -l) )); then
  warning_message+="- Fail rate exceeded (${fail_rate}% > ${MAX_FAIL_RATE}%)\n"
fi
if (( $(echo "$p95 > $MAX_P95_RESPONSE" | bc -l) )); then
  warning_message+="- p95 response time exceeded (${p95}ms > ${MAX_P95_RESPONSE}ms)\n"
fi

slack_message="*${status_emoji} Performance Test Summary*
Status: ${overall_status}

------------------------------
*Test: ${test_type}*
- Total Requests: ${req}
- Failed: ${fail} (${fail_rate}%)
- Avg Response Time: ${avg}ms
- P95 Response Time: ${p95}ms
- P99 Response Time: ${p99}ms
- Max Response Time: ${max}ms
- Report: $(realpath $html_report)"

if [ ! -z "$warning_message" ]; then
  slack_message="${slack_message}

*Warning:*
$(echo -e "$warning_message")"
fi

if [ ! -z "$comparison_results" ]; then
  slack_message="${slack_message}

${comparison_results}"
fi

if [ ! -z "$endpoint_results" ]; then
  slack_message="${slack_message}

$(echo -e "$endpoint_results")"
fi

if [ ! -z "$resource_analysis" ]; then
  slack_message="${slack_message}

${resource_analysis}"
fi

if [ ! -z "$retry_results" ]; then
  slack_message="${slack_message}

${retry_results}"
fi

if [ ! -z "$auto_scale_results" ]; then
  slack_message="${slack_message}

$(echo -e "$auto_scale_results")"
fi

if [ -f "${trend_dir}/response_time_trend.png" ]; then
  slack_message="${slack_message}

*Performance Trend:*
$(realpath ${trend_dir}/response_time_trend.png)"
fi

slack_payload=$(jq -n --arg text "$slack_message" '{"text": $text}')

echo "[INFO] Sending Slack notification..."
curl -X POST -H 'Content-type: application/json' \
  --data "$slack_payload" \
  "$SLACK_WEBHOOK_URL"

if [[ $overall_status == *"[WARNING]"* ]] || [[ $overall_status == *"[CRITICAL]"* ]]; then
  echo "[ERROR] Issues detected during tests."
  exit 1
else
  echo "[INFO] Performance tests completed successfully."
fi
 
parse_yaml() {
  local prefix=$2
  local s='[[:space:]]*' w='[a-zA-Z0-9_]*' fs=$(echo @|tr @ '\034')
  sed -ne "s|^\($s\):|\1|" \
       -e "s|^\($s\)\($w\)$s:$s[\"']\(.*\)[\"']$s\$|\1$fs\2$fs\3|p" \
       -e "s|^\($s\)\($w\)$s:$s\(.*\)$s\$|\1$fs\2$fs\3|p"  $1 |
  awk -F$fs '{
     indent = length($1)/2;
     vname[indent] = $2;
     for (i in vname) {if (i > indent) {delete vname[i]}}
     if (length($3) > 0) {
        vn=""; for (i=0; i<indent; i++) {vn=(vn)(vname[i])("_")}
        printf("%s%s=%s\n", "'$prefix'",vn$2,$3);
     }
  }'
}

config_file="performance-test.yml"
eval $(parse_yaml "$config_file" "config_")

TARGET="${config_server_target}"
MAX_FAIL_RATE="${config_thresholds_maxFailRate:-5.0}"
MAX_P95_RESPONSE="${config_thresholds_maxP95Response:-500}"
MAX_RETRIES="${config_retry_maxRetries:-3}"
LOAD_REDUCTION_FACTOR="${config_retry_loadReductionFactor:-2}"

if [ "$test_type" == "auto" ] && [ "${config_autoScale_enabled:-false}" == "true" ]; then
  # 이제 config_autoScale_phases_*_duration와 config_autoScale_phases_*_arrivalRate 값 사용
  auto_scale_test() {
    local base_dir="results/auto_${timestamp}"
    mkdir -p "$base_dir"
    
    echo "[INFO] Starting auto-scale test - gradually increasing load"
    
    local phase_count=$(grep -c "^\s*- duration:" "$config_file")
    
    for i in $(seq 0 $((phase_count-1))); do
      local var_duration="config_autoScale_phases_${i}_duration"
      local var_rate="config_autoScale_phases_${i}_arrivalRate"
      
      local duration=${!var_duration}
      local rate=${!var_rate}
    done
  }
fi
