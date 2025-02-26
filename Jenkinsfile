pipeline {
    agent any
    
    environment {
        DOCKER_IMAGE = "dpwlscho/my-node-app"
        DOCKER_TAG = "${BUILD_NUMBER}"
        CURRENT_RUNNING_TAG = "latest"
    }
    
    stages {
        stage('Save Current Version') {
            steps {
                script {
                    def currentTag = sh(
                        script: """
                            docker ps --filter name=app --format '{{.Image}}' | cut -d ':' -f2 || echo 'latest'
                        """,
                        returnStdout: true
                    ).trim()
                    
                    CURRENT_RUNNING_TAG = currentTag ?: 'latest'
                    echo "Current running tag: ${CURRENT_RUNNING_TAG}"
                }
            }
        }
        
        stage('Checkout') {
            steps {
                checkout scm
            }
        }
        
        stage('Build Docker Image') {
            steps {
                sh """
                    docker build -t ${DOCKER_IMAGE}:${DOCKER_TAG} .
                    docker tag ${DOCKER_IMAGE}:${DOCKER_TAG} ${DOCKER_IMAGE}:latest
                """
            }
        }
        
        stage('Push Docker Image') {
            steps {
                withCredentials([usernamePassword(credentialsId: 'dockerhub-credentials', usernameVariable: 'DOCKER_USERNAME', passwordVariable: 'DOCKER_PASSWORD')]) {
                    sh """
                        echo ${DOCKER_PASSWORD} | docker login -u ${DOCKER_USERNAME} --password-stdin
                        docker push ${DOCKER_IMAGE}:${DOCKER_TAG}
                        docker push ${DOCKER_IMAGE}:latest
                    """
                }
            }
        }
        
        stage('Deploy with Health Check') {
            steps {
                script {
                    try {
                        sh """
                            docker stop app || true
                            docker rm app || true
                            docker run -d --name app ${DOCKER_IMAGE}:${DOCKER_TAG}
                            
                            # 10초 대기 후 health check
                            sleep 10
                            curl -f http://localhost:3000/health || exit 1
                        """
                    } catch (Exception e) {
                        echo "Deployment failed, rolling back to version ${CURRENT_RUNNING_TAG}"
                        sh """
                            docker stop app || true
                            docker rm app || true
                            docker run -d --name app ${DOCKER_IMAGE}:${CURRENT_RUNNING_TAG}
                        """
                        error "Deployment failed, rolled back to version ${CURRENT_RUNNING_TAG}"
                    }
                }
            }
        }
    }
}
