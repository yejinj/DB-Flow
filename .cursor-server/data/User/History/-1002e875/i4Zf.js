const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

// GET /api/users - 모든 사용자 조회
router.get('/', userController.getUsers);

// POST /api/users - 새 사용자 생성
router.post('/', userController.createUser);

module.exports = router; 