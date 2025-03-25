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
                    timestamp=$(date +"%Y%m%d-%H%M%S")
                    
                    # 성능 테스트 실행 및 결과 저장
                    docker run --rm -v $PWD:/app -w /app artilleryio/artillery \
                      run performance-test.yml --output results/perf_result.json || echo '{"aggregate":{"counters":{"http.requests":0, "http.responses":0, "vusers.failed":0}, "rates":{"http.request_rate":0}, "summaries":{"http.response_time":{"mean":0, "p95":0, "p99":0, "max":0}}}}' > results/perf_result.json

                    # HTML 보고서 생성
                    docker run --rm -v $PWD:/app -w /app artilleryio/artillery \
                      report results/perf_result.json --output results/perf_report.html || echo "<html><body><h1>Report Failed</h1></body></html>" > results/perf_report.html
                      
                    # 테스트 결과 추출
                    total_requests=$(cat results/perf_result.json | grep -o '"http.requests":[0-9]*' | cut -d ':' -f2 || echo 0)
                    total_responses=$(cat results/perf_result.json | grep -o '"http.responses":[0-9]*' | cut -d ':' -f2 || echo 0)
                    failed_vusers=$(cat results/perf_result.json | grep -o '"vusers.failed":[0-9]*' | cut -d ':' -f2 || echo 0)
                    response_time_mean=$(cat results/perf_result.json | grep -o '"mean":[0-9]*.[0-9]*' | head -1 | cut -d ':' -f2 || echo 0)
                    response_time_p95=$(cat results/perf_result.json | grep -o '"p95":[0-9]*.[0-9]*' | head -1 | cut -d ':' -f2 || echo 0)
                    response_time_p99=$(cat results/perf_result.json | grep -o '"p99":[0-9]*.[0-9]*' | head -1 | cut -d ':' -f2 || echo 0)
                    response_time_max=$(cat results/perf_result.json | grep -o '"max":[0-9]*.[0-9]*' | head -1 | cut -d ':' -f2 || echo 0)
                    rps=$(cat results/perf_result.json | grep -o '"http.request_rate":[0-9]*.[0-9]*' | cut -d ':' -f2 || echo 0)
                    
                    # 수치 소수점 2자리로 반올림
                    response_time_mean=$(printf "%.2f" $response_time_mean)
                    response_time_p95=$(printf "%.2f" $response_time_p95)
                    response_time_p99=$(printf "%.2f" $response_time_p99)
                    response_time_max=$(printf "%.2f" $response_time_max)
                    rps=$(printf "%.2f" $rps)
                    
                    # 실패율 계산
                    if [ "$total_requests" -gt 0 ]; then
                      fail_rate=$(echo "scale=2; ($failed_vusers / $total_requests) * 100" | bc)
                    else
                      fail_rate="0.00"
                    fi
                    
                    # 결과 저장
                    echo "$total_requests" > results/total_requests.txt
                    echo "$total_responses" > results/total_responses.txt
                    echo "$failed_vusers" > results/failed_vusers.txt
                    echo "$response_time_mean" > results/response_time_mean.txt
                    echo "$response_time_p95" > results/response_time_p95.txt
                    echo "$response_time_p99" > results/response_time_p99.txt
                    echo "$response_time_max" > results/response_time_max.txt
                    echo "$rps" > results/rps.txt
                    echo "$fail_rate" > results/fail_rate.txt
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
                    
                    // 테스트 결과 가져오기
                    def total_requests = sh(script: 'cat results/total_requests.txt', returnStdout: true).trim()
                    def total_responses = sh(script: 'cat results/total_responses.txt', returnStdout: true).trim()
                    def failed_vusers = sh(script: 'cat results/failed_vusers.txt', returnStdout: true).trim()
                    def response_time_mean = sh(script: 'cat results/response_time_mean.txt', returnStdout: true).trim()
                    def response_time_p95 = sh(script: 'cat results/response_time_p95.txt', returnStdout: true).trim()
                    def response_time_p99 = sh(script: 'cat results/response_time_p99.txt', returnStdout: true).trim()
                    def response_time_max = sh(script: 'cat results/response_time_max.txt', returnStdout: true).trim()
                    def rps = sh(script: 'cat results/rps.txt', returnStdout: true).trim()
                    def fail_rate = sh(script: 'cat results/fail_rate.txt', returnStdout: true).trim()
                    
                    // 상태 결정
                    def status_emoji = ":white_check_mark:"
                    def status_text = "성능 테스트 성공"
                    
                    if (fail_rate.toDouble() >= 5.0) {
                        status_emoji = ":warning:"
                        status_text = "성능 테스트 경고"
                    } else if (response_time_p95.toDouble() >= 1000) {
                        status_emoji = ":large_yellow_circle:"
                        status_text = "성능 테스트 주의"
                    }
                    
                    withCredentials([string(credentialsId: 'slack-webhook', variable: 'SLACK_URL')]) {
                        def slackMessage = """
                        {
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
                                  "text": "*요청 수:*\\n${total_requests}"
                                },
                                {
                                  "type": "mrkdwn",
                                  "text": "*실패율:*\\n${fail_rate}%"
                                },
                                {
                                  "type": "mrkdwn",
                                  "text": "*초당 요청:*\\n${rps}"
                                },
                                {
                                  "type": "mrkdwn",
                                  "text": "*평균 응답시간:*\\n${response_time_mean}ms"
                                },
                                {
                                  "type": "mrkdwn",
                                  "text": "*P95 응답시간:*\\n${response_time_p95}ms"
                                },
                                {
                                  "type": "mrkdwn",
                                  "text": "*최대 응답시간:*\\n${response_time_max}ms"
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
                        }
                        """
                        
                        sh """
                        curl -X POST -H 'Content-type: application/json' \
                          --data '${slackMessage}' \
                          "${SLACK_URL}"
                        """
                    }
                } catch (Exception e) {
                    echo "Slack notification failed: ${e.message}"
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
                          --data '{"text":":x: Build #${BUILD_NUMBER} 실패\\n- 콘솔 출력: ${env.BUILD_URL}console"}' \
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