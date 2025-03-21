pipeline {
    agent any

    triggers {
        githubPush()
    }

    environment {
        SLACK_WEBHOOK_URL = credentials("slack-webhook")
        KUBECONFIG = credentials("kubeconfig")
        DOCKER_REGISTRY = "docker.io/yourorg"
    }

    stages {
        stage('Checkout') {
            steps {
                git 'https://github.com/yejinj/docker-jenkins.git'
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
                sh 'chmod +x run-performance-test.sh'
                sh './run-performance-test.sh'
            }
        }

        stage('Analyze Results') {
            steps {
                script {
                    def resultFile = sh(
                        script: "ls -1t results/result-*.json | head -n 1",
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
            echo 'All tests passed!'
        }
        failure {
            echo 'Tests failed. Check the results for details.'
        }
    }
}