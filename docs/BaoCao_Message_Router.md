# BAO CAO BAI THUC HANH - MESSAGE ROUTER

## 1. Thong tin sinh vien
- Ho va ten: ........................................
- MSSV: ........................................
- Lop: ........................................
- Mon: Ngon ngu phat trien ung dung
- Ngay nop: 02/04/2026

## 2. Yeu cau de bai
Xay dung schema message va 3 router:
- GET /api/v1/messages/:userID
  - Lay toan bo tin nhan giua user hien tai va userID
- POST /api/v1/messages
  - Gui noi dung tin nhan den userID
  - Neu gui file: type = file, text = duong dan file
  - Neu gui text: type = text, text = noi dung tin nhan
- GET /api/v1/messages
  - Lay tin nhan cuoi cung cua moi user co hoi thoai voi user hien tai

## 3. Cau truc schema message
Schema da tao trong file schemas/messages.js:
- from: ObjectId, ref user, required
- to: ObjectId, ref user, required
- messageContent:
  - type: String, enum [file, text], required
  - text: String, required
- timestamps: true

## 4. Cac router da thuc hien
### 4.1 GET /api/v1/messages/:userID
Muc dich: Lay lich su chat giua 2 user.

Dieu kien:
- Da dang nhap (checkLogin)
- userID hop le (ObjectId)

Xu ly:
- Tim message theo 2 chieu:
  - from = currentUser, to = userID
  - from = userID, to = currentUser
- Sort tang dan theo thoi gian tao.

### 4.2 POST /api/v1/messages
Muc dich: Gui tin nhan moi.

Body mau (text):

```json
{
  "to": "USER_ID_NHAN",
  "messageContent": {
    "type": "text",
    "text": "Xin chao"
  }
}
```

Body mau (file):

```json
{
  "to": "USER_ID_NHAN",
  "messageContent": {
    "type": "file",
    "text": "uploads/abc123.png"
  }
}
```

Validation da lam:
- to phai la ObjectId hop le
- khong duoc nhan tin cho chinh minh
- messageContent phai co type va text
- type chi nhan file hoac text
- text khong duoc rong
- user nhan phai ton tai

### 4.3 GET /api/v1/messages
Muc dich: Lay tin nhan cuoi cung theo tung hoi thoai.

Xu ly:
- Lay cac tin nhan co lien quan current user
- Xac dinh partnerUser (nguoi doi thoai)
- Sort giam dan theo createdAt
- Group theo partnerUser de lay tin nhan moi nhat

## 5. Danh sach file da tao/sua
- app.js
- routes/messages.js
- schemas/messages.js

## 6. Huong dan test Postman va chup anh
### Buoc 1: Dang nhap lay token
- API: POST /api/v1/auth/login
- Body:
```json
{
  "username": "user_a",
  "password": "123456"
}
```
- Lay token tu response de su dung Bearer Token.

### Buoc 2: Test API POST message
- API: POST /api/v1/messages
- Header: Authorization: Bearer <token>
- Body text/file nhu mau o tren.
- Chup anh man hinh request + response.

### Buoc 3: Test API GET lich su voi 1 user
- API: GET /api/v1/messages/:userID
- Header: Authorization: Bearer <token>
- Chup anh man hinh request + response.

### Buoc 4: Test API GET message cuoi cung
- API: GET /api/v1/messages
- Header: Authorization: Bearer <token>
- Chup anh man hinh request + response.

## 7. Ket luan
Da hoan thanh schema message va 3 router theo dung yeu cau de bai. Cac API da co middleware xac thuc dang nhap va xu ly validation du lieu dau vao.

## 8. Minh chung hinh anh Postman
- Hinh 1: Login thanh cong (lay token)
- Hinh 2: POST /api/v1/messages (type text)
- Hinh 3: POST /api/v1/messages (type file)
- Hinh 4: GET /api/v1/messages/:userID
- Hinh 5: GET /api/v1/messages

(Luu y: Dan hinh chup Postman vao cac muc nay truoc khi nop)
