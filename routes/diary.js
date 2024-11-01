const express = require('express');
const Diary = require('../models/Diary');
const router = express.Router();
const upload = require('../config/cloudinary');
const cloudinary = require('cloudinary').v2;
const authMiddleware = require('../middleware/auth');

// 다이어리 생성 API (여러 이미지 처리)
router.post('/', authMiddleware, upload.array('images', 10), async (req, res) => {
    try {
        const { title, content, mood, weather, diaryDate, isPublic, state } = req.body;

        let latitude = parseFloat(req.body.latitude);
        let longitude = parseFloat(req.body.longitude);

        if (isNaN(latitude)) latitude = 0.0;
        if (isNaN(longitude)) longitude = 0.0;

        const imageUploads = await Promise.all(req.files.map(async (file) => {
            const uploadedImage = await cloudinary.uploader.upload(file.path);
            return {
                url: uploadedImage.secure_url,
                public_id: uploadedImage.public_id,
            };
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

            const imageUploads = await Promise.all(req.files.map(async (file) => {
                const uploadedImage = await cloudinary.uploader.upload(file.path);
                return {
                    url: uploadedImage.secure_url,
                    public_id: uploadedImage.public_id,
                };
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

        const myDiaries = await Diary.find({ user: userId })
            .populate('user', '_id username')
            .sort({ createdAt: -1 });

        res.json(myDiaries);
    } catch (error) {
        console.error('내 일기 조회 오류:', error.message);
        res.status(500).json({ message: '서버 오류가 발생했습니다.' });
    }
});

//공개된 일기 조회
router.get('/public-diaries', async (req, res) => {
    try {
        const userId = req.user && req.user.userId; // 현재 로그인한 사용자 ID
        let publicDiaries = '';

        // 본인의 일기를 제외하고 공개된 일기만 조회
        if (userId) {
            publicDiaries = await Diary.find({
                isPublic: true,
                user: { $ne: userId }  // 본인의 일기 제외
            })
                .populate('user', '_id username')  // 작성자 정보 포함
                .sort({ createdAt: -1 });

            res.json(publicDiaries);
        } else {
            publicDiaries = await Diary.find({
                isPublic: true,
            })
                .populate('user', '_id username')  // 작성자 정보 포함
                .sort({ createdAt: -1 });

            res.json(publicDiaries);
        }

    } catch (error) {
        console.error('공개된 일기 조회 오류:', error.message);
        res.status(500).json({ message: '서버 오류가 발생했습니다.' });
    }
});

// 특정 지역의 공개된 일기 조회 API
router.get('/public-diaries/location/:state', async (req, res) => {
    try {
        const { state } = req.params; // 요청된 시/도 정보
        const userId = req.user && req.user.userId; // 현재 로그인한 사용자 ID

        let publicDiaries = '';

        if (userId) {
            publicDiaries = await Diary.find({
                isPublic: true,
                user: { $ne: userId },  // 본인의 일기 제외
                'location.state': state, // 해당 지역의 일기만 필터링
            })
                .populate('user', '_id username')
                .sort({ createdAt: -1 });
        } else {
            publicDiaries = await Diary.find({
                isPublic: true,
                'location.state': state, // 해당 지역의 일기만 필터링
            })
                .populate('user', '_id username')
                .sort({ createdAt: -1 });
        }

        res.json(publicDiaries);
    } catch (error) {
        console.error('지역별 공개 일기 조회 오류:', error.message);
        res.status(500).json({ message: '서버 오류가 발생했습니다.' });
    }
});

// 특정 ID의 일기 정보 조회 API
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const diary = await Diary.findById(id).populate('user', '_id username');
        if (!diary) {
            return res.status(404).json({ message: '해당 일기를 찾을 수 없습니다.' });
        }

        res.json(diary);
    } catch (error) {
        console.error('일기 조회 오류:', error.message);
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
