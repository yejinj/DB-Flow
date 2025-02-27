# CI/CD Pipeline Project
Node.js, Jenkins와 Docker를 활용한 Node.js 애플리케이션의 CI/CD 파이프라인 구축 프로젝트입니다. <br>
GitHub 코드 변경 후 업로드 시 Jenkins를 통한 Docker 이미지 빌드 자동화 및 저장소 업로드 자동화 파이프라인이 작동합니다.

-----
## 시스템 구성도
[GitHub Repo]: 소스 코드 → [Jenkins Pipeline]: Jenkinsfile 실행 → [Docker Image]: Dockerfile 빌드 → [Docker Hub]: 이미지 저장

-----
## 사용 기술
### 인프라
- NCP Compute Server
  - Ubuntu 20.04 서버
  - ACG (방화벽) 설정
  - 공인 IP

### CI/CD
- Jenkins <br>
- Docker <br>
- GitHub <br>
- Docker Hub <br>

### 애플리케이션
- Node.js <br>
- Express <br>
- MongoDB <br>

------
## 자동화 트리거
GitHub Webhook 설정
   - Payload URL: `http://<Jenkins-IP>:8080/github-webhook/`
   - Content type: application/json
   - Payload: push 이벤트 발생 시 전송되는 커밋 정보, 변경 파일 등을 포함한 JSON 데이터
   - Events: Just the push event
<<<<<<< HEAD

## 포트 정보
- Jenkins: 8080
- Node.js 애플리케이션: 3000
- MongoDB: 27017
<<<<<<< HEAD
<<<<<<< HEAD
# Development Environment
# Development Environment
# Development Environment Test
# Test Build for Development
# Testing Jenkins Pipeline
# Testing Jenkins Integration
# Testing Jenkins Integration
# Testing New Pipeline Setup
# Testing HTTPS Connection
# Testing HTTPS Connection
# Testing Updated Pipeline
# Testing Develop Branch
# Testing New Develop Branch
=======
=======
>>>>>>> 8650e933c44d2dcf954c75fd03910d3baf90193a
# Testing Main Branch Pipeline
=======
>>>>>>> 26f2e912ff485aabd26133e115e2e46eca223436
# Testing Repository Name Change
# Testing New GitHub Token
# Testing New GitHub Token
<<<<<<< HEAD
>>>>>>> a0667ebd80768675ad6ebcf5a69ac64d3748b4d2
# Testing Develop Branch Pipeline
# Testing Develop Pipeline Configuration
# Testing Develop Pipeline Configuration
# Testing Rollback System - First Deploy
# Testing Rollback System - Failed Deploy
# Testing Rollback System - Failed Deploy
# Testing Rollback System - Failed Deploy
# Testing develop branch build Thu 27 Feb 2025 11:20:20 AM KST
# Testing develop branch build Thu 27 Feb 2025 11:20:34 AM KST
# Testing develop branch build Thu 27 Feb 2025 11:26:42 AM KST
# Testing develop branch build Thu 27 Feb 2025 11:27:06 AM KST
# Testing develop branch build Thu 27 Feb 2025 11:27:33 AM KST
# Testing develop branch build Thu 27 Feb 2025 12:58:32 PM KST
=======
# Testing New Develop Branch
# Testing new deployment Wed 26 Feb 2025 04:57:21 PM KST
# Testing new deployment Wed 26 Feb 2025 04:57:47 PM KST
# Testing build without health check Wed 26 Feb 2025 06:43:56 PM KST
# Testing build with branch-specific tags Wed 26 Feb 2025 06:48:31 PM KST
# Testing build with previous working version Thu 27 Feb 2025 09:55:57 AM KST
# Testing build without health check Thu 27 Feb 2025 09:58:56 AM KST
# Testing simplified deployment without health check Thu 27 Feb 2025 10:02:37 AM KST
# Testing build with port mapping Thu 27 Feb 2025 10:05:03 AM KST
# Testing develop branch build Thu 27 Feb 2025 10:07:05 AM KST
# Testing staging branch build Thu 27 Feb 2025 10:07:07 AM KST
=======
# Test Build for Staging
# Testing Staging Pipeline
# Testing staging branch deployment Thu 27 Feb 2025 10:21:06 AM KST
# Testing staging branch deployment Thu 27 Feb 2025 10:23:07 AM KST
>>>>>>> staging
# Testing main branch build Thu 27 Feb 2025 11:19:19 AM KST
>>>>>>> 8650e933c44d2dcf954c75fd03910d3baf90193a
test
test
