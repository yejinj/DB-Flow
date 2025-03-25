pipeline {
    agent any

    triggers {
        githubPush()
    }

    environment {
        KUBECONFIG = credentials("kubeconfig")
        DOCKER_REGISTRY = "docker.io/yejinj"
        GITHUB_REPO = "yejinj/docker-jenkins"
        GITHUB_CREDS = credentials('github-token')
    }

    stages {
        stage('Checkout') {
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
            }
        }

        stage('Test Environment') {
            steps {
                echo "테스트 환경 구성 중..."
                sh "echo KUBECONFIG = ${KUBECONFIG}"
            }
        }
    }

    post {
        always {
            archiveArtifacts artifacts: 'results/**', allowEmptyArchive: true
        }
        success {
            script {
                withCredentials([string(credentialsId: 'slack-webhook', variable: 'SLACK_URL')]) {
                    sh """
                    curl -X POST -H 'Content-type: application/json' \
                      --data '{"text":"✅ 빌드가 성공적으로 완료되었습니다."}' \
                      ${SLACK_URL}
                    """
                }
            }
        }
        failure {
            script {
                withCredentials([string(credentialsId: 'slack-webhook', variable: 'SLACK_URL')]) {
                    sh """
                    curl -X POST -H 'Content-type: application/json' \
                      --data '{"text":"❌ 빌드가 실패했습니다. 결과를 확인해 주세요."}' \
                      ${SLACK_URL}
                    """
                }
            }
        }
    }
}