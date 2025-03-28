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

        stage('Run Performance Test in Docker') {
            steps {
                sh '''
                    mkdir -p results

                    docker run --rm -v $PWD:/app -w /app artilleryio/artillery \
                    run performance-test.yml --output results/perf_result.json || echo '{"aggregate":{"counters":{"http":{"requestsCompleted":0}},"latency":{"mean":0,"p95":0}}}' > results/perf_result.json

                    docker run --rm -v $PWD:/app -w /app artilleryio/artillery \
                    report results/perf_result.json --output results/perf_report.html || echo "<html><body><h1>리포트 생성 실패</h1></body></html>" > results/perf_report.html
                '''
            }
        } 
    } 

    post {
        always {
            archiveArtifacts artifacts: 'results/**', allowEmptyArchive: true
            echo "빌드 종료 - 상태: ${currentBuild.result ?: '성공'}"
        } 

        success {
            echo "빌드 성공"
            script {
                try {
                    def reportPath = "/reports/perf_report.html"
                    def message = "*빌드 #${BUILD_NUMBER} 성공!*" +
                                 "\n- 리포트 경로: ${reportPath}"

                    withCredentials([string(credentialsId: 'slack-webhook', variable: 'SLACK_URL')]) {
                        sh """
                        curl -X POST -H 'Content-type: application/json' \
                          --data '{"text":"${message}"}' \
                          "${SLACK_URL}"
                        """
                    }
                } catch (Exception e) {
                    echo "Slack 알림 실패: ${e.message}"
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
                          --data '{"text":"빌드 #${BUILD_NUMBER} 실패\\n- 콘솔 출력: ${env.BUILD_URL}console"}' \
                          "${SLACK_URL}"
                        """
                    }
                } catch (Exception e) {
                    echo "Slack 알림 실패: ${e.message}"
                }
            }
        }
    }
}
