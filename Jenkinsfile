pipeline {
    agent any
    
    environment {
        SLACK_WEBHOOK_URL = credentials('slack-webhook-url')
    }
    
    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }
        
        stage('Build') {
            steps {
                sh 'npm install'
            }
        }
        
        stage('API Tests') {
            steps {
                sh 'npm run test:api'
            }
        }
        
        stage('Performance Test') {
            steps {
                sh '''
                    # 성능 테스트 실행
                    mkdir -p results
                    timestamp=$(date +"%Y%m%d-%H%M%S")
                    artillery run docker-jenkins/performance-test.yml -o results/perf_result.json
                    artillery report results/perf_result.json -o results/perf_report.html
                    
                    # 테스트 결과 추출
                    total_requests=$(jq '.aggregate.counters["http.requests"]' results/perf_result.json)
                    total_responses=$(jq '.aggregate.counters["http.responses"]' results/perf_result.json)
                    failed_vusers=$(jq '.aggregate.counters["vusers.failed"] // 0' results/perf_result.json)
                    response_time_mean=$(jq '.aggregate.summaries["http.response_time"].mean' results/perf_result.json)
                    response_time_p95=$(jq '.aggregate.summaries["http.response_time"].p95' results/perf_result.json)
                    response_time_max=$(jq '.aggregate.summaries["http.response_time"].max' results/perf_result.json)
                    rps=$(jq '.aggregate.rates["http.request_rate"]' results/perf_result.json)
                    
                    # 실패율 계산
                    fail_rate=$(awk "BEGIN { printf \\"%.2f\\", ($failed_vusers/$total_requests)*100 }")
                    
                    # 성공/실패 상태 결정
                    if (( $(echo "$fail_rate >= 5.0" | bc -l) )); then
                      status_emoji=":x:"
                      status_text="성능 테스트 실패"
                    elif (( $(echo "$response_time_p95 >= 1000" | bc -l) )); then
                      status_emoji=":warning:"
                      status_text="성능 테스트 주의"
                    else
                      status_emoji=":white_check_mark:"
                      status_text="성능 테스트 성공"
                    fi
                    
                    # 결과 저장 (다음 단계에서 사용)
                    echo "STATUS_EMOJI=$status_emoji" > perf_results.env
                    echo "STATUS_TEXT=$status_text" >> perf_results.env
                    echo "TOTAL_REQUESTS=$total_requests" >> perf_results.env
                    echo "FAIL_RATE=$fail_rate" >> perf_results.env
                    echo "RPS=$rps" >> perf_results.env
                    echo "RESPONSE_TIME_MEAN=$response_time_mean" >> perf_results.env
                    echo "RESPONSE_TIME_P95=$response_time_p95" >> perf_results.env
                    echo "RESPONSE_TIME_MAX=$response_time_max" >> perf_results.env
                '''
            }
            post {
                always {
                    archiveArtifacts artifacts: 'results/**', allowEmptyArchive: true
                }
            }
        }
    }
    
    post {
        always {
            script {
                def props = readProperties file: 'perf_results.env'
                def reportUrl = "${env.BUILD_URL}artifact/results/perf_report.html"
                
                def slackMessage = """
                {
                  "blocks": [
                    {
                      "type": "header",
                      "text": {
                        "type": "plain_text",
                        "text": "${props.STATUS_EMOJI} ${props.STATUS_TEXT} (Build #${env.BUILD_NUMBER})"
                      }
                    },
                    {
                      "type": "section",
                      "fields": [
                        {
                          "type": "mrkdwn",
                          "text": "*요청 수:*\\n${props.TOTAL_REQUESTS}"
                        },
                        {
                          "type": "mrkdwn",
                          "text": "*실패율:*\\n${props.FAIL_RATE}%"
                        },
                        {
                          "type": "mrkdwn",
                          "text": "*초당 요청:*\\n${props.RPS}"
                        },
                        {
                          "type": "mrkdwn",
                          "text": "*평균 응답시간:*\\n${props.RESPONSE_TIME_MEAN}ms"
                        },
                        {
                          "type": "mrkdwn",
                          "text": "*P95 응답시간:*\\n${props.RESPONSE_TIME_P95}ms"
                        },
                        {
                          "type": "mrkdwn",
                          "text": "*최대 응답시간:*\\n${props.RESPONSE_TIME_MAX}ms"
                        }
                      ]
                    },
                    {
                      "type": "section",
                      "text": {
                        "type": "mrkdwn",
                        "text": "<${reportUrl}|상세 보고서 보기>"
                      }
                    }
                  ]
                }
                """
                
                sh """
                    curl -X POST -H 'Content-type: application/json' \
                    --data '${slackMessage}' \
                    ${SLACK_WEBHOOK_URL}
                """
            }
        }
        success {
            echo 'Build and tests passed!'
        }
        failure {
            echo 'Build or tests failed!'
        }
    }
}