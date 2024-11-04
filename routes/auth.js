const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const router = express.Router();
const authMiddleware = require('../middleware/auth');

// 회원가입
router.post('/signup', async (req, res) => {
    const { username, password } = req.body;

    try {
        const existingUser = await User.findOne({ username });
        if (existingUser) {
            return res.status(400).json({ message: '이미 존재하는 유저명입니다.' });
        }

        const newUser = new User({ username, password });
        await newUser.save();

        res.status(201).json({ message: '회원가입 성공', userId: newUser._id });
    } catch (error) {
        console.error('회원가입 중 오류 발생:', error.message);
        res.status(500).json({ message: '서버 오류가 발생했습니다.' });
    }
});

// 로그인 및 토큰 발급
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        // 요청 값 검증
        if (!username || !password) {
            console.error('유저명 또는 비밀번호가 누락되었습니다.');
            return res.status(400).json({ message: '유저명과 비밀번호를 입력하세요.' });
        }

        // 유저 조회
        const user = await User.findOne({ username });
        if (!user) {
            console.error('유저를 찾을 수 없습니다:', username);
            return res.status(404).json({ message: '유저를 찾을 수 없습니다.' });
        }

        // 비밀번호 비교
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            console.error('비밀번호가 틀렸습니다.');
            return res.status(401).json({ message: '비밀번호가 틀렸습니다.' });
        }

        // JWT 토큰 발급
        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET);
        console.log('로그인 성공:', username);

        res.json({ token });
    } catch (error) {
        console.error('로그인 중 오류 발생:', error.message);
        res.status(500).json({ message: '서버 오류가 발생했습니다.' });
    }
});

// 회원 탈퇴
router.delete('/delete', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.userId;

        // 사용자가 작성한 모든 다이어리 가져오기
        const userDiaries = await Diary.find({ user: userId });

        // Cloudinary에서 사용자의 모든 다이어리 이미지 삭제
        for (const diary of userDiaries) {
            for (const image of diary.images) {
                await cloudinary.uploader.destroy(image.public_id);
            }
        }

        // 사용자의 다이어리 삭제
        await Diary.deleteMany({ user: userId });

        // 사용자 계정 삭제
        await User.findByIdAndDelete(userId);

        res.status(200).json({ message: '회원 탈퇴가 완료되었습니다.' });
    } catch (error) {
        console.error('회원 탈퇴 오류:', error.message);
        res.status(500).json({ message: '서버 오류가 발생했습니다.' });
    }
});


module.exports = router;
