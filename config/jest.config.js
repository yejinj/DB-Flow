module.exports = {
    preset: '@shelf/jest-mongodb', // 몽고DB 테스트 프리셋, 인메모리 환경 이용
    testEnvironment: 'node',
    modulePathIgnorePatterns: [
      '.cursor-server',
      '.vscode-server',
      '.nvm'
    ],
    testMatch: [
      "**/tests/**/*.test.js"
    ]
  };
