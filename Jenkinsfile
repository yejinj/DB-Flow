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

        stage('Install Node.js & Artillery') {
            steps {
                sh '''
                    echo "Node.js 및 Artillery 설치 중..."
                    apt-get update || true
                    apt-get install -y curl wget gnupg || true
                    curl -sL https://deb.nodesource.com/setup_16.x | bash -
                    apt-get install -y nodejs || true
                    npm install -g artillery

                    node -v
                    npm -v
                    artillery -V
                '''
            }
        }

        stage('Run Performance Test') {
            steps {
                sh '''
                    echo "Artillery 부하 테스트 시작..."
                    mkdir -p results
                    artillery run test.yml --output results/perf_result.json

                    echo "HTML 리포트 생성..."
                    artillery report results/perf_result.json --output results/perf_report.html
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
                    def json = readJSON file: 'results/perf_result.json'
                    def requests = json?.aggregate?.counters?.http?.requestsCompleted ?: 0
                    def errors = json?.aggregate?.counters?.http?.codes?.['500'] ?: 0
                    def latency = json?.aggregate?.latency?.median ?: 'N/A'

                    withCredentials([string(credentialsId: 'slack-webhook', variable: 'SLACK_URL')]) {
                        sh """
                        curl -X POST -H 'Content-type: application/json' \
                          --data '{"text":"✅ *성능 테스트 성공 (빌드 #${BUILD_NUMBER})*\\n• 요청 수: ${requests}\\n• 500 에러 수: ${errors}\\n• 응답 지연(중앙값): ${latency} ms\\n• [보고서 보기](${env.BUILD_URL}artifact/results/perf_report.html)"}' \
                          "${SLACK_URL}"
                        """
                    }
                } catch (Exception e) {
                    echo "Slack 메시지 전송 중 오류 발생: ${e.message}"
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
                          --data '{"text":"❌ 빌드 #${BUILD_NUMBER} 실패\\n- 상세 정보: ${env.BUILD_URL}console"}' \
                          "${SLACK_URL}"
                        """
                    }
                } catch (Exception e) {
                    echo "Slack 메시지 전송 실패: ${e.message}"
                }
            }
        }
    }
}
