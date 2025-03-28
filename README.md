### 데이터베이스 환경 테스트 자동화 CI/CD 파이프라인
이 프로젝트는 Naver Cloud Platform 환경에서 MongoDB Replica Set을 자동으로 배포하고, 
코드 변경 시 자동 빌드, 테스트, 성능 측정 결과를 Slack으로 알림하는 파이프라인입니다. <br>
MongoDB 기반의 웹 서비스를 운영하는 환경에서, GitHub에 코드를 푸시하여 코드 테스트 및 품질 확인을 자동으로 진행 가능하도록 설계하였습니다. <br>

### 스택
* 인프라: NCP Compute / Docker
* 데이터베이스: MongoDB Replica Set
* 파이프라인: Jenkins, GitHub Webhook, Slack Webhook
* 테스트 : Jest 기반 데이터베이스 테스트, Artillery 기반 부하 및 성능 테스트

### CI/CD 파이프라인 구성
- 파이프라인 흐름
```plaintext
유저가 GitHub으로 코드 변경 push -> GitHub Webhook → Jenkins Trigger → Docker Build → MongoDB 배포 → 데이터베이스 테스트 -> 부하 및 성능 테스트 → 유저에게 Slack 알림
```