pipeline {
    agent any

    environment {
        GITHUB_REPO = "yejinj/docker-jenkins"
        DOCKER_REGISTRY = "docker.io/yejinj"
    }

    stages {
        stage('환경 확인') {
            steps {
                echo "=== DB-Flow 파이프라인 시작 ==="
                sh 'echo "현재 시간: $(date)"'
                sh 'echo "디스크 사용량: $(df -h | grep -E "/$")"'
                sh 'echo "작업 디렉토리: $(pwd)"'
            }
        }
        
        stage('Docker 상태 확인') {
            steps {
                echo "=== Docker 컨테이너 상태 확인 ==="
                sh 'docker ps --format "table {{.Names}}\\t{{.Status}}\\t{{.Ports}}"'
            }
        }
        
        stage('애플리케이션 테스트') {
            steps {
                echo "=== 애플리케이션 API 테스트 ==="
                sh '''
                    # Health Check 테스트
                    echo "Health Check 테스트 중..."
                    HEALTH_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/health || echo "000")
                    echo "Health Check 응답 코드: $HEALTH_STATUS"
                    
                    if [ "$HEALTH_STATUS" = "200" ]; then
                        echo "✅ 애플리케이션 서버 정상"
                    else
                        echo "⚠️ 애플리케이션 서버 응답 확인 필요"
                    fi
                    
                    # 실제 응답 내용 확인
                    echo "Health Check 응답 내용:"
                    curl -s http://localhost:3001/health || echo "연결 실패"
                '''
            }
        }
        
        stage('시스템 정보') {
            steps {
                echo "=== 시스템 정보 수집 ==="
                sh '''
                    echo "메모리 사용량:"
                    free -h
                    
                    echo "네트워크 포트 상태:"
                    netstat -tlnp | grep -E ":(3001|8081)" || echo "포트 정보 없음"
                    
                    echo "현재 프로세스:"
                    ps aux | grep -E "(node|java)" | head -3
                '''
            }
        }
    }

    post {
        always {
            echo "=== 파이프라인 실행 완료 ==="
            sh 'echo "완료 시간: $(date)"'
        }
        success {
            echo "✅ 빌드 성공"
            script {
                try {
                    echo "Slack 알림 전송 (데모용)"
                    sh 'echo "빌드 #${BUILD_NUMBER} 성공 메시지"'
                } catch (Exception e) {
                    echo "Slack 알림 실패: ${e.message}"
                }
            }
        }
        failure {
            echo "❌ 빌드 실패"
            script {
                try {
                    echo "Slack 실패 알림 전송 (데모용)"
                    sh 'echo "빌드 #${BUILD_NUMBER} 실패 메시지"'
                } catch (Exception e) {
                    echo "Slack 알림 실패: ${e.message}"
                }
            }
        }
    }
}
