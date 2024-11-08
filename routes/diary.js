const express = require('express');
const Diary = require('../models/Diary');
const User = require('../models/User');
const router = express.Router();
const upload = require('../config/cloudinary');
const cloudinary = require('cloudinary').v2;
const { authMiddleware, authMiddlewareOptional } = require('../middleware/auth');

// 다이어리 생성
router.post('/', authMiddleware, upload.array('images', 10), async (req, res) => {
    try {
        const { title, content, mood, weather, diaryDate, isPublic, state } = req.body;

        let latitude = parseFloat(req.body.latitude);
        let longitude = parseFloat(req.body.longitude);

        if (isNaN(latitude)) latitude = 0.0;
        if (isNaN(longitude)) longitude = 0.0;

        const imageUploads = req.files.map((file) => ({
            url: file.path,
            public_id: file.filename,
        }));

        const newDiary = new Diary({
            user: req.user.userId,
            title,
            content,
            location: {
                state,
                coordinates: { latitude, longitude },
            },
            mood,
            weather,
            diaryDate: new Date(diaryDate),
            isPublic: isPublic === 'true',
            images: imageUploads,
            thumbnail: imageUploads[0].url
        });

        await newDiary.save();
        res.status(201).json(newDiary);
    } catch (error) {
        console.error('일기 작성 오류:', error);
        res.status(500).json({ message: '서버 오류가 발생했습니다.' });
    }
});

//다이어리 수정
router.put('/:id', authMiddleware, upload.array('images', 10), async (req, res) => {
    try {
        const { id } = req.params;
        const { title, content, mood, weather, diaryDate, isPublic, state } = req.body;

        let latitude = parseFloat(req.body.latitude);
        let longitude = parseFloat(req.body.longitude);

        const diary = await Diary.findById(id);
        if (!diary) return res.status(404).json({ message: '일기를 찾을 수 없습니다.' });

        // 본인 확인
        if (diary.user.toString() !== req.user.userId) {
            return res.status(403).json({ message: '본인 일기만 수정할 수 있습니다.' });
        }

        // Cloudinary에 저장된 기존 이미지 삭제
        if (req.files.length > 0) {
            for (const image of diary.images) {
                await cloudinary.uploader.destroy(image.public_id);
            }

            const imageUploads = req.files.map((file) => ({
                url: file.path,
                public_id: file.filename,
            }));

            diary.images = imageUploads;

            diary.thumbnail = imageUploads[0].url;
        }

        // 수정된 데이터 적용
        diary.title = title;
        diary.content = content;
        diary.mood = mood;
        diary.weather = weather;
        diary.diaryDate = new Date(diaryDate);
        diary.isPublic = isPublic === 'true';
        diary.location = {
            state,
            coordinates: {
                latitude: isNaN(latitude) ? 0.0 : latitude,
                longitude: isNaN(longitude) ? 0.0 : longitude,
            },
        };

        await diary.save();
        res.status(200).json(diary);
    } catch (error) {
        console.error('일기 수정 오류:', error.message);
        res.status(500).json({ message: '서버 오류가 발생했습니다.' });
    }
});

//댓글 작성
router.post('/:id/comments', authMiddleware, async (req, res) => {
    try {
        const { content } = req.body;
        const diaryId = req.params.id;

        const diary = await Diary.findById(diaryId);
        if (!diary) {
            return res.status(404).json({ message: '일기를 찾을 수 없습니다.' });
        }

        const comment = { user: req.user.userId, content };
        diary.comments.push(comment);
        await diary.save();

        res.status(201).json(comment);
    } catch (error) {
        console.error('댓글 작성 오류:', error.message);
        res.status(500).json({ message: '서버 오류가 발생했습니다.' });
    }
});

//댓글 조회
router.get('/:id/comments', async (req, res) => {
    try {
        const diary = await Diary.findById(req.params.id).populate('comments.user', 'username');
        if (!diary) {
            return res.status(404).json({ message: '일기를 찾을 수 없습니다.' });
        }

        res.json(diary.comments);
    } catch (error) {
        console.error('댓글 조회 오류:', error.message);
        res.status(500).json({ message: '서버 오류가 발생했습니다.' });
    }
});

