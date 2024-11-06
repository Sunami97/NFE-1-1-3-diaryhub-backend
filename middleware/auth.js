
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');

dotenv.config();
const { JWT_SECRET } = process.env;

const authMiddleware = (req, res, next) => {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ message: '토큰이 필요합니다.' });

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        res.status(401).json({ message: '유효하지 않은 토큰입니다.' });
    }
};

const authMiddlewareOptional = (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1];

    if (token) {
        jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
            if (err) {
                return res.status(401).json({ message: '유효하지 않은 토큰입니다.' });
            }
            req.user = decoded; // 토큰에서 user 정보를 설정
            next();
        });
    } else {
        next(); // 토큰이 없는 경우에도 통과
    }
};

module.exports = {
    authMiddleware,
    authMiddlewareOptional,
};

