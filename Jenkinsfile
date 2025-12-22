pipeline {
    agent any
    
    environment {
        DOCKER_REGISTRY = credentials('docker-registry')
        DATABASE_URL = credentials('database-url')
    }
    
    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }
        
        stage('Install Dependencies') {
            steps {
                sh 'bun install'
            }
        }
        
        stage('Lint') {
            steps {
                sh 'bun run lint'
            }
        }
        
        stage('Test') {
            steps {
                sh 'bun test'
            }
        }
        
        stage('Build') {
            steps {
                sh 'bun run build'
            }
        }
        
        stage('Build Docker Images') {
            when {
                branch 'main'
            }
            steps {
                script {
                    docker.build("tggrid-chrome-vnc:${env.BUILD_ID}", "-f containers/chrome-alpine/Dockerfile.vnc containers/chrome-alpine/")
                    docker.build("tggrid-firefox-vnc:${env.BUILD_ID}", "-f containers/firefox-alpine/Dockerfile.vnc containers/firefox-alpine/")
                }
            }
        }
        
        stage('Push to Registry') {
            when {
                branch 'main'
            }
            steps {
                script {
                    docker.withRegistry('https://registry.hub.docker.com', 'docker-registry') {
                        docker.image("tggrid-chrome-vnc:${env.BUILD_ID}").push()
                        docker.image("tggrid-chrome-vnc:${env.BUILD_ID}").push('latest')
                        docker.image("tggrid-firefox-vnc:${env.BUILD_ID}").push()
                        docker.image("tggrid-firefox-vnc:${env.BUILD_ID}").push('latest')
                    }
                }
            }
        }
        
        stage('Deploy to Production') {
            when {
                branch 'main'
            }
            steps {
                sh '''
                    ssh $DEPLOY_USER@$DEPLOY_HOST << EOF
                        cd /opt/tggrid
                        git pull origin main
                        docker-compose pull
                        docker-compose up -d --force-recreate
                        docker system prune -af
EOF
                '''
            }
        }
        
        stage('Health Check') {
            when {
                branch 'main'
            }
            steps {
                sh '''
                    sleep 30
                    curl -f https://your-domain.com/api/health || exit 1
                '''
            }
        }
    }
    
    post {
        success {
            slackSend(color: 'good', message: "Build successful: ${env.JOB_NAME} #${env.BUILD_NUMBER}")
        }
        failure {
            slackSend(color: 'danger', message: "Build failed: ${env.JOB_NAME} #${env.BUILD_NUMBER}")
        }
    }
}
