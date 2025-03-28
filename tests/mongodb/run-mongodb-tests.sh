#!/bin/bash

set -e

echo "MongoDB 통합 테스트 시작"
source ./.env

TEST_DIR="."
RESULT=""
SUCCESS_COUNT=0
FAIL_COUNT=0

for file in \
  connection.test.js \
  writeConcern.test.js \
  readPreference.test.js \
  ttlIndex.test.js \
  explainIndex.test.js \
  transaction.test.js \
  failover.test.js
do
  echo "테스트 실행 중: $file"
  if npx jest "$TEST_DIR/$file" --runInBand; then
    RESULT="$RESULT\n $file 성공"
    SUCCESS_COUNT=$((SUCCESS_COUNT+1))
  else
    RESULT="$RESULT\n $file 실패"
    FAIL_COUNT=$((FAIL_COUNT+1))
  fi
done

TOTAL_COUNT=$((SUCCESS_COUNT+FAIL_COUNT))

SLACK_MESSAGE="*MongoDB 테스트 결과* (${SUCCESS_COUNT}/${TOTAL_COUNT} 성공)\n$RESULT"

echo "Slack 알림 전송 시작"
curl -X POST -H 'Content-type: application/json' --data "{\"text\":\"$SLACK_MESSAGE\"}" $SLACK_WEBHOOK
echo "Slack 알림 전송 완료"