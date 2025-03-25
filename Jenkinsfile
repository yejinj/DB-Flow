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

        stage('타겟 서버 연결 테스트') {
            steps {
                sh '''
                    echo "타겟 서버 연결 확인 중..."
                    # 타겟 URL 접속 테스트
                    apt-get update && apt-get install -y curl || true
                    
                    echo "타겟 URL: ${TARGET_URL}"
                    
                    # curl로 서버 접속 테스트
                    curl -v --max-time 10 ${TARGET_URL} || echo "타겟 서버에 연결할 수 없습니다."
                    
                    # 핑 테스트
                    apt-get install -y iputils-ping || true
                    ping -c 3 223.130.153.17 || echo "서버에 ping할 수 없습니다."
                '''
            }
        }

        stage('성능 테스트 준비') {
            steps {
                script {
                    // 환경 변수를 직접 치환한 test.yml 생성
                    def testYml = """
config:
  target: "${env.TARGET_URL}"
  phases:
    - duration: 10
      arrivalRate: 5
      name: "간단한 테스트"
  http:
    timeout: 10
scenarios:
  - name: "기본 테스트"
    flow:
      - get:
          url: "/"
"""
                    writeFile file: 'test.yml', text: testYml
                    
                    sh '''
                        echo "생성된 test.yml 내용:"
                        cat test.yml
                        
                        # 디렉토리 생성
                        mkdir -p results
                    '''
                }
            }
        }

        stage('간단한 HTTP 요청 테스트') {
            steps {
                sh '''
                    echo "간단한 HTTP 요청 테스트 실행 중..."
                    
                    # 직접 curl로 요청 테스트
                    curl -v --max-time 10 ${TARGET_URL} > results/curl_test.txt 2>&1 || echo "요청 실패" > results/curl_test.txt
                    
                    echo "curl 테스트 결과:"
                    cat results/curl_test.txt
                '''
            }
        }

        stage('Docker로 성능 테스트 실행') {
            steps {
                sh '''
                    echo "Artillery로 성능 테스트 실행 중..."
                    
                    # Docker가 설치되어 있는지 확인
                    docker --version || (echo "Docker가 설치되어 있지 않습니다" && exit 1)
                    
                    # Docker 네트워크 테스트
                    docker run --rm alpine ping -c 3 223.130.153.17 || echo "Docker 컨테이너에서 서버에 ping할 수 없습니다."
                    
                    # 테스트 실행 - 명시적 타겟 지정
                    docker run --rm -v $PWD:/app -w /app artilleryio/artillery \
                      run test.yml --target ${TARGET_URL} --output results/perf_result.json || \
                      echo '{"aggregate":{"counters":{"http":{"requestsCompleted":0}},"latency":{"median":"N/A"}}}' > results/perf_result.json
                    
                    echo "테스트 결과 확인:"
                    cat results/perf_result.json
                    
                    # HTML 보고서 생성
                    docker run --rm -v $PWD:/app -w /app artilleryio/artillery \
                      report results/perf_result.json --output results/perf_report.html || \
                      echo "<html><body><h1>테스트가 실행되지 않았거나 타겟 서버에 연결할 수 없습니다</h1></body></html>" > results/perf_report.html
                '''
            }
        }

        stage('결과 분석') {
            steps {
                script {
                    sh '''
                        echo "성능 테스트 결과 분석 중..."
                        
                        # jq 설치
                        apt-get update && apt-get install -y jq || echo "jq 설치 실패"
                        
                        # 결과 파일 확인
                        ls -la results/
                    '''
                    
                    // curl 테스트 결과 확인
                    env.CURL_STATUS = sh(script: "grep -q '200 OK' results/curl_test.txt && echo '성공' || echo '실패'", returnStdout: true).trim()
                    
                    // 결과 파일에서 주요 지표 추출
                    env.REQUESTS = sh(script: "cat results/perf_result.json | jq -r '.aggregate.counters.http.requestsCompleted // 0' 2>/dev/null || echo 0", returnStdout: true).trim()
                    env.ERRORS = sh(script: "cat results/perf_result.json | jq -r '.aggregate.counters.http.codes.\"500\" // 0' 2>/dev/null || echo 0", returnStdout: true).trim()
                    env.LATENCY = sh(script: "cat results/perf_result.json | jq -r '.aggregate.latency.median // \"N/A\"' 2>/dev/null || echo \"N/A\"", returnStdout: true).trim()
                    
                    // 테스트 결과 요약
                    echo "테스트 요약: 요청 ${env.REQUESTS}, 오류 ${env.ERRORS}, 응답시간 ${env.LATENCY}ms, curl 테스트 ${env.CURL_STATUS}"
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
                            "text":"✅ 빌드 #${BUILD_NUMBER} 성공\\n- 성능 테스트 결과:\\n  • 총 요청 수: ${env.REQUESTS}\\n  • 오류(500) 수: ${env.ERRORS}\\n  • 중간 응답 시간: ${env.LATENCY} ms\\n  • 직접 HTTP 요청: ${env.CURL_STATUS}\\n- 상세 보고서: ${env.BUILD_URL}artifact/results/perf_report.html\\n- 타겟 URL: ${env.TARGET_URL}"
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
