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

        stage('Install Dependencies') {
            steps {
                sh '''
                    npm install -g artillery
                    if ! command -v kubectl &> /dev/null; then
                        curl -LO "https://dl.k8s.io/release/stable.txt"
                        curl -LO "https://dl.k8s.io/release/$(cat stable.txt)/bin/linux/amd64/kubectl"
                        chmod +x kubectl
                        sudo mv kubectl /usr/local/bin/
                    fi
                '''
            }
        }

        stage('Deploy to Kubernetes') {
            steps {
                sh '''
                    export KUBECONFIG=${KUBECONFIG}
                    kubectl create namespace mongodb --dry-run=client -o yaml | kubectl apply -f -
                    kubectl apply -f k8s/mongo-service.yaml -n mongodb
                    kubectl apply -f k8s/mongo-statefulset.yaml -n mongodb
                    kubectl rollout status statefulset/mongodb -n mongodb --timeout=300s
                    kubectl create configmap mongo-init --from-file=k8s/rs-init.js -n mongodb --dry-run=client -o yaml | kubectl apply -f -
                '''
            }
        }

        stage('Verify Deployment') {
            steps {
                sh '''
                    kubectl exec mongodb-0 -n mongodb -- mongo --eval "rs.status()" | grep "ok"
                    kubectl exec mongodb-0 -n mongodb -- mongo --eval "db.serverStatus()"
                '''
            }
        }

        stage('Run Performance Tests') {
            steps {
                sh 'chmod +x run-performance-test.sh'
                sh './run-performance-test.sh'
            }
        }

        stage('Analyze Results') {
            steps {
                script {
                    def resultFile = sh(
                        script: "ls -1t results/*/result.json | head -n 1",
                        returnStdout: true
                    ).trim() 

                    def failRate = sh(
                        script: "jq '.aggregate.counters[\"vusers.failed\"] / .aggregate.counters[\"http.requests\"] * 100 || 0' ${resultFile}",
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
                      $SLACK_URL
                    """
                }
            }
        }
        failure {
            script {
                withCredentials([string(credentialsId: 'slack-webhook', variable: 'SLACK_URL')]) {
                    sh """
                    curl -X POST -H 'Content-type: application/json' \
                      --data '{"text":" 빌드가 실패했습니다. 결과를 확인해 주세요."}' \
                      $SLACK_URL
                    """
                }
            }
        }
    }
}
