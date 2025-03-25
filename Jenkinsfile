pipeline {
    agent any

    triggers {
        githubPush()
    }

    environment {
        GITHUB_REPO = "yejinj/docker-jenkins"
        DOCKER_REGISTRY = "docker.io/yejinj"
    }

    stages {
        stage('Test GitHub WebHook') {
            steps {
                echo "GitHub webhook test: ${new Date()}"
                sh 'hostname'
                sh 'whoami'
                sh 'pwd'
            }
        }
        
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
    }

    post {
        always {
            echo "빌드 완료 - 상태: ${currentBuild.result ?: 'SUCCESS'}"
        }
        
        success {
            echo "빌드 성공"
            script {
                try {
                    withCredentials([string(credentialsId: 'slack-webhook', variable: 'SLACK_URL')]) {
                        sh """
                        curl -X POST -H 'Content-type: application/json' \
                          --data '{"text":"✅ 빌드 #${BUILD_NUMBER}이 성공적으로 완료되었습니다."}' \
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
        }
    }
}
