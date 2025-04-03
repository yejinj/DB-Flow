const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

const SCRIPT_DIR = __dirname;
const PROJECT_ROOT = path.join(SCRIPT_DIR, '../..');
const ENV_PATH = path.join(PROJECT_ROOT, '.env');
const YAML_FILE = path.join(SCRIPT_DIR, 'performance-test.yml');
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
const json_result = path.join(RESULT_DIR, `perf_result-${timestamp}.json`);

if (!fs.existsSync(RESULT_DIR)) {
  fs.mkdirSync(RESULT_DIR, { recursive: true });
}

async function runPerformanceTest() {
  try {
    console.log('성능 테스트 실행 시작');
    execSync(`artillery run "${YAML_FILE}" -o "${json_result}"`, { stdio: 'inherit' });

    const results = JSON.parse(fs.readFileSync(json_result, 'utf8'));
    const {
      'http.requests': total_requests,
      'http.response_time': response_times,
      'http.request_rate': rps
    } = results.aggregate.counters;

    const {
      mean: response_time_mean,
      p95: response_time_p95,
      p99: response_time_p99,
      max: response_time_max,
      min: response_time_min
    } = results.aggregate.summaries['http.response_time'];

    let status_text = '성공';
    if (response_time_p95 >= (process.env.MAX_P95_RESPONSE || 1000)) {
      status_text = '경고';
    } else if (response_time_mean >= (process.env.MAX_AVG_RESPONSE || 500)) {
      status_text = '주의';
    }

    const build_url = 'http://223.130.153.17:8081/job/main-pipeline';
    const report_url = `${build_url}/artifact/results/perf_result-${timestamp}.json`;

    const slack_message = {
      blocks: [
        {
          type: "header",
          text: {
            type: "plain_text",
            text: "성능 테스트 결과"
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
              text: `*초당 처리량*\n${rps}회`
            },
            {
              type: "mrkdwn",
              text: `*총 요청 수*\n${total_requests}회`
            },
            {
              type: "mrkdwn",
              text: `*최소 응답 시간*\n${response_time_min}ms`
            },
            {
              type: "mrkdwn",
              text: `*평균 응답 시간*\n${response_time_mean}ms`
            },
            {
              type: "mrkdwn",
              text: `*P95 응답 시간*\n${response_time_p95}ms`
            },
            {
              type: "mrkdwn",
              text: `*P99 응답 시간*\n${response_time_p99}ms`
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

    console.log('성능 테스트가 완료되었습니다.');
  } catch (error) {
    console.error('성능 테스트 실행 중 오류 발생:', error);
    process.exit(1);
  }
}

runPerformanceTest(); 