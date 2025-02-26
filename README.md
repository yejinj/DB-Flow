# Node.js CI/CD Pipeline Project

Jenkins와 Docker를 활용한 Node.js 애플리케이션의 CI/CD 파이프라인 구축 프로젝트입니다.

## 시스템 구성도
[GitHub Repo] → [Jenkins Pipeline] → [Docker Image] → [Docker Hub]
     ↓               ↓                    ↓              ↓
  소스코드     Jenkinsfile 실행    Dockerfile 빌드    이미지 저장

## 사용 기술

### 인프라
- NCP (Naver Cloud Platform)
  - Ubuntu 20.04 서버
  - ACG (방화벽) 설정
  - 공인 IP

### CI/CD
- Jenkins
- Docker
- GitHub
- Docker Hub

### 애플리케이션
- Node.js
- Express
- MongoDB

## API 구조

### 디렉토리 구조
src/
├── server.js          # 서버 설정
├── routes/           # API 라우트
├── controllers/      # 비즈니스 로직
└── models/          # 데이터 모델

### API 엔드포인트
GET    /              # 서버 상태 확인
GET    /api/users     # 사용자 목록
POST   /api/users     # 사용자 생성
GET    /api/users/:id # 사용자 조회
PUT    /api/users/:id # 사용자 수정
DELETE /api/users/:id # 사용자 삭제

## 자동화 트리거

1. GitHub Webhook 설정:
   - Payload URL: `http://<Jenkins-IP>:8080/github-webhook/`
   - Content type: application/json
   - Payload: push 이벤트 발생 시 전송되는 커밋 정보, 변경 파일 등을 포함한 JSON 데이터
   - Events: Just the push event

## 포트 정보
- Jenkins: 8080
- Node.js 애플리케이션: 3000
- MongoDB: 27017
# Development Environment
# Development Environment
# Development Environment Test
