pipeline {
    agent any

    triggers {
        githubPush()
    }

    environment {
        KUBECONFIG = credentials("kubeconfig")
        DOCKER_REGISTRY = "docker.io/yourorg"
        GITHUB_REPO = "yejinj/docker-jenkins"
        GITHUB_CREDS = credentials('github-token')
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
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
                '''
            }
        }

        stage('Run Performance Tests') {
            steps {
                sh 'chmod +x run-performance-test.sh'
                sh './run-performance-test.sh db'
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
                    sh "curl -X POST -H 'Content-type: application/json' --data '{\"text\":\"✅ 빌드가 성공했습니다.\"}' $SLACK_URL"
                }
            }
        }
        failure {
            script {
                withCredentials([string(credentialsId: 'slack-webhook', variable: 'SLACK_URL')]) {
                    sh "curl -X POST -H 'Content-type: application/json' --data '{\"text\":\"❌ 빌드 실패. 결과를 확인하세요.\"}' $SLACK_URL"
                }
            }
        }
    }
}
