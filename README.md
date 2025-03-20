<p align="center">
  <img src="https://github.com/user-attachments/assets/368ded06-469b-43ef-90c2-ba5a494353cb" width="800"/>
</p>

이 프로젝트는 Naver Cloud Platform 기반 서버에서 MongoDB 컨테이너를 자동 배포하고, 테스트 자동화 및 모니터링까지 수행하는 CI/CD 파이프라인을 구축합니다.
1. **GitHub → Jenkins 트리거**     
코드 Push 시 GitHub Webhook이 Jenkins를 트리거합니다.

2. **Jenkins CI/CD**     
Docker 이미지 빌드     
MongoDB 컨테이너 배포     

3. **테스트 자동화**     
DB 연결 테스트     
API 응답 테스트     
성능 부하 테스트     
→ 실패 시 Slack 알림 전송      

4. **모니터링**
Prometheus로 메트릭 수집     
Grafana로 시각화     
