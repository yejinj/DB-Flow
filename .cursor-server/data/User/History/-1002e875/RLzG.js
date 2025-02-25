const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

// 기존 라우트들...

// GET /api/users/:id - 특정 사용자 조회
router.get('/:id', userController.getUser);

// PUT /api/users/:id - 사용자 정보 수정
router.put('/:id', userController.updateUser);

// DELETE /api/users/:id - 사용자 삭제
router.delete('/:id', userController.deleteUser);

module.exports = router; 