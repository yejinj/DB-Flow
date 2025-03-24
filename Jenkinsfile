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
                sh '''
                # 변경된 파일 중 API 관련 변경 감지
                MODIFIED_API=$(git diff --name-only HEAD~1 HEAD | grep -E "routes/|controllers/" || true)

                echo "[INFO] 변경된 API 파일 목록:"
                echo "$MODIFIED_API"

                # Artillery 테스트 파일 생성
                if [ -n "$MODIFIED_API" ]; then
                    echo "[INFO] API 관련 변경 사항 감지됨 - 성능 테스트 구성 중"

                    cat > temp-api-test.yml <<EOF
config:
  target: "http://223.130.153.17:3000"
  phases:
    - duration: 30
      arrivalRate: 5
scenarios:
  - name: "Modified API Test"
    flow:
      - get:
          url: "/api/users"
      - post:
          url: "/api/users"
          json:
            name: "git-user"
            email: "git@test.com"
      - get:
          url: "/api/db/read?email=git@test.com"
EOF

                else
                    echo "[INFO] API 변경 없음 - 기본 테스트 실행"
                    cp performance-test.yml temp-api-test.yml
                fi

                chmod +x run-performance-test.sh
                ./run-performance-test.sh standard temp-api-test.yml
                '''
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
                        error "❌ Fail rate exceeded threshold. Build failed."
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
                      --data '{"text":"❌ 빌드가 실패했습니다. 변경된 API에서 성능 이슈가 감지되었습니다."}' \
                      $SLACK_URL
                    """
                }
            } 
        }
    }
}  