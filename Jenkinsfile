pipeline {
    agent any

    triggers {
        githubPush()
    }

    environment {
        GITHUB_REPO = "yejinj/docker-jenkins"
        // 공개 테스트 URL로 변경 (실제 서버가 실행 중이라면 원래 URL 사용)
        TARGET_URL = "https://httpbin.org/get"
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
                echo "코드 체크아웃 완료"
            }
        }
        
        stage('환경 설정 및 도구 확인') {
            steps {
                sh '''
                    echo "=== 시스템 정보 ==="
                    whoami
                    pwd
                    
                    echo "=== 도구 확인 ==="
                    # 도커 확인
                    docker --version || echo "도커가 설치되어 있지 않습니다"
                    
                    # curl 확인
                    curl --version || echo "curl이 설치되어 있지 않습니다"
                    
                    echo "=== 디렉토리 설정 ==="
                    mkdir -p results
                '''
            }
        }

        stage('타겟 서버 연결 테스트') {
            steps {
                sh '''
                    echo "타겟 서버 연결 확인 중..."
                    echo "타겟 URL: ${TARGET_URL}"
                    
                    # curl로 서버 접속 테스트
                    curl -v --max-time 10 ${TARGET_URL} > results/connection_test.txt 2>&1 || echo "타겟 서버에 연결할 수 없습니다." > results/connection_test.txt
                    
                    echo "연결 테스트 결과:" 
                    cat results/connection_test.txt
                '''
            }
        }

        stage('Docker를 이용한 성능 테스트') {
            when {
                expression {
                    // 도커 명령어를 실행할 수 있을 때만 실행
                    return sh(script: 'command -v docker >/dev/null 2>&1', returnStatus: true) == 0
                }
            }
            steps {
                script {
                    // 테스트 구성 파일 생성
                    def testYml = """
config:
  target: "${env.TARGET_URL}"
  phases:
    - duration: 5
      arrivalRate: 2
      name: "테스트 단계"
  http:
    timeout: 10
scenarios:
  - name: "기본 요청 테스트"
    flow:
      - get:
          url: "/"
"""
                    writeFile file: 'test.yml', text: testYml
                    
                    // 도커를 이용한 성능 테스트
                    sh '''
                        echo "Artillery를 이용한 성능 테스트 실행 중..."
                        
                        # 테스트 실행
                        docker run --rm -v $PWD:/app -w /app artilleryio/artillery \
                          run test.yml --output results/perf_result.json || \
                          echo '{"aggregate":{"counters":{"http":{"requestsCompleted":0,"requestsTimedOut":5}},"latency":{"median":"N/A"}}}' > results/perf_result.json
                        
                        # 결과 확인
                        cat results/perf_result.json
                        
                        # HTML 보고서 생성
                        docker run --rm -v $PWD:/app -w /app artilleryio/artillery \
                          report results/perf_result.json --output results/perf_report.html || \
                          echo "<html><body><h1>보고서 생성 실패</h1></body></html>" > results/perf_report.html
                    '''
                }
            }
        }
        
        stage('대체 성능 테스트 (Docker 없음)') {
            when {
                expression {
                    // 도커가 없을 때만 실행
                    return sh(script: 'command -v docker >/dev/null 2>&1', returnStatus: true) != 0
                }
            }
            steps {
                sh '''
                    echo "대체 성능 테스트 실행 중... (도커 없음)"
                    
                    # 간단한 성능 테스트 (curl 반복 실행)
                    echo "=== 간단한 성능 테스트 (curl 사용) ===" > results/simple_perf_test.txt
                    echo "타겟 URL: ${TARGET_URL}" >> results/simple_perf_test.txt
                    echo "요청 시간 (5회):" >> results/simple_perf_test.txt
                    
                    # 시작 시간
                    start_time=$(date +%s.%N)
                    
                    # 응답 시간 합계 및 성공 횟수 초기화
                    total_time=0
                    success_count=0
                    
                    # 5회 요청 실행
                    for i in {1..5}; do
                        req_start=$(date +%s.%N)
                        if curl -s -o /dev/null -w "%{http_code}" --max-time 5 ${TARGET_URL} | grep -q "200"; then
                            req_end=$(date +%s.%N)
                            req_time=$(echo "$req_end - $req_start" | bc)
                            total_time=$(echo "$total_time + $req_time" | bc)
                            success_count=$((success_count + 1))
                            echo "요청 $i: ${req_time}초 - 성공" >> results/simple_perf_test.txt
                        else
                            echo "요청 $i: 실패" >> results/simple_perf_test.txt
                        fi
                    done
                    
                    # 종료 시간
                    end_time=$(date +%s.%N)
                    total_duration=$(echo "$end_time - $start_time" | bc)
                    
                    # 결과 요약
                    echo "" >> results/simple_perf_test.txt
                    echo "=== 테스트 결과 요약 ===" >> results/simple_perf_test.txt
                    echo "총 소요 시간: ${total_duration}초" >> results/simple_perf_test.txt
                    echo "성공한 요청: $success_count / 5" >> results/simple_perf_test.txt
                    
                    if [ $success_count -gt 0 ]; then
                        avg_time=$(echo "scale=3; $total_time / $success_count" | bc)
                        echo "평균 응답 시간: ${avg_time}초" >> results/simple_perf_test.txt
                    else
                        echo "평균 응답 시간: N/A (모든 요청 실패)" >> results/simple_perf_test.txt
                    fi
                    
                    # 결과 출력
                    cat results/simple_perf_test.txt
                    
                    # JSON 결과 파일 생성
                    cat > results/perf_result.json << EOL
{
  "aggregate": {
    "counters": {
      "http": {
        "requestsCompleted": $success_count,
        "requestsTimedOut": $((5 - success_count))
      }
    },
    "latency": {
      "median": $([ $success_count -gt 0 ] && echo "$avg_time * 1000" | bc || echo "\"N/A\"")
    }
  }
}
EOL
                    
                    # 간단한 HTML 보고서 생성
                    cat > results/perf_report.html << 'EOL'
<!DOCTYPE html>
<html>
<head>
    <title>간단한 성능 테스트 결과</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .success { color: green; }
        .error { color: red; }
        .container { border: 1px solid #ddd; padding: 20px; border-radius: 5px; }
        pre { background-color: #f5f5f5; padding: 10px; border-radius: 5px; overflow-x: auto; }
    </style>
</head>
<body>
    <h1>간단한 성능 테스트 결과</h1>
    <div class="container">
        <h2>테스트 로그</h2>
        <pre id="test-log"></pre>
    </div>
    
    <script>
        // 테스트 로그 로드
        fetch('simple_perf_test.txt')
            .then(response => response.text())
            .then(data => {
                document.getElementById('test-log').textContent = data;
            })
            .catch(error => {
                console.error('Error:', error);
                document.getElementById('test-log').textContent = '테스트 로그를 로드할 수 없습니다.';
            });
    </script>
</body>
</html>
EOL
                '''
            }
        }

        stage('결과 분석') {
            steps {
                script {
                    // 연결 성공 여부 확인
                    def connected = sh(script: "grep -q '200 OK\\|\"status\": 200' results/connection_test.txt 2>/dev/null && echo 'true' || echo 'false'", returnStdout: true).trim()
                    env.CONNECTION_STATUS = connected == 'true' ? '성공' : '실패'
                    
                    // 성능 테스트 결과 확인 (Docker가 있는 경우)
                    if (sh(script: "test -f results/perf_result.json", returnStatus: true) == 0) {
                        env.REQUESTS = sh(script: "cat results/perf_result.json | grep -o '\"requestsCompleted\":[0-9]*' | cut -d':' -f2 || echo 0", returnStdout: true).trim()
                        env.ERRORS = sh(script: "cat results/perf_result.json | grep -o '\"requestsTimedOut\":[0-9]*' | cut -d':' -f2 || echo 0", returnStdout: true).trim()
                        env.LATENCY = sh(script: "cat results/perf_result.json | grep -o '\"median\":[0-9]*\\|\"median\":\"[^\"]*\"' | cut -d':' -f2 | tr -d '\"' || echo \"N/A\"", returnStdout: true).trim()
                    } else {
                        env.REQUESTS = '0'
                        env.ERRORS = '0'
                        env.LATENCY = 'N/A'
                    }
                    
                    echo "테스트 결과 요약: 연결 상태 = ${env.CONNECTION_STATUS}, 성공 요청 = ${env.REQUESTS}, 실패 = ${env.ERRORS}, 응답시간 = ${env.LATENCY}"
                }
            }
        }
    }

    post {
        always {
            archiveArtifacts artifacts: 'results/**', allowEmptyArchive: true
            echo "빌드 완료 - 상태: ${currentBuild.result ?: 'SUCCESS'}"
        }

        success {
            echo "빌드 성공"
            script {
                try {
                    def statusEmoji = env.CONNECTION_STATUS == '성공' ? '✅' : '⚠️'
                    def message = env.CONNECTION_STATUS == '성공' 
                        ? "서버 연결 성공! 테스트가 정상적으로 실행되었습니다." 
                        : "서버 연결 실패! 타겟 서버가 실행 중인지 확인하세요."
                    
                    withCredentials([string(credentialsId: 'slack-webhook', variable: 'SLACK_URL')]) {
                        sh """#!/bin/bash
                        curl -X POST -H 'Content-type: application/json' \
                          --data '{
                            "text":"${statusEmoji} 빌드 #${BUILD_NUMBER} 완료\\n- 연결 상태: ${env.CONNECTION_STATUS}\\n- ${message}\\n- 성공한 요청: ${env.REQUESTS}\\n- 평균 응답 시간: ${env.LATENCY} ms\\n- 타겟 URL: ${env.TARGET_URL}\\n- 상세 보고서: ${env.BUILD_URL}artifact/results/perf_report.html"
                          }' \
                          "${SLACK_URL}"
                        """
                    }
                } catch (Exception e) {
                    echo "Slack 알림 전송 실패: ${e.message}"
                }
            }
        }

        failure {
            echo "빌드 실패"
            script {
                try {
                    withCredentials([string(credentialsId: 'slack-webhook', variable: 'SLACK_URL')]) {
                        sh """#!/bin/bash
                        curl -X POST -H 'Content-type: application/json' \
                          --data '{
                            "text":"❌ 빌드 #${BUILD_NUMBER} 실패\\n- 파이프라인 실행 중 오류 발생\\n- 콘솔 출력: ${env.BUILD_URL}console"
                          }' \
                          "${SLACK_URL}"
                        """
                    }
                } catch (Exception e) {
                    echo "Slack 알림 전송 실패: ${e.message}"
                }
            }
        }
    }
}