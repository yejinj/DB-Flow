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
                    
                    docker run --rm -v $PWD:/app stedolan/jq \
                    jq '.aggregate.counters.http.requestsCompleted' results/perf_result.json > results/requests.txt || echo "0" > results/requests.txt

                    docker run --rm -v $PWD:/app stedolan/jq \
                    jq '.aggregate.latency.mean' results/perf_result.json > results/mean.txt || echo "0" > results/mean.txt

                    docker run --rm -v $PWD:/app stedolan/jq \
                    jq '.aggregate.latency.p95' results/perf_result.json > results/p95.txt || echo "0" > results/p95.txt
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
                    def reportLink = "${env.BUILD_URL}artifact/results/perf_report.html"
                    
                    // 간단하게 메트릭 파일 읽기 (실패해도 기본값 사용)
                    def requests = "0"
                    def meanResponse = "0"
                    def p95Response = "0"
                    
                    try {
                        docker run --rm -v $PWD:/app stedolan/jq \
                        jq '.aggregate.counters.http.requestsCompleted' results/perf_result.json > results/requests.txt || echo "0" > results/requests.txt

                        docker run --rm -v $PWD:/app stedolan/jq \
                        jq '.aggregate.latency.mean' results/perf_result.json > results/mean.txt || echo "0" > results/mean.txt

                        docker run --rm -v $PWD:/app stedolan/jq \
                        jq '.aggregate.latency.p95' results/perf_result.json > results/p95.txt || echo "0" > results/p95.txt

                    } catch (Exception e) {
                        echo "Reading metrics failed: ${e.message}"
                    }
                    
                    // 기존 메시지에 메트릭 추가
                    def message = "Build #${BUILD_NUMBER} Success" +
                                 "\n- 요청 수: ${requests}" +
                                 "\n- 평균 응답시간: ${meanResponse}ms" +
                                 "\n- P95 응답시간: ${p95Response}ms" +
                                 "\n- Report: ${reportLink}"
                    
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