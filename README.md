# Frontend

Frontend React nay da duoc cau hinh de goi backend:

`https://api-be-football.onrender.com`

## Cai dat

```bash
npm install
npm start
```

## Bien moi truong

Ban co the dat trong hosting UI:

```env
REACT_APP_API_URL=https://api-be-football.onrender.com
```

Neu khong dat, code hien tai van mac dinh goi domain tren.

## Build

```bash
npm run build
```

## Deploy Vercel

- Framework: Create React App
- Build Command: `npm run build`
- Output Directory: `build`
- Env: `REACT_APP_API_URL=https://api-be-football.onrender.com`

Repo da co file [vercel.json](./vercel.json) de rewrite SPA routes.

## Deploy Netlify

- Base directory: de trong
- Build command: `npm install && npm run build`
- Publish directory: `build`
- Env: `REACT_APP_API_URL=https://api-be-football.onrender.com`

Repo da co:
- [netlify.toml](./netlify.toml)
- [public/_redirects](./public/_redirects)

## Deploy Render Static Site

- Build Command: `npm install && npm run build`
- Publish Directory: `build`
- Env: `REACT_APP_API_URL=https://api-be-football.onrender.com`

Neu dung Blueprint, repo da co [render.yaml](./render.yaml).

## Day len repo GitHub moi

Neu muon tach rieng frontend thanh repo doc lap, tu thu muc nay chay:

```bash
git init
git add .
git commit -m "Initial frontend"
git branch -M main
git remote add origin <GITHUB_FRONTEND_REPO_URL>
git push -u origin main
```
