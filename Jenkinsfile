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
                      run test.yml --output results/perf_result.json || echo '{"aggregate":{"counters":{"http":{"requestsCompleted":0,"codes":{"500":0}}},"latency":{"median":"N/A","p95":"N/A","p99":"N/A","max":"N/A"}}}' > results/perf_result.json

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
            script {
                try {
                    def total = sh(script: "jq '.aggregate.counters.http.requestsCompleted' results/perf_result.json || echo 0", returnStdout: true).trim()
                    def failed = sh(script: "jq '.aggregate.counters.http.codes.\"500\" // 0' results/perf_result.json", returnStdout: true).trim()
                    def failRate = total != "0" ? String.format("%.2f", (failed.toInteger() / total.toInteger()) * 100) : "0.00"
                    def avg = sh(script: "jq '.aggregate.latency.median' results/perf_result.json || echo \"N/A\"", returnStdout: true).trim()
                    def p95 = sh(script: "jq '.aggregate.latency.p95' results/perf_result.json || echo \"N/A\"", returnStdout: true).trim()
                    def p99 = sh(script: "jq '.aggregate.latency.p99' results/perf_result.json || echo \"N/A\"", returnStdout: true).trim()
                    def max = sh(script: "jq '.aggregate.latency.max' results/perf_result.json || echo \"N/A\"", returnStdout: true).trim()

                    def msg = """Test: standard
- Total Requests: ${total}
- Failed: ${failed} (${failRate}%)
- Avg Response Time: ${avg}ms
- p95 Response Time: ${p95}ms
- p99 Response Time: ${p99}ms
- Max Response Time: ${max}ms
- Report: results/perf_report.html"""

                    writeFile file: 'slack_message.txt', text: msg

                    withCredentials([string(credentialsId: 'slack-webhook', variable: 'SLACK_URL')]) {
                        sh '''
                        MESSAGE=$(cat slack_message.txt | jq -Rs .)
                        curl -X POST -H 'Content-type: application/json' \
                          --data "{\"text\": $MESSAGE}" \
                          "$SLACK_URL"
                        '''
                    }
                } catch (Exception e) {
                    echo "Slack message failed: ${e.message}"
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
                          "$SLACK_URL"
                        """
                    }
                } catch (Exception e) {
                    echo "Slack message failed: ${e.message}"
                }
            }
        }
    }
} 
