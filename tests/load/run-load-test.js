const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

const SCRIPT_DIR = __dirname;
const PROJECT_ROOT = path.join(SCRIPT_DIR, '../../app');
const ENV_PATH = path.join(SCRIPT_DIR, '../../.env');
const YAML_FILE = path.join(SCRIPT_DIR, 'load-test.yml');
const RESULT_DIR = path.join(PROJECT_ROOT, 'results');

if (!fs.existsSync(ENV_PATH)) {
  console.error('[!] .env 파일을 찾을 수 없습니다. SLACK_WEBHOOK_URL을 설정해주세요.');
  process.exit(1);
}
dotenv.config({ path: ENV_PATH });

const timestamp = new Date().toISOString().replace(/[:.]/g, '');
const formatted_time = new Date().toLocaleString('ko-KR', {
  month: 'long',
  day: 'numeric',
  hour: 'numeric',
  minute: 'numeric'
});
const json_result = path.join(RESULT_DIR, `result-${timestamp}.json`);

if (!fs.existsSync(RESULT_DIR)) {
  fs.mkdirSync(RESULT_DIR, { recursive: true });
}

async function runLoadTest() {
  try {
    console.log('부하 테스트 실행 시작');
    execSync(`artillery run "${YAML_FILE}" -o "${json_result}"`, { stdio: 'inherit' });

    const results = JSON.parse(fs.readFileSync(json_result, 'utf8'));
    const {
      'http.requests': total_requests = 0,
      'http.responses': total_responses = 0,
      'vusers.failed': failed_vusers = 0,
      'vusers.completed': completed_vusers = 0,
      'vusers.created': concurrent_users = 0,
      'errors.ECONNREFUSED': error_rate = 0
    } = results.aggregate.counters;

    const total_vusers = completed_vusers + failed_vusers;
    const fail_rate = (failed_vusers / total_vusers * 100).toFixed(2);

    let status_text = '성공';
    if (fail_rate >= (process.env.MAX_FAIL_RATE || 5.0)) {
      status_text = '경고';
    } else if (error_rate >= (process.env.MAX_ERROR_RATE || 10)) {
      status_text = '주의';
    }

    const build_url = `${process.env.JENKINS_URL}/job/${process.env.JENKINS_JOB_NAME}`;
    const report_url = `${build_url}/artifact/results/result-${timestamp}.json`;

    const slack_message = {
      blocks: [
        {
          type: "header",
          text: {
            type: "plain_text",
            text: "부하 테스트 결과"
          }
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*상태: ${status_text}*\n*테스트 시간: ${formatted_time}*`
          }
        },
        {
          type: "section",
          fields: [
            {
              type: "mrkdwn",
              text: `*동시 접속자*\n${concurrent_users}명`
            },
            {
              type: "mrkdwn",
              text: `*총 사용자*\n${total_vusers}명`
            },
            {
              type: "mrkdwn",
              text: `*요청 수*\n${total_requests}회`
            },
            {
              type: "mrkdwn",
              text: `*응답 수*\n${total_responses}회`
            },
            {
              type: "mrkdwn",
              text: `*실패율*\n${fail_rate}%`
            },
            {
              type: "mrkdwn",
              text: `*에러 발생*\n${error_rate}회`
            }
          ]
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `<${report_url}|상세 리포트 보기>`
          }
        }
      ]
    };

    console.log('[+] Slack 메시지 전송 시작');
    await fetch(process.env.SLACK_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(slack_message)
    });

    console.log('부하 테스트가 완료되었습니다.');
  } catch (error) {
    console.error('부하 테스트 실행 중 오류 발생:', error);
    process.exit(1);
  }
}

runLoadTest(); 