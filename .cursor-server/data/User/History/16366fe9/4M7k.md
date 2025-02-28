# CI/CD Pipeline Project

## 프로젝트 목표
이 프로젝트는 **CI/CD 파이프라인 자동화**를 통해 **MongoDB 기반 데이터베이스 관리 서비스** 를 배포/운영합니다.  
특히 **테스트 자동화**와 **모니터링 시스템**을 통해 신뢰성을 확보하고 장애를 예방하는 것을 목표로 하고 있습니다.

## 기술 스택
- **인프라**: NCP Compute Server  
- **CI/CD**: Jenkins, Docker  
- **애플리케이션**: Node.js, Express  
- **데이터베이스**: MongoDB  
- **모니터링**: Prometheus, Grafana  
- **테스트**: Jest, Mocha, Testcontainers  

## 시스템 구성도
GitHub Repo <br>
→ Jenkins Pipeline: CI/CD <br>
→ Docker Image: 이미지 빌드 <br>
→ Docker Hub: 이미지 저장 <br>
→ 테스트 자동화 <br>
→ 배포 환경: 개발(develop) / 스테이징(staging) / 운영(main)   <br>
→ 모니터링 시스템: 로그 분석 및 알림


## 자동화 트리거
GitHub Webhook 설정  
1. **Payload URL**: `http://<Jenkins-IP>:8080/github-webhook/`  
2. **Content type**: application/json  
3. **Payload**: push 이벤트 발생 시 커밋 정보 및 변경 파일 포함  
4. **Events**: Push 이벤트  