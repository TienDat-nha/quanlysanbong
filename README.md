# SanBong Web

Du an da duoc tach thanh 2 thu muc rieng de ban deploy frontend va backend len 2 hosting khac nhau.

- `frontend/`: React app
- `backend/`: Express API + MongoDB

## Cau truc thu muc

```text
project/
|-- frontend/
|   |-- src/
|   |-- public/
|   `-- package.json
|-- backend/
|   |-- controllers/
|   |-- routes/
|   |-- models/
|   `-- server.js
`-- README.md
```

## Cai dat

Neu muon quan ly toan bo du an tu root:

```bash
npm install
```

Neu muon cai rieng tung ben:

```bash
cd frontend && npm install
cd backend && npm install
```

## Cau hinh frontend

Tao `frontend/.env`:

```env
REACT_APP_API_URL=http://localhost:5000
```

Khi deploy that, doi sang domain backend cua ban:

```env
REACT_APP_API_URL=https://api.your-domain.com
```

## Cau hinh backend

Tao `backend/.env` tu `backend/.env.example`.

Vi du:

```env
PORT=5000
CLIENT_ORIGIN=http://localhost:3000,https://your-frontend-domain.com
SERVER_PUBLIC_URL=https://api.your-domain.com
JWT_SECRET=replace_with_a_strong_secret
MONGODB_URI=mongodb://127.0.0.1:27017
MONGODB_DB_NAME=sanbong_db
MONGODB_SERVER_SELECTION_TIMEOUT_MS=3000
MAIL_PROVIDER=smtp
MAIL_FROM=your_email@gmail.com
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
OTP_EXPIRES_MINUTES=10
OTP_RESEND_SECONDS=60
```

`CLIENT_ORIGIN` ho tro nhieu frontend domain, ngan cach bang dau phay. Domain dau tien duoc dung de tao link redirect thanh toan.

## Chay du an

Tu root:

```bash
npm run dev
```

Hoac chay rieng:

```bash
npm run server
npm run client
```

## Deploy tach rieng

1. Upload thu muc `frontend/` len hosting frontend.
2. Upload thu muc `backend/` len hosting backend.
3. Cau hinh `frontend/.env` tro den backend URL that.
4. Cau hinh `backend/.env` voi `CLIENT_ORIGIN` tro den frontend URL that.
5. Neu hosting frontend can static build, chay `cd frontend && npm run build`.

## API chinh

- `POST /api/auth/request-register-otp`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET /api/admin/fields`
- `POST /api/admin/fields`
- `GET /api/users`
- `GET /api/users/:id`
- `GET /api/fields`
- `GET /api/fields/:id`
- `POST /api/bookings`
- `GET /api/bookings/me`
- `POST /api/contact`
