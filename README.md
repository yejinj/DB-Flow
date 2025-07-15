### 배경
반복적인 수작업으로 인해 발생하는 오류와 비효율을 줄이기 위해, 빌드/테스트/배포의 과정을 하나의 자동화된 파이프라인으로 통합했습니다.

### 파이프라인 구성
본 프로젝트는 다음과 같은 단계로 구성된 CI/CD 파이프라인을 제공합니다.
1. 유저가 코드 변경 내역을 Github 특정 브랜치로 푸시
2. GitHub Webhook을 통해 Jenkins 파이프라인 트리거
3. 최신 버전의 애플리케이션 및 데이터베이스 이미지 빌드
4. 데이터베이스 복제본 자동 배포
5. Jest 기반 데이터베이스 테스트 실행
6. Artillery 기반 부하 및 성능 테스트 실행
7. Slack 메시지를 통해 유저에게 테스트 결과 실시간 전달

### 지원하는 테스트
- 데이터베이스 테스트
- 성능 테스트
- 부하 테스트

### 기술 스택
* Docker, Docker Compose
* Jenkins
* Jest
* Artillery
* MongoDB Replica Set
* Slack
* GitHub

### 요구 환경
* Docker 및 Docker Compose
* MongoDB 6.0 이상
* Jenkins 서버
* Node.js v16 이상
* Slack Webhook URL
* GitHub 저장소 접근 권한

자세한 사용법 및 구성 내용은 [Wiki](https://github.com/yejinj/docker-jenkins/wiki)에서 확인 가능합니다.# Jenkins 테스트 Tue Jul 15 04:06:27 PM KST 2025
