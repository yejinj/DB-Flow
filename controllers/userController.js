const User = require('../models/User');

// 사용자 목록 조회
exports.getUsers = async (req, res) => {
    try {
        const users = await User.find();
        res.json(users);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// 사용자 생성
exports.createUser = async (req, res) => {
    const user = new User({
        username: req.body.username,
        email: req.body.email
    });

    try {
        const newUser = await user.save();
        res.status(201).json(newUser);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
}; 