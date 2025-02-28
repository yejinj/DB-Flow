# CI/CD Pipeline Project

## 프로젝트 목표
이 프로젝트는 **CI/CD 파이프라인 자동화**를 구축하여 **효율적인 배포 및 운영 환경을 확보**하는 것을 목표로 합니다.  
특히, **테스트 자동화**와 **모니터링 시스템 구축** 기능을 제공하여 안정적으로 서비스를 운영하는 것을 목표로 합니다.

- **테스트 자동화**: 코드 변경 사항이 단계를 거쳐 자동으로 검증되도록 설정하여 배포 전 오류를 최소화합니다.
- **모니터링**: 애플리케이션 상태를 실시간으로 감시하고, 장애 발생 시 즉각적인 대응이 가능하도록 설정합니다.

---

## 시스템 구성도
[GitHub Repo]: 소스 코드 → [Jenkins Pipeline]: Jenkinsfile 실행 → [Docker Image]: Dockerfile 빌드 → [Docker Hub]: 이미지 저장

---

## 사용 기술

### 인프라
- **NCP Compute Server**
  - Ubuntu 20.04 서버
  - ACG (방화벽) 설정
  - 공인 IP

### CI/CD
- **Jenkins**  
- **Docker**  
- **GitHub**  
- **Docker Hub**  

### 애플리케이션
- **Node.js**  
- **Express**  
- **MongoDB**  

---

## 자동화 트리거
GitHub Webhook 설정  
1. **Payload URL**: `http://<Jenkins-IP>:8080/github-webhook/`  
2. **Content type**: application/json  
3. **Payload**: push 이벤트 발생 시 전송되는 커밋 정보, 변경 파일 등을 포함한 JSON 데이터  
4. **Events**: 이벤트 push

---

## 구현 완료

- [도커 이미지 빌드 자동화 파이프라인 (단일 파이프라인)](https://www.notion.so/1a50a44143a180b0960bc6ee7b6e4492?pvs=21)
- [파이프라인 분리 (develop / staging / main)](https://www.notion.so/develop-staging-main-1a60a44143a1807dacdecba9f8a38cab?pvs=21)
- [Git Autopush](https://www.notion.so/Git-Autopush-1a70a44143a180f79155dce0c86f2d93?pvs=21)

---

## 구현 예정

### **1. 테스트 자동화**
배포 전 코드의 안정성을 검증하기 위해 **자동 테스트 환경**을 구축합니다.

- **단위 테스트 (Unit Test)**
  - Jest, Mocha 등의 프레임워크 활용
  - 주요 비즈니스 로직 및 API 테스트

- **통합 테스트 (Integration Test)**
  - 데이터베이스 및 외부 API와의 연동 테스트
  - [Testcontainers 활용 통합 테스트 환경 구축](https://velog.io/@suhongkim98/Testcontainers%EB%A5%BC-%ED%99%9C%EC%9A%A9%ED%95%98%EC%97%AC-%ED%86%B5%ED%95%A9%ED%85%8C%EC%8A%A4%ED%8A%B8-%ED%99%98%EA%B2%BD-%EA%B5%AC%EC%B6%95%ED%95%98%EA%B8%B0)

- **배포 자동화 및 테스트 결과 반영**
  - 테스트 결과에 따른 빌드 성공/실패 판단
  - 각 환경(develop/staging/main)별 자동 배포

---

### **2. 모니터링 시스템 구축**
**실시간 모니터링 및 알림 시스템**을 도입하여 안정성을 도모합니다.

- **애플리케이션 상태 모니터링**
  - Prometheus & Grafana를 활용한 성능 모니터링
  - CPU, 메모리, 네트워크 사용량 시각화

- **로그 수집 및 분석**
  - ELK(Stack) 또는 Loki + Grafana를 활용한 로그 분석
  - API 응답 시간, 에러 로그, 시스템 이벤트 분석

- **알림 시스템 연동**
  - 장애 발생 시 Slack 및 이메일을 통해 실시간 알림 전송
  - 예기치 않은 성능 저하 또는 장애 감지 시 자동 대응

---

## 개선 방향
- **롤백 자동화**: 배포 실패 시 이전 버전으로 자동 롤백
- **배포 전략 개선**: Canary Deployment 및 Blue-Green Deployment 적용 가능성 검토

---
