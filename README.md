build test 2

pipeline {
    agent any
    stages {
        stage('Checkout') {
            steps {
                checkout([$class: 'GitSCM',
                    branches: [[name: '*/develop']],
                    userRemoteConfigs: [[
                        url: 'https://github.com/yejinj/docker-jenkins.git',
                        credentialsId: 'github_token'
                    ]]
                ])
            }
        }
    }
}