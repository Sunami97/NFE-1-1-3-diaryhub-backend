# 교환 일기 서버

이 프로젝트는 Node.js와 Express를 기반으로 한 일기 관리 API 서버입니다. 이 서버는 일기 작성, 읽기, 수정, 삭제 기능과 사용자 인증을 제공합니다. 또한, 이미지 업로드(Cloudinary 사용), 위치 기반 필터링, 공개된 일기 조회 등의 기능을 지원합니다.

## 주요 기능
+ 사용자 인증: bcryptjs를 사용한 비밀번호 암호화와 JWT 기반의 사용자 등록 및 로그인.
+ 일기 관리: 일기 작성, 수정, 삭제, 조회 기능 제공. 이미지 업로드와 위치 기반 필터링 지원.
+ 공개 일기: 공개된 일기 조회 기능 및 사용자 및 지역별 필터링 지원.
+ 이미지 업로드: Cloudinary를 통해 이미지 업로드 및 저장.
+ 댓글 및 좋아요 기능: 일기에 댓글을 달고 좋아요를 추가할 수 있음.

## 사용 기술
+ Node.js
+ Express.js
+ MongoDB 및 Mongoose
+ JWT를 사용한 인증
+ bcryptjs를 사용한 비밀번호 암호화
+ Cloudinary를 이용한 이미지 저장
+ multer를 사용한 파일 업로드
+ dotenv를 사용한 환경 변수 관리

## API 사용법
1. 사용자 관련 API
+ 회원가입: POST /auth/signup
+ 로그인: POST /auth/login
2. 일기 관련 API
+ 일기 작성: POST /diaries
+ 일기 수정: PUT /diaries/:id
+ 일기 삭제: DELETE /diaries/:id
+ 나의 일기 조회: GET /diaries/my-diaries?state=전체&limit=10&skip=0
+ 공개된 일기 조회: GET /diaries/public-diaries?state=전체&limit=10&skip=0
+ 특정 사용자의 공개된 일기 조회: GET /diaries/public-diaries/:username?state=전체&limit=10&skip=0


+ 댓글 작성: POST /diaries/:id/comments
+ 댓글 조회: GET /diaries/:id/comments
+ 댓글 수정: PUT /diaries/:diaryId/comments/:commentId
+ 댓글 삭제: DELETE /diaries/:diaryId/comments/:commentId


+ 좋아요 추가/제거: POST /diaries/like/:id

