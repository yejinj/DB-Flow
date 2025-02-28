# CI/CD Pipeline Project

## 프로젝트 목표
이 프로젝트는 **CI/CD 파이프라인 자동화**를 통해 **MongoDB 기반 데이터베이스 관리 서비스** 를 안정적으로 배포/운영하는 것을 목표로 합니다.  
특히, **테스트 자동화**와 **모니터링 시스템**을 통해 배포 신뢰성을 높이고 장애를 대응합니다.

---

## 기술 스택
- **인프라**: NCP Compute Server  
- **CI/CD**: Jenkins, Docker  
- **애플리케이션**: Node.js, Express  
- **데이터베이스**: MongoDB  
- **모니터링**: Prometheus, Grafana  
- **테스트**: Jest, Mocha, Testcontainers  
- **협업**: GitHub  

---

## 시스템 구성도
[GitHub Repo]: 소스 코드  
→ [Jenkins Pipeline]: Jenkinsfile 실행 (CI/CD)  
→ [Docker Image]: Dockerfile 빌드  
→ [Docker Hub]: 이미지 저장  
→ [테스트 자동화]: 단위 테스트 & 통합 테스트 실행  
→ [배포 환경]: 개발(develop) / 스테이징(staging) / 운영(main)  
→ [모니터링 시스템]: Prometheus & Grafana, 로그 분석 및 알림 시스템  

---

## 자동화 트리거
GitHub Webhook 설정  
1. **Payload URL**: `http://<Jenkins-IP>:8080/github-webhook/`  
2. **Content type**: application/json  
3. **Payload**: push 이벤트 발생 시 커밋 정보 및 변경 파일 포함  
4. **Events**: Push 이벤트  

---

## 구현 완료
- [도커 이미지 빌드 자동화 파이프라인 (단일 파이프라인)](https://www.notion.so/1a50a44143a180b0960bc6ee7b6e4492?pvs=21)  
- [파이프라인 분리 (develop / staging / main)](https://www.notion.so/develop-staging-main-1a60a44143a1807dacdecba9f8a38cab?pvs=21)  
- [Git Autopush](https://www.notion.so/Git-Autopush-1a70a44143a180f79155dce0c86f2d93?pvs=21)  

---

## 구현 예정
### 테스트 자동화
CI/CD 파이프라인에서 자동 테스트를 실행하여 안정성을 검증합니다.

- **단위 테스트 (Unit Test)**  
  - Jest, Mocha를 사용하여 주요 비즈니스 로직 및 API 기능 테스트  

- **통합 테스트 (Integration Test)**  
  - Testcontainers를 활용해 MongoDB 연동 및 외부 API 테스트 환경 구축  
  - 실제 서비스와 동일한 환경에서 테스트 실행  

- **배포 자동화 및 테스트 반영**  
  - 테스트 성공 시 자동 배포, 실패 시 빌드 중단  

---

### 모니터링 시스템 구축
MongoDB 애플리케이션의 성능을 실시간으로 추적하고, 장애 발생 시 즉각 대응합니다.

- **성능 모니터링**  
  - Prometheus & Grafana로 CPU, 메모리, 네트워크 사용량 및 MongoDB 쿼리 성능 시각화  

- **로그 분석 및 오류 감지**  
  - Loki 또는 ELK Stack을 활용하여 API 응답 시간, 오류 로그, 시스템 이벤트 분석  

- **알림 시스템 연동**  
  - 장애 발생 시 Slack 및 이메일로 실시간 알림 전송  
  - 성능 저하 감지 시 자동 대응  