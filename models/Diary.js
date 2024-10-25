const mongoose = require('mongoose');

// 댓글 스키마 
const commentSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    content: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
});

// 일기 스키마
const diarySchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    content: { type: String, required: true },
    images: [{ type: String }],
    thumbnail: { type: String },
    location: {
        state: { type: String, required: true },
        coordinates: {
            latitude: { type: Number, required: true },
            longitude: { type: Number, required: true },
        },
    },
    mood: { type: String, required: true },
    weather: { type: String, required: true },
    diaryDate: { type: Date, required: true }, // 일기 날짜 필드 추가
    isPublic: { type: Boolean, default: false },
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    comments: [commentSchema], // 댓글 필드 추가
    createdAt: { type: Date, default: Date.now },
});

const Diary = mongoose.model('Diary', diarySchema);
module.exports = Diary;