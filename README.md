# Free TMS - タレントマネジメントシステム

社員の経験、スキル、顧客関係、興味分野を一元管理し、検索・可視化するシステムです。

## 技術スタック

- **Backend**: Python 3.12 + FastAPI + PostgreSQL + Elasticsearch
- **Frontend**: React + TypeScript + Vite + TailwindCSS
- **Infrastructure**: Docker + AWS

## セットアップ

### 1. 環境変数の設定
```bash
cp .env.example .env
# .envファイルを編集して適切な値を設定
```

### 2. Dockerで起動
```bash
docker-compose up -d
```

### 3. データベースマイグレーション
```bash
cd backend
uv run alembic upgrade head
```

### 4. アクセス
- Frontend: http://localhost:5173
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

## 開発

### バックエンド開発
```bash
cd backend
uv run uvicorn main:app --reload
```

### フロントエンド開発
```bash
cd frontend
npm run dev
```

### 新しいマイグレーションの作成
```bash
cd backend
uv run alembic revision --autogenerate -m "説明"
```