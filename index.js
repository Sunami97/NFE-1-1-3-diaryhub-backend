const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const authRoutes = require('./routes/auth');
const diaryRoutes = require('./routes/diary');
const cors = require('cors');


dotenv.config();
const app = express();
const PORT = process.env.PORT || 5000;
const { MONGO_URI } = process.env;

//app.use(cors());
const allowedOrigins = ['http://127.0.0.1:5500', 'http://localhost:3000', 'https://nfe-1-1-3-diaryhub.vercel.app'];
app.use(cors({
    origin: function (origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('CORS 정책에 의해 차단된 출처입니다.'));
        }
    },
}));

app.use(express.json());

// MongoDB 연결
mongoose.connect(MONGO_URI)
    .then(() => console.log('MongoDB 연결 성공'))
    .catch(err => console.error('MongoDB 연결 실패:', err));


// 라우트 설정
app.use('/auth', authRoutes);
app.use('/diaries', diaryRoutes);

// 기본 라우트
app.get('/', (req, res) => {
    res.send('서버가 정상적으로 동작하고 있습니다.');
});

// 서버 시작
app.listen(PORT, () => console.log(`서버가 ${PORT}번 포트에서 실행 중입니다.`));
