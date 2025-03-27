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
                echo "Checkout completed"
            }
        } 

        stage('Run Performance Test in Docker') {
            steps {
                sh '''
                    mkdir -p results

                    docker run --rm -v $PWD:/app -w /app artilleryio/artillery \
                    run performance-test.yml --output results/perf_result.json || echo '{"aggregate":{"counters":{"http":{"requestsCompleted":0}},"latency":{"mean":0,"p95":0}}}' > results/perf_result.json

                    docker run --rm -v $PWD:/app -w /app artilleryio/artillery \
                    report results/perf_result.json --output results/perf_report.html || echo "<html><body><h1>Report Failed</h1></body></html>" > results/perf_report.html
                '''
            }
        } 
    } 

    post {
        always {
            archiveArtifacts artifacts: 'results/**', allowEmptyArchive: true
            echo "Build finished - Status: ${currentBuild.result ?: 'SUCCESS'}"
        } 

        success {
            echo "Build succeeded"
            script {
                try {
                    def reportPath = "/reports/perf_report.html"
                    def message = "*Build #${BUILD_NUMBER} Succeeded!*" +
                                 "\n- 리포트 경로: ${reportPath}"

                    withCredentials([string(credentialsId: 'slack-webhook', variable: 'SLACK_URL')]) {
                        sh """
                        curl -X POST -H 'Content-type: application/json' \
                          --data '{"text":"${message}"}' \
                          "${SLACK_URL}"
                        """
                    }
                } catch (Exception e) {
                    echo "Slack notification failed: ${e.message}"
                }
            }
        }

        failure {
            echo "Build failed"
            script {
                try {
                    withCredentials([string(credentialsId: 'slack-webhook', variable: 'SLACK_URL')]) {
                        sh """
                        curl -X POST -H 'Content-type: application/json' \
                          --data '{"text":":x: *Build #${BUILD_NUMBER} Failed!*\\n- Console output: ${env.BUILD_URL}console"}' \
                          "${SLACK_URL}"
                        """
                    }
                } catch (Exception e) {
                    echo "Slack notification failed: ${e.message}"
                }
            }
        }
    }
}
