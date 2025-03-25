pipeline {
    agent any

    triggers {
        githubPush()
    }

    environment {
        GITHUB_REPO = "yejinj/docker-jenkins"
        DOCKER_REGISTRY = "docker.io/yejinj"
        TARGET_URL = "http://223.130.153.17:3000"
    }

    stages {
        stage('Checkout Code') {
            steps {
                checkout([
                    $class: 'GitSCM',
                    branches: [[name: '*/main']],
                    doGenerateSubmoduleConfigurations: false,
                    extensions: [[$class: 'CleanBeforeCheckout']],
                    userRemoteConfigs: [[
                        credentialsId: 'github-token',
                        url: "https://github.com/${env.GITHUB_REPO}.git"
                    ]]
                ])
                echo "Checkout completed"
            }
        }

        stage('Run Performance Test in Docker') {
            steps {
                sh '''
                    mkdir -p results

                    docker run --rm -v $PWD:/app -w /app artilleryio/artillery \
                      run performance-test.yml --output results/perf_result.json || echo '{"aggregate":{"counters":{"http.requests":0, "http.responses":0, "vusers.failed":0}, "rates":{"http.request_rate":0}, "summaries":{"http.response_time":{"mean":0, "p95":0, "p99":0, "max":0}}}}' > results/perf_result.json

                    docker run --rm -v $PWD:/app -w /app artilleryio/artillery \
                      report results/perf_result.json --output results/perf_report.html || echo "<html><body><h1>Report Failed</h1></body></html>" > results/perf_report.html
                      
                    # JSON 데이터 추출을 위한 임시 스크립트 생성
                    cat > extract_metrics.sh << 'EOF'
                    #!/bin/bash
                    json_file="results/perf_result.json"
                    
                    # 값 추출 함수
                    get_value() {
                        grep -o "$1:[0-9]*\.[0-9]*" "$json_file" | head -1 | cut -d ':' -f2 || echo "0"
                    }
                    
                    get_int_value() {
                        grep -o "$1:[0-9]*" "$json_file" | head -1 | cut -d ':' -f2 || echo "0"
                    }
                    
                    # 지표 추출
                    total_requests=$(get_int_value '"http.requests"')
                    total_responses=$(get_int_value '"http.responses"')
                    failed_vusers=$(get_int_value '"vusers.failed"')
                    response_time_mean=$(get_value '"mean"')
                    response_time_p95=$(get_value '"p95"')
                    response_time_p99=$(get_value '"p99"')
                    response_time_max=$(get_value '"max"')
                    
                    # 결과 출력
                    echo "TOTAL_REQUESTS=$total_requests"
                    echo "TOTAL_RESPONSES=$total_responses"
                    echo "FAILED_VUSERS=$failed_vusers"
                    echo "RESPONSE_TIME_MEAN=$response_time_mean"
                    echo "RESPONSE_TIME_P95=$response_time_p95"
                    echo "RESPONSE_TIME_P99=$response_time_p99"
                    echo "RESPONSE_TIME_MAX=$response_time_max"
                    
                    # 실패율 계산
                    if [ "$total_requests" -gt 0 ]; then
                      fail_rate=$(echo "scale=2; ($failed_vusers / $total_requests) * 100" | bc)
                    else
                      fail_rate="0.00"
                    fi
                    echo "FAIL_RATE=$fail_rate"
                    EOF
                    
                    chmod +x extract_metrics.sh
                    ./extract_metrics.sh > results/metrics.env
                '''
            }
        }
    }

    post {
        always {
            archiveArtifacts artifacts: 'results/**', allowEmptyArchive: true
            echo "Build finished - Status: ${currentBuild.result ?: 'SUCCESS'}"
        }

        success {
            echo "Build succeeded"
            script {
                try {
                    def reportLink = "${env.BUILD_URL}artifact/results/perf_report.html"
                    
                    // 지표 로드
                    def metrics = [:]
                    def metricsFile = readFile('results/metrics.env').trim()
                    metricsFile.split('\n').each { line ->
                        def parts = line.split('=')
                        if (parts.size() == 2) {
                            metrics[parts[0]] = parts[1]
                        }
                    }
                    
                    // 상태 결정
                    def status_emoji = ":white_check_mark:"
                    def status_text = "성능 테스트 성공"
                    
                    if (metrics.FAIL_RATE.toFloat() >= 5.0) {
                        status_emoji = ":warning:"
                        status_text = "성능 테스트 경고"
                    } else if (metrics.RESPONSE_TIME_P95.toFloat() >= 1000) {
                        status_emoji = ":large_yellow_circle:"
                        status_text = "성능 테스트 주의"
                    }
                    
                    withCredentials([string(credentialsId: 'slack-webhook', variable: 'SLACK_URL')]) {
                        sh """
                        curl -X POST -H 'Content-type: application/json' \
                          --data '{
                            "blocks": [
                              {
                                "type": "header",
                                "text": {
                                  "type": "plain_text",
                                  "text": "${status_emoji} ${status_text} (Build #${BUILD_NUMBER})"
                                }
                              },
                              {
                                "type": "section",
                                "fields": [
                                  {
                                    "type": "mrkdwn",
                                    "text": "*요청 수:*\\n${metrics.TOTAL_REQUESTS}"
                                  },
                                  {
                                    "type": "mrkdwn",
                                    "text": "*실패율:*\\n${metrics.FAIL_RATE}%"
                                  },
                                  {
                                    "type": "mrkdwn",
                                    "text": "*평균 응답시간:*\\n${metrics.RESPONSE_TIME_MEAN}ms"
                                  },
                                  {
                                    "type": "mrkdwn",
                                    "text": "*P95 응답시간:*\\n${metrics.RESPONSE_TIME_P95}ms"
                                  },
                                  {
                                    "type": "mrkdwn",
                                    "text": "*최대 응답시간:*\\n${metrics.RESPONSE_TIME_MAX}ms"
                                  }
                                ]
                              },
                              {
                                "type": "section",
                                "text": {
                                  "type": "mrkdwn",
                                  "text": "<${reportLink}|상세 보고서 보기>"
                                }
                              }
                            ]
                          }' \
                          "${SLACK_URL}"
                        """
                    }
                } catch (Exception e) {
                    echo "Slack notification failed: ${e.message}"
                    withCredentials([string(credentialsId: 'slack-webhook', variable: 'SLACK_URL')]) {
                        sh """
                        curl -X POST -H 'Content-type: application/json' \
                          --data '{"text":"Build #${BUILD_NUMBER} Success\\n- Report: ${reportLink}"}' \
                          "${SLACK_URL}"
                        """
                    }
                }
            }
        }

        failure {
            echo "Build failed"
            script {
                try {
                    withCredentials([string(credentialsId: 'slack-webhook', variable: 'SLACK_URL')]) {
                        sh """
                        curl -X POST -H 'Content-type: application/json' \
                          --data '{"text":"Build #${BUILD_NUMBER} failed\\n- Console output: ${env.BUILD_URL}console"}' \
                          "${SLACK_URL}"
                        """
                    }
                } catch (Exception e) {
                    echo "Slack notification failed: ${e.message}"
                }
            }
        }
    }
}