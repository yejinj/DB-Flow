pipeline {
    agent any
    
    environment {
        DOCKER_IMAGE = "your-image-name"
        DOCKER_TAG = "${BUILD_NUMBER}"
        DOCKER_REGISTRY = "your-registry-url"  // 예: "ncp.kr.private-registry.com"
        DOCKER_CREDENTIALS = credentials('docker-registry-credentials')  // 나중에 생성할 credential ID
    }
    
    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }
        
        stage('Build Docker Image') {
            steps {
                sh """
                    docker build -t ${DOCKER_REGISTRY}/${DOCKER_IMAGE}:${DOCKER_TAG} .
                    docker tag ${DOCKER_REGISTRY}/${DOCKER_IMAGE}:${DOCKER_TAG} ${DOCKER_REGISTRY}/${DOCKER_IMAGE}:latest
                """
            }
        }
        
        stage('Push Docker Image') {
            steps {
                sh """
                    echo ${DOCKER_CREDENTIALS_PSW} | docker login ${DOCKER_REGISTRY} -u ${DOCKER_CREDENTIALS_USR} --password-stdin
                    docker push ${DOCKER_REGISTRY}/${DOCKER_IMAGE}:${DOCKER_TAG}
                    docker push ${DOCKER_REGISTRY}/${DOCKER_IMAGE}:latest
                """
            }
        }
    }
}
