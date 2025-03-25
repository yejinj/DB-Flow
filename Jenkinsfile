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

        stage('Install Node.js & Artillery') {
            steps {
                sh '''
                    echo "System info:"
                    hostname
                    whoami
                    ls -la

                    echo "APT update..."
                    apt-get update || true

                    echo "Installing required packages..."
                    apt-get install -y curl wget gnupg || true

                    echo "Installing Node.js 16..."
                    curl -sL https://deb.nodesource.com/setup_16.x | bash - || true
                    apt-get install -y nodejs || true

                    echo "Installing Artillery..."
                    npm install -g artillery || true

                    echo "Verifying versions..."
                    node --version || echo "Node install failed"
                    npm --version || echo "npm install failed"
                    artillery -V || echo "Artillery install failed"
                '''
            }
        }

        stage('Run Performance Test') {
            steps {
                sh '''
                    mkdir -p results
                    artillery run test.yml --output results/perf_result.json || echo '{"aggregate": {"counters": {"http": {"requestsCompleted": 0}}, "latency": {"median": "N/A"}}}' > results/perf_result.json
                    artillery report results/perf_result.json --output results/perf_report.html || echo "<html><body><h1>Report Failed</h1></body></html>" > results/perf_report.html
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
                    def json = readJSON file: 'results/perf_result.json'
                    def requests = json?.aggregate?.counters?.http?.requestsCompleted ?: 0
                    def errors = json?.aggregate?.counters?.http?.codes?.get('500') ?: 0
                    def latency = json?.aggregate?.latency?.median ?: 'N/A'

                    withCredentials([string(credentialsId: 'slack-webhook', variable: 'SLACK_URL')]) {
                        sh """
                        curl -X POST -H 'Content-type: application/json' \
                          --data '{"text":"Build #${BUILD_NUMBER} Success\\n- Requests: ${requests}\\n- 500 Errors: ${errors}\\n- Median latency: ${latency} ms\\n- Report: ${env.BUILD_URL}artifact/results/perf_report.html"}' \
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
