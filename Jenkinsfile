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

        stage('Install Dependencies') {
            steps {
                sh '''
                    echo "npm 패키지 설치 중..."
                    npm install
                    
                    echo "Artillery 설치 중..."
                    npm install -g artillery
                '''
            }
        }

        stage('Setup Test Environment') {
            steps {
                sh '''
                    echo "테스트 환경 구성 중..."
                    chmod +x run-performance-test.sh
                    mkdir -p results
                '''
            }
        }

        stage('Run Unit Tests') {
            steps {
                sh '''
                    echo "단위 테스트 실행 중..."
                    npm test || true
                '''
            }
        }

        stage('Run API Performance Tests') {
            steps {
                sh '''
                    echo "API 성능 테스트 실행 중..."
                    
                    # 테스트 타입 결정 (변경된 파일에 따라)
                    TEST_TYPE="standard"
                    MODIFIED_API=$(git diff --name-only HEAD~1 HEAD | grep -E "routes/|controllers/" || true)
                    
                    if [ -n "$MODIFIED_API" ]; then
                        echo "API 변경 감지됨: $MODIFIED_API"
                        TEST_TYPE="focused"
                    fi
                    
                    # 타임스탬프 생성
                    TIMESTAMP=$(date +"%Y%m%d-%H%M%S")
                    RESULT_DIR="results/${TEST_TYPE}_${TIMESTAMP}"
                    mkdir -p "$RESULT_DIR"
                    
                    # Artillery 테스트 실행
                    artillery run -o "$RESULT_DIR/result.json" performance-test.yml
                    
                    # 결과 보고서 생성
                    artillery report "$RESULT_DIR/result.json" -o "$RESULT_DIR/report.html"
                    
                    # 결과 요약
                    echo "성능 테스트 결과 요약:"
                    cat "$RESULT_DIR/result.json" | jq '.aggregate.counters'
                    
                    # 응답 시간 통계
                    echo "응답 시간 통계:"
                    cat "$RESULT_DIR/result.json" | jq '.aggregate.summaries["http.response_time"]'
                '''
            }
        }

        stage('Analyze Test Results') {
            steps {
                script {
                    def resultFile = sh(
                        script: "ls -1t results/*/result.json | head -n 1",
                        returnStdout: true
                    ).trim()
                    
                    echo "분석 중인 결과 파일: ${resultFile}"
                    
                    def totalRequests = sh(
                        script: "jq '.aggregate.counters[\"http.requests\"] // 0' ${resultFile}",
                        returnStdout: true
                    ).trim() as Integer
                    
                    def failedRequests = sh(
                        script: "jq '.aggregate.counters[\"http.requests.failed\"] // 0' ${resultFile}",
                        returnStdout: true
                    ).trim() as Integer ?: 0
                    
                    def p95ResponseTime = sh(
                        script: "jq '.aggregate.summaries[\"http.response_time\"].p95 // 0' ${resultFile}",
                        returnStdout: true
                    ).trim() as Float ?: 0
                    
                    echo "총 요청 수: ${totalRequests}"
                    echo "실패한 요청 수: ${failedRequests}"
                    echo "P95 응답 시간: ${p95ResponseTime} ms"
                    
                    // 실패 임계값 확인
                    def failRate = totalRequests > 0 ? (failedRequests / totalRequests) * 100 : 0
                    def maxFailRate = 5.0
                    def maxP95ResponseTime = 500.0
                    
                    if (failRate > maxFailRate) {
                        echo "⚠️ 경고: 실패율(${failRate.round(2)}%)이 최대 허용 임계값(${maxFailRate}%)을 초과했습니다."
                    }
                    
                    if (p95ResponseTime > maxP95ResponseTime) {
                        echo "⚠️ 경고: P95 응답 시간(${p95ResponseTime.round(2)} ms)이 최대 허용 임계값(${maxP95ResponseTime} ms)을 초과했습니다."
                    }
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
                        def resultFile = sh(
                            script: "ls -1t results/*/result.json | head -n 1",
                            returnStdout: true
                        ).trim()
                        
                        def reportFile = sh(
                            script: "ls -1t results/*/report.html | head -n 1",
                            returnStdout: true
                        ).trim()
                        
                        def avgResponseTime = sh(
                            script: "jq '.aggregate.summaries[\"http.response_time\"].mean // 0' ${resultFile}",
                            returnStdout: true
                        ).trim()
                        
                        def p95ResponseTime = sh(
                            script: "jq '.aggregate.summaries[\"http.response_time\"].p95 // 0' ${resultFile}",
                            returnStdout: true
                        ).trim()
                        
                        sh """
                        curl -X POST -H 'Content-type: application/json' \
                          --data '{
                            "text":"✅ 빌드 #${BUILD_NUMBER} 성공\\n- 평균 응답 시간: ${avgResponseTime} ms\\n- P95 응답 시간: ${p95ResponseTime} ms\\n- 보고서: ${env.BUILD_URL}artifact/${reportFile}"
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
                        sh """
                        curl -X POST -H 'Content-type: application/json' \
                          --data '{
                            "text":"❌ 빌드 #${BUILD_NUMBER} 실패\\n- 상세 정보: ${env.BUILD_URL}console"
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