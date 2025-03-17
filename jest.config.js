module.exports = {
  preset: '@shelf/jest-mongodb',
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
