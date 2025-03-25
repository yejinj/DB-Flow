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

                    # 기존 테스트 실행 유지
                    docker run --rm -v $PWD:/app -w /app artilleryio/artillery \
                      run performance-test.yml --output results/perf_result.json || echo '{"aggregate":{"counters":{"http.requests":0, "http.responses":0, "vusers.failed":0},"summaries":{"http.response_time":{"mean":0, "p95":0, "p99":0, "max":0}}}}' > results/perf_result.json

                    docker run --rm -v $PWD:/app -w /app artilleryio/artillery \
                      report results/perf_result.json --output results/perf_report.html || echo "<html><body><h1>Report Failed</h1></body></html>" > results/perf_report.html
                '''
            }
        }

        stage('Extract Performance Metrics') {
            steps {
                sh '''
                    # 성능 지표 추출 (간단한 방식 사용)
                    grep -o '"http.requests":[0-9]*' results/perf_result.json | cut -d ':' -f2 > results/total_requests.txt || echo "0" > results/total_requests.txt
                    grep -o '"http.responses":[0-9]*' results/perf_result.json | cut -d ':' -f2 > results/total_responses.txt || echo "0" > results/total_responses.txt
                    grep -o '"vusers.failed":[0-9]*' results/perf_result.json | cut -d ':' -f2 > results/failed_vusers.txt || echo "0" > results/failed_vusers.txt
                    
                    grep -o '"mean":[0-9]*\\.[0-9]*' results/perf_result.json | head -1 | cut -d ':' -f2 > results/mean_response.txt || echo "0" > results/mean_response.txt
                    grep -o '"p95":[0-9]*\\.[0-9]*' results/perf_result.json | head -1 | cut -d ':' -f2 > results/p95_response.txt || echo "0" > results/p95_response.txt
                    grep -o '"max":[0-9]*\\.[0-9]*' results/perf_result.json | head -1 | cut -d ':' -f2 > results/max_response.txt || echo "0" > results/max_response.txt
                    
                    # 실패율 계산
                    total_req=$(cat results/total_requests.txt)
                    failed_vu=$(cat results/failed_vusers.txt)
                    
                    if [ "$total_req" -gt 0 ]; then
                      echo "scale=2; ($failed_vu / $total_req) * 100" | bc > results/fail_rate.txt
                    else
                      echo "0.00" > results/fail_rate.txt
                    fi
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
                    
                    // 메트릭 파일에서 값 읽기
                    def totalRequests = readFile('results/total_requests.txt').trim()
                    def totalResponses = readFile('results/total_responses.txt').trim()
                    def failRate = readFile('results/fail_rate.txt').trim()
                    def meanResponse = readFile('results/mean_response.txt').trim()
                    def p95Response = readFile('results/p95_response.txt').trim()
                    def maxResponse = readFile('results/max_response.txt').trim()
                    
                    // 결과 상태 결정
                    def statusEmoji = ":white_check_mark:"
                    def statusText = "성능 테스트 성공"
                    
                    if (failRate.toFloat() >= 5.0) {
                        statusEmoji = ":warning:"
                        statusText = "성능 테스트 경고"
                    } else if (p95Response.toFloat() >= 1000) {
                        statusEmoji = ":large_yellow_circle:"
                        statusText = "성능 테스트 주의"
                    }
                    
                    withCredentials([string(credentialsId: 'slack-webhook', variable: 'SLACK_URL')]) {
                        // 기존 방식과 유사하게 단순한 텍스트 메시지 사용
                        def message = """${statusEmoji} ${statusText} (Build #${BUILD_NUMBER})
- 요청 수: ${totalRequests}개
- 응답 수: ${totalResponses}개
- 실패율: ${failRate}%
- 평균 응답시간: ${meanResponse}ms
- P95 응답시간: ${p95Response}ms
- 최대 응답시간: ${maxResponse}ms
- 보고서: ${reportLink}"""
                        
                        sh """
                        curl -X POST -H 'Content-type: application/json' \
                          --data '{"text":"${message}"}' \
                          "${SLACK_URL}"
                        """
                    }
                } catch (Exception e) {
                    echo "Slack notification failed: ${e.message}"
                    // 실패시 기존 방식으로 대체
                    def reportLink = "${env.BUILD_URL}artifact/results/perf_report.html"
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