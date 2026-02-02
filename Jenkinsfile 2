pipeline {
    agent any

    environment {
        // Global variables
        DOCKER_CREDENTIALS_ID = 'docker-hub-credentials'
        REGISTRY = 'shaimullo' 
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Detect Changes') {
            steps {
                script {
                    // Simple logic to detect changes in folders
                    // In a real Jenkins, use changesets or external tools
                    env.BUILD_BACKEND = 'true'
                    env.BUILD_FRONTEND_CLIENT = 'true'
                    env.BUILD_FRONTEND_ADMIN = 'true'
                    echo "Changes detected everywhere (forced for demo)"
                }
            }
        }

        stage('Build & Test Backend') {
            when { expression { return env.BUILD_BACKEND == 'true' } }
            steps {
                dir('backend') {
                    sh 'npm ci'
                    sh 'npm run build'
                    // sh 'npm run test'
                }
            }
        }

        stage('Build & Test Frontend Client') {
            when { expression { return env.BUILD_FRONTEND_CLIENT == 'true' } }
            steps {
                dir('frontend-client') {
                    sh 'npm ci'
                    sh 'npm run build'
                }
            }
        }

        stage('Build & Test Frontend Admin') {
            when { expression { return env.BUILD_FRONTEND_ADMIN == 'true' } }
            steps {
                dir('frontend-admin') {
                    sh 'npm ci'
                    sh 'npm run build'
                }
            }
        }

        stage('Docker Build & Push') {
            parallel {
                stage('Backend Image') {
                    when { expression { return env.BUILD_BACKEND == 'true' } }
                    steps {
                        script {
                            docker.withRegistry('', DOCKER_CREDENTIALS_ID) {
                                def backendImage = docker.build("${REGISTRY}/crystolia-backend:latest", "./backend")
                                backendImage.push()
                            }
                        }
                    }
                }
                stage('Client Image') {
                    when { expression { return env.BUILD_FRONTEND_CLIENT == 'true' } }
                    steps {
                        script {
                            docker.withRegistry('', DOCKER_CREDENTIALS_ID) {
                                def clientImage = docker.build("${REGISTRY}/crystolia-frontend-client:latest", "./frontend-client")
                                clientImage.push()
                            }
                        }
                    }
                }
                stage('Admin Image') {
                    when { expression { return env.BUILD_FRONTEND_ADMIN == 'true' } }
                    steps {
                        script {
                            docker.withRegistry('', DOCKER_CREDENTIALS_ID) {
                                def adminImage = docker.build("${REGISTRY}/crystolia-frontend-admin:latest", "./frontend-admin")
                                adminImage.push()
                            }
                        }
                    }
                }
            }
        }
    }
}
