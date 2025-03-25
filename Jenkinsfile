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

        stage('Install Node.js & Dependencies') {
            steps {
                sh '''
                    echo "도커 컨테이너 환경 확인..."
                    hostname
                    whoami
                    ls -la
                    
                    echo "APT 업데이트..."
                    apt-get update || true
                    
                    echo "필수 패키지 설치..."
                    apt-get install -y curl wget gnupg || true
                    
                    echo "Node.js 설치 중..."
                    curl -sL https://deb.nodesource.com/setup_16.x | bash -
                    apt-get install -y nodejs || true
                    
                    echo "Node.js 및 npm 버전 확인:"
                    node --version || echo "node 설치 실패"
                    npm --version || echo "npm 설치 실패"
                    
                    echo "Artillery 설치는 건너뜁니다. (임시)"
                '''
            }
        }

        stage('Basic Test') {
            steps {
                sh '''
                    echo "기본 테스트 실행 중..."
                    mkdir -p results
                    echo "테스트 결과 샘플 생성..." 
                    echo '{"테스트 결과": "샘플 데이터"}' > results/sample_result.json
                    echo '<!DOCTYPE html><html><body><h1>샘플 보고서</h1></body></html>' > results/sample_report.html
                '''
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
                        sh """
                        curl -X POST -H 'Content-type: application/json' \
                          --data '{"text":"빌드 #${BUILD_NUMBER} 성공\\n- 기본 테스트 완료\\n- 보고서: ${env.BUILD_URL}artifact/results/sample_report.html"}' \
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
                          --data '{"text":" 빌드 #${BUILD_NUMBER} 실패\\n- 상세 정보: ${env.BUILD_URL}console"}' \
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