// 댓글 수정
router.put('/:diaryId/comments/:commentId', authMiddleware, async (req, res) => {
    try {
        const { diaryId, commentId } = req.params;
        const { content } = req.body;

        // 일기 조회
        const diary = await Diary.findById(diaryId);
        if (!diary) return res.status(404).json({ message: '일기를 찾을 수 없습니다.' });

        // 댓글 조회 및 수정
        const comment = diary.comments.id(commentId);
        if (!comment) return res.status(404).json({ message: '댓글을 찾을 수 없습니다.' });

        // 본인 확인
        if (comment.user.toString() !== req.user.userId) {
            return res.status(403).json({ message: '본인 댓글만 수정할 수 있습니다.' });
        }

        // 댓글 내용 수정
        comment.content = content;
        await diary.save();

        res.status(200).json({ message: '댓글이 수정되었습니다.', comment });
    } catch (error) {
        console.error('댓글 수정 오류:', error.message);
        res.status(500).json({ message: '서버 오류가 발생했습니다.' });
    }
});


//댓글 삭제
router.delete('/:diaryId/comments/:commentId', authMiddleware, async (req, res) => {
    try {
        const { diaryId, commentId } = req.params;

        const diary = await Diary.findById(diaryId);
        if (!diary) return res.status(404).json({ message: '일기를 찾을 수 없습니다.' });

        const comment = diary.comments.id(commentId);
        if (!comment) return res.status(404).json({ message: '댓글을 찾을 수 없습니다.' });

        // 본인 확인
        if (comment.user.toString() !== req.user.userId) {
            return res.status(403).json({ message: '본인 댓글만 삭제할 수 있습니다.' });
        }

        // 배열에서 댓글 제거
        diary.comments.pull(commentId);
        await diary.save();

        res.status(200).json({ message: '댓글이 삭제되었습니다.' });
    } catch (error) {
        console.error('댓글 삭제 오류:', error.message);
        res.status(500).json({ message: '서버 오류가 발생했습니다.' });
    }
});


//나의 일기 조회
router.get('/my-diaries', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.userId;

        const limit = parseInt(req.query.limit) || 10;
        const skip = parseInt(req.query.skip) || 0;

        const myDiaries = await Diary.find({ user: userId })
            .populate('user', '_id username')
            .sort({ createdAt: -1 })
            .skip(skip) // 시작 위치 설정
            .limit(limit); // 개수 제한

        res.json(myDiaries);
    } catch (error) {
        console.error('내 일기 조회 오류:', error.message);
        res.status(500).json({ message: '서버 오류가 발생했습니다.' });
    }
});

// 공개된 일기 조회 (특정 지역 또는 전체)
router.get('/public-diaries', authMiddlewareOptional, async (req, res) => {
    try {
        const userId = req.user ? req.user.userId : null;  // 현재 로그인한 사용자 ID 또는 null
        const { state } = req.query; // 쿼리로 요청된 시/도 정보
        const limit = parseInt(req.query.limit) || 10;
        const skip = parseInt(req.query.skip) || 0;

        // 기본 쿼리 조건: 공개된 일기
        const query = { isPublic: true };

        // 로그인된 사용자의 일기 제외
        if (userId) {
            query.user = { $ne: userId };
        }

        // 특정 지역이 지정된 경우 (state가 "전체"가 아닐 때)
        if (state && state !== '전체') {
            query['location.state'] = state; // 해당 지역의 일기만 필터링
        }

        // 일기 조회 (최신순 정렬, skip과 limit 적용)
        const publicDiaries = await Diary.find(query)
            .populate('user', '_id username') // 작성자 정보 포함
            .sort({ createdAt: -1 }) // 최신순 정렬
            .skip(skip) // 시작 위치 설정
            .limit(limit); // 개수 제한

        res.json(publicDiaries);
    } catch (error) {
        console.error('공개된 일기 조회 오류:', error.message);
        res.status(500).json({ message: '서버 오류가 발생했습니다.' });
    }
});

