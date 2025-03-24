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
        SLACK_WEBHOOK_URL = credentials('slack-webhook')
        GIT_BRANCH = "${env.GIT_BRANCH}"
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
                sh './slack-notify.sh "빌드가 시작되었습니다. (${GIT_BRANCH})" "STARTED" "${env.BUILD_URL}"'
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
                sh './slack-notify.sh "📦 Kubernetes 배포가 진행 중입니다." "IN_PROGRESS" "${env.BUILD_URL}"'
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

        stage('Deploy Application') {
            steps {
                sh '''
                    kubectl create configmap nodejs-app-config --from-literal=MONGODB_URI="mongodb://mongodb-0.mongodb-svc:27017,mongodb-1.mongodb-svc:27017,mongodb-2.mongodb-svc:27017/myDatabase?replicaSet=rs0" -n mongodb --dry-run=client -o yaml | kubectl apply -f -
                    
                    cat <<EOF | kubectl apply -f -
                    apiVersion: apps/v1
                    kind: Deployment
                    metadata:
                      name: nodejs-app
                      namespace: mongodb
                    spec:
                      replicas: 1
                      selector:
                        matchLabels:
                          app: nodejs-app
                      template:
                        metadata:
                          labels:
                            app: nodejs-app
                        spec:
                          containers:
                          - name: nodejs-app
                            image: ${DOCKER_REGISTRY}/nodejs-app:latest
                            ports:
                            - containerPort: 3000
                            envFrom:
                            - configMapRef:
                                name: nodejs-app-config
                    ---
                    apiVersion: v1
                    kind: Service
                    metadata:
                      name: nodejs-app-svc
                      namespace: mongodb
                    spec:
                      selector:
                        app: nodejs-app
                      ports:
                      - port: 3000
                        targetPort: 3000
                      type: LoadBalancer
                    EOF
                '''
            }
        }

        stage('Run Performance Tests') {
            steps {
                sh '''
                    MODIFIED_API=$(git diff --name-only HEAD~1 HEAD | grep -E "routes/|controllers/" || true)

                    echo "[INFO] 변경된 API 파일 목록:"
                    echo "$MODIFIED_API"

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

        stage('Run DB Tests') {
            steps {
                sh 'chmod +x run-db-test.sh'
                sh './run-db-test.sh'
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

        stage('Test Slack') {
            steps {
                echo 'Testing Slack notification'
            }
        }
    }

    post {
        always {
            archiveArtifacts artifacts: 'results/**', allowEmptyArchive: true
            sh '''
                source .env
                echo "Using curl to send Slack notification directly"
                curl -X POST \
                  -H "Content-Type: application/json" \
                  --data "{\\\"text\\\":\\\"Jenkins 빌드 #${BUILD_NUMBER} 완료: ${currentBuild.currentResult}\\\"}" \
                  "$SLACK_WEBHOOK_URL"
            '''
        }
        success {
            sh '''
                # 환경 변수 확인
                echo "SLACK_WEBHOOK_URL length: ${#SLACK_WEBHOOK_URL}"
                
                # 실행 권한 확인 및 부여
                ls -la slack-notify.sh
                chmod +x slack-notify.sh
                
                # 명시적으로 환경 변수 전달
                SLACK_WEBHOOK_URL="${SLACK_WEBHOOK_URL}" ./slack-notify.sh "빌드 성공" "SUCCESS" "${BUILD_URL}"
            '''
        }
        failure {
            sh 'chmod +x slack-notify.sh'
            sh './slack-notify.sh "❌ 빌드 실패: 테스트 실패 또는 오류가 발생했습니다. (${GIT_BRANCH})" "FAILURE" "${env.BUILD_URL}"'
        }
        unstable {
            sh 'chmod +x slack-notify.sh'
            sh './slack-notify.sh "⚠️ 빌드 불안정: 일부 테스트가 통과되지 않았습니다. (${GIT_BRANCH})" "UNSTABLE" "${env.BUILD_URL}"'
        }
    }
}
