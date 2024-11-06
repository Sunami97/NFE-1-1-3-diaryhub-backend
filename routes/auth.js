const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');

// 회원가입
router.post('/signup', async (req, res) => {
    try {
        const { userId, username, password } = req.body;

        // 중복 체크
        const existingUserByUserId = await User.findOne({ userId });
        if (existingUserByUserId) {
            return res.status(400).json({ message: '이미 존재하는 User ID입니다.' });
        }

        const existingUserByUsername = await User.findOne({ username });
        if (existingUserByUsername) {
            return res.status(400).json({ message: '이미 존재하는 사용자 이름입니다.' });
        }

        // 새로운 유저 생성 및 저장
        const newUser = new User({
            userId,
            username,
            password
        });
        await newUser.save();

        res.status(201).json({ message: '회원가입이 완료되었습니다.' });
    } catch (error) {
        console.error('회원가입 오류:', error);
        res.status(500).json({ message: '서버 오류가 발생했습니다.' });
    }
});


// 로그인 및 토큰 발급
router.post('/login', async (req, res) => {
    try {
        const { userId, password } = req.body;

        // userId로 사용자 찾기
        const user = await User.findOne({ userId });
        if (!user) {
            return res.status(400).json({ message: '사용자를 찾을 수 없습니다.' });
        }

        // 비밀번호 비교
        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
            return res.status(400).json({ message: '비밀번호가 일치하지 않습니다.' });
        }

        const token = jwt.sign(
            { userId: user._id },
            process.env.JWT_SECRET
        );

        res.status(200).json({ message: '로그인 성공', token });
    } catch (error) {
        console.error('로그인 오류:', error);
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
