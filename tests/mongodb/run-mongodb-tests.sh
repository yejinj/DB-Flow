#!/bin/bash

set -e

echo "MongoDB 통합 테스트 시작"
source ./.env

TEST_DIR="tests/mongodb"
RESULT=""
SUCCESS_COUNT=0
FAIL_COUNT=0

echo "MongoDB 연결 시작"
MAX_RETRIES=30
RETRY_COUNT=0

while ! npx jest "$TEST_DIR/connection.test.js" --silent > /dev/null 2>&1; do
    if [ $RETRY_COUNT -ge $MAX_RETRIES ]; then
        echo "MongoDB 연결 실패"
        exit 1
    fi
    echo "MongoDB 연결 대기 (${RETRY_COUNT}/${MAX_RETRIES})"
    RETRY_COUNT=$((RETRY_COUNT+1))
    sleep 2
done

echo "MongoDB 연결 성공"

TEST_FILES=(
    "connection.test.js"
    "readPreference.test.js"
    "ttlIndex.test.js"
    "explainIndex.test.js"
    "transaction.test.js"
    "failover.test.js"
)

for file in "${TEST_FILES[@]}"; do
    echo "테스트 실행 중, $file"
    if npx jest "$TEST_DIR/$file" --runInBand --forceExit; then
        RESULT="$RESULT\n $file 성공"
        SUCCESS_COUNT=$((SUCCESS_COUNT+1))
    else
        RESULT="$RESULT\n $file 실패"
        FAIL_COUNT=$((FAIL_COUNT+1))
    fi
done

TOTAL_COUNT=$((SUCCESS_COUNT+FAIL_COUNT))

SLACK_MESSAGE="*MongoDB 테스트 결과* (${SUCCESS_COUNT}/${TOTAL_COUNT} 성공)\n$RESULT"

if [ ! -z "$SLACK_WEBHOOK" ]; then
    echo "Slack 알림 전송 시작"
    curl -X POST -H 'Content-type: application/json' --data "{\"text\":\"$SLACK_MESSAGE\"}" $SLACK_WEBHOOK
    echo "Slack 알림 전송 완료"
fi

if [ $FAIL_COUNT -gt 0 ]; then
    echo -e "\n 일부 테스트 실패"
    exit 1
else
    echo -e "\n 모든 테스트 성공"
    exit 0
fi