// 특정 ID의 일기 정보 조회
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const limit = parseInt(req.query.limit) || 10;
        const skip = parseInt(req.query.skip) || 0;

        const diary = await Diary.findById(id)
            .populate('user', '_id username') // 작성자 정보 포함
            .sort({ createdAt: -1 }) // 최신순 정렬
            .skip(skip) // 시작 위치 설정
            .limit(limit); // 개수 제한;
        if (!diary) {
            return res.status(404).json({ message: '해당 일기를 찾을 수 없습니다.' });
        }

        res.json(diary);
    } catch (error) {
        console.error('일기 조회 오류:', error.message);
        res.status(500).json({ message: '서버 오류가 발생했습니다.' });
    }
});

// 특정 username의 작성 일기를 조회
router.get('/public-diaries/:username', async (req, res) => {
    try {
        const { username } = req.params;
        const limit = parseInt(req.query.limit) || 10; // 조회할 개수, 기본값은 10
        const skip = parseInt(req.query.skip) || 0;    // 시작 위치, 기본값은 0

        // username으로 사용자 조회
        const user = await User.findOne({ username });
        if (!user) {
            return res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });
        }

        // 해당 사용자가 작성한 일기 조회
        const userDiaries = await Diary.find({ user: user._id, isPublic: true, })
            .populate('user', '_id username') // 작성자 정보 포함
            .sort({ createdAt: -1 })
            .skip(skip) // 시작 위치 설정
            .limit(limit); // 개수 제한;

        res.json(userDiaries);
    } catch (error) {
        console.error('유저의 일기 조회 오류:', error.message);
        res.status(500).json({ message: '서버 오류가 발생했습니다.' });
    }
});


// 친구의 일기 목록 조회
router.get('/friend/:friendId', async (req, res) => {
    try {
        const diaries = await Diary.find({ user: req.params.friendId });
        res.json(diaries);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 일기 삭제
router.delete('/:id', authMiddleware, async (req, res) => {
    try {
        const diaryId = req.params.id;

        // 일기 찾기
        const diary = await Diary.findById(diaryId);
        if (!diary) {
            return res.status(404).json({ message: '일기를 찾을 수 없습니다.' });
        }

        // 본인 확인
        if (diary.user.toString() !== req.user.userId) {
            return res.status(403).json({ message: '본인의 일기만 삭제할 수 있습니다.' });
        }

        for (const image of diary.images) {
            await cloudinary.uploader.destroy(image.public_id);
        }

        await Diary.findByIdAndDelete(diaryId);
        res.status(200).json({ message: '일기가 삭제되었습니다.' });
    } catch (error) {
        console.error('일기 삭제 오류:', error.message);
        res.status(500).json({ message: '서버 오류가 발생했습니다.' });
    }
});

//좋아요 
router.post('/like/:id', authMiddleware, async (req, res) => {
    try {
        const diary = await Diary.findById(req.params.id);

        if (!diary) {
            return res.status(404).json({ message: '일기를 찾을 수 없습니다.' });
        }

        if (diary.user.toString() === req.user.userId) {
            return res.status(403).json({ message: '본인 일기에는 좋아요를 할 수 없습니다.' });
        }

        const userId = req.user.userId;
        const likedIndex = diary.likes.indexOf(userId);

        if (likedIndex === -1) {
            diary.likes.push(userId); // 좋아요 추가
        } else {
            diary.likes.splice(likedIndex, 1); // 좋아요 취소
        }

        await diary.save();
        res.json({ message: '좋아요 상태가 변경되었습니다.', likes: diary.likes.length });
    } catch (error) {
        console.error('좋아요 처리 중 오류 발생:', error.message);
        res.status(500).json({ message: '서버 오류가 발생했습니다.' });
    }
});

module.exports = router;
