module.exports = {
    preset: '@shelf/jest-mongodb', // MongoDB IN-MEMORY 테스트 프리셋
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
