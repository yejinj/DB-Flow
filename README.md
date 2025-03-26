### MongoDB Replica Set 자동화 배포 및 성능 테스트 파이프라인

### 개요
이 프로젝트는 Naver Cloud Platform 환경에서 MongoDB Replica Set을 자동으로 배포하고, 
코드 변경 시 자동 빌드, 테스트, 성능 측정  결과를 Slack으로 알림하는 CI/CD 파이프라인입니다. <br>
MongoDB 기반의 웹 서비스를 운영하는 환경에서, GitHub에 코드를 푸시하여 코드 테스트 및 품질 확인을 자동으로 진행할 수 있습니다. <br>
* 인프라: NCP Compute / Kubernetes / Docker
* 데이터베이스: MongoDB 6.0 Replica Set
* CI/CD: Jenkins, GitHub Webhook
* 테스트 : Artillery 기반 부하 테스트
* 알림 시스템: Slack Webhook


### CI/CD 파이프라인 구성
- 파이프라인 흐름
```plaintext
GitHub Webhook → Jenkins Trigger → Docker Build → MongoDB 배포 → Artillery 테스트 → Slack 알림
```

1. GitHub에 커밋/PR 발생 시 Webhook으로 Jenkins 트리거
2. Jenkins가 Docker를 통해 MongoDB 컨테이너 자동 배포
3. Replica Set 자동 초기화 및 상태 확인
4. Artillery로 부하 테스트 실행
5. Slack 채널에 테스트 결과 요약 전송