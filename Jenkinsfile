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

        stage('Install Node.js and Artillery') {
            steps {
                sh '''
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
                    mkdir -p results
                    artillery run test.yml --output results/perf_result.json
                    artillery report results/perf_result.json --output results/perf_report.html
                '''
            }
        }
    }

    post {
        always {
            archiveArtifacts artifacts: 'results/**', allowEmptyArchive: true
            echo "Build completed - Status: ${currentBuild.result ?: 'SUCCESS'}"
        }

        success {
            echo "Build succeeded"
            script {
                try {
                    def json = readJSON file: 'results/perf_result.json'
                    def requests = json?.aggregate?.counters?.http?.requestsCompleted ?: 0
                    def errors = json?.aggregate?.counters?.http?.codes?.get('500') ?: 0
                    def latency = json?.aggregate?.latency?.median ?: 'N/A'

                    withCredentials([string(credentialsId: 'slack-webhook', variable: 'SLACK_URL')]) {
                        sh """
                        curl -X POST -H 'Content-type: application/json' \
                          --data '{"text":"Performance test passed (Build #${BUILD_NUMBER})\\n- Requests: ${requests}\\n- 500 Errors: ${errors}\\n- Median latency: ${latency} ms\\n- Report: ${env.BUILD_URL}artifact/results/perf_report.html"}' \
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
                          --data '{"text":"Build #${BUILD_NUMBER} failed\\n- Console output: ${env.BUILD_URL}console"}' \
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