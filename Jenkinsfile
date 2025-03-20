pipeline {
    agent any

    environment {
        SLACK_WEBHOOK_URL = credentials("https://hooks.slack.com/services/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")
    }

    stages {
        stage('Checkout') {
            steps {
                git 'https://github.com/yejinj/docker-jenkins.git'
            }
        }

        stage('Install Dependencies') {
            steps {
                sh 'npm install -g artillery'
            }
        }

        stage('Run Load Test') {
            steps {
                sh 'chmod +x run-load-test.sh'
                sh './run-load-test.sh'
            }
        }

        stage('Check Performance') {
            steps {
                script {
                    def resultFile = sh(
                        script: "ls -1t results/result-*.json | head -n 1",
                        returnStdout: true
                    ).trim()

                    def failRate = sh(
                        script: "jq '.aggregate.counters[\"vusers.failed\"] / .aggregate.counters[\"http.requests\"] * 100' ${resultFile}",
                        returnStdout: true
                    ).trim() as double

                    echo "Fail rate: ${failRate}%"

                    if (failRate >= 5.0) {
                        error "Fail rate exceeded threshold. Marking build as failed."
                    }
                }
            }
        }
    }
}