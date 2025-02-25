# CI/CD Pipeline Project
Node.js, Jenkins와 Docker를 활용한 Node.js 애플리케이션의 CI/CD 파이프라인 구축 프로젝트입니다. <br>
GitHub 코드 변경 후 업로드 시 Jenkins를 통한 Docker 이미지 빌드 자동화 및 저장소 업로드 자동화 파이프라인이 작동합니다.

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
## API 구조
### 디렉토리 구조
src/  <br>
├── server.js <br>
├── routes/  <br>
├── controllers/ <br>
└── models/ <br>


## 자동화 트리거
GitHub Webhook 설정:
   - Payload URL: `http://<Jenkins-IP>:8080/github-webhook/`
   - Content type: application/json
   - Payload: push 이벤트 발생 시 전송되는 커밋 정보, 변경 파일 등을 포함한 JSON 데이터
   - Events: Just the push event
