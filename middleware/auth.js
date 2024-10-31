
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');

dotenv.config();
const { JWT_SECRET } = process.env;

module.exports = (req, res, next) => {
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

