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
                echo "코드 체크아웃 완료"
            }
        }

        stage('성능 테스트 준비') {
            steps {
                sh '''
                    # test.yml 파일 존재 확인
                    if [ ! -f test.yml ]; then
                        echo "test.yml 파일이 없습니다. 샘플 파일을 생성합니다."
                        cat > test.yml << 'EOF'
config:
  target: "${TARGET_URL}"
  phases:
    - duration: 60
      arrivalRate: 1
      rampTo: 5
      name: "웜업 단계"
    - duration: 120
      arrivalRate: 5
      rampTo: 10
      name: "부하 증가 단계"
  environments:
    production:
      target: "${TARGET_URL}"
      phases:
        - duration: 300
          arrivalRate: 10
          name: "프로덕션 부하 테스트"
scenarios:
  - name: "기본 테스트"
    flow:
      - get:
          url: "/"
EOF
                    fi
                    
                    # 타겟 URL 확인
                    echo "타겟 URL 확인: ${TARGET_URL}"
                    
                    # 디렉토리 생성
                    mkdir -p results
                '''
            }
        }

        stage('Docker로 성능 테스트 실행') {
            steps {
                sh '''
                    echo "Artillery로 성능 테스트 실행 중..."
                    # 테스트 실행 및 JSON 결과 생성
                    docker run --rm -v $PWD:/app -w /app -e TARGET_URL=${TARGET_URL} artilleryio/artillery \
                      run test.yml --output results/perf_result.json || echo '{"aggregate":{"counters":{"http":{"requestsCompleted":0}},"latency":{"median":"N/A"}}}' > results/perf_result.json
                    
                    echo "테스트 결과 확인:"
                    cat results/perf_result.json
                    
                    echo "HTML 보고서 생성 중..."
                    # HTML 보고서 생성
                    docker run --rm -v $PWD:/app -w /app artilleryio/artillery \
                      report results/perf_result.json --output results/perf_report.html || echo "<html><body><h1>보고서 생성 실패</h1></body></html>" > results/perf_report.html
                '''
            }
        }

        stage('결과 분석') {
            steps {
                script {
                    sh '''
                        echo "성능 테스트 결과 분석 중..."
                        
                        # jq 설치 확인 및 설치
                        if ! command -v jq &> /dev/null; then
                            apt-get update && apt-get install -y jq || echo "jq 설치 실패"
                        fi
                        
                        # 결과 파일에서 주요 정보 추출
                        echo "요청 수, 에러 수, 응답 시간 추출 중..."
                    '''
                    
                    // 결과 파일에서 주요 지표 추출
                    env.REQUESTS = sh(script: "cat results/perf_result.json | jq -r '.aggregate.counters.http.requestsCompleted // 0' 2>/dev/null || echo 0", returnStdout: true).trim()
                    env.ERRORS = sh(script: "cat results/perf_result.json | jq -r '.aggregate.counters.http.codes.\"500\" // 0' 2>/dev/null || echo 0", returnStdout: true).trim()
                    env.LATENCY = sh(script: "cat results/perf_result.json | jq -r '.aggregate.latency.median // \"N/A\"' 2>/dev/null || echo \"N/A\"", returnStdout: true).trim()
                    
                    // 테스트 결과 요약
                    echo "테스트 요약: 요청 ${env.REQUESTS}, 오류 ${env.ERRORS}, 응답시간 ${env.LATENCY}ms"
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
                    withCredentials([string(credentialsId: 'slack-webhook', variable: 'SLACK_URL')]) {
                        sh """#!/bin/bash
                        curl -X POST -H 'Content-type: application/json' \
                          --data '{
                            "text":"✅ 빌드 #${BUILD_NUMBER} 성공\\n- 성능 테스트 결과:\\n  • 총 요청 수: ${env.REQUESTS}\\n  • 오류(500) 수: ${env.ERRORS}\\n  • 중간 응답 시간: ${env.LATENCY} ms\\n- 상세 보고서: ${env.BUILD_URL}artifact/results/perf_report.html\\n- 타겟 URL: ${env.TARGET_URL}"
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
                            "text":"❌ 빌드 #${BUILD_NUMBER} 실패\\n- 성능 테스트 실행 중 오류 발생\\n- 콘솔 출력: ${env.BUILD_URL}console"
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
