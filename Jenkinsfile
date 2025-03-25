pipeline {
    agent {
        docker {
            image 'node:20'
        }
    }

    environment {
        TARGET_URL = "http://223.130.153.17:3000"
    }

    stages {
        stage('Install Artillery') {
            steps {
                sh 'npm install -g artillery'
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
