# タレントマネジメントシステム構成案

## システム概要
社員の経験、スキル、顧客関係、興味分野を一元管理し、検索・可視化するシステム

## 技術スタック

### バックエンド
- **言語**: Python 3.12+
- **フレームワーク**: FastAPI
- **パッケージ管理**: uv
- **データベース**: PostgreSQL
- **ORM**: SQLAlchemy
- **認証**: JWT (python-jose)
- **バリデーション**: Pydantic
- **全文検索**: Elasticsearch または PostgreSQL Full Text Search
- **統計・分析**: 
  - pandas (データ処理)
  - numpy (数値計算)
  - scikit-learn (機械学習・クラスタリング)
  - networkx (ネットワーク分析)
  - scipy (統計分析)
  - spaCy (自然言語処理)

### フロントエンド
- **フレームワーク**: React 18
- **ビルドツール**: Vite
- **言語**: TypeScript
- **スタイリング**: TailwindCSS
- **UIコンポーネント**: shadcn/ui
- **状態管理**: Zustand or TanStack Query
- **ルーティング**: React Router
- **フォーム**: React Hook Form + Zod
- **グラフ/可視化**: Recharts or D3.js

## システム構成

### ディレクトリ構造
```
free-tms/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   ├── routes/
│   │   │   └── dependencies.py
│   │   ├── core/
│   │   │   ├── config.py
│   │   │   └── security.py
│   │   ├── db/
│   │   │   ├── models.py
│   │   │   └── database.py
│   │   ├── schemas/
│   │   ├── services/
│   │   └── main.py
│   ├── alembic/
│   ├── tests/
│   └── pyproject.toml
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── hooks/
│   │   ├── lib/
│   │   ├── services/
│   │   └── App.tsx
│   ├── public/
│   ├── index.html
│   ├── package.json
│   └── vite.config.ts
├── docker-compose.yml
├── docker-compose.prod.yml
├── .env.example
├── .github/
│   └── workflows/
│       └── deploy.yml
└── infrastructure/
    ├── terraform/
    └── k8s/
```

## 主要機能

### 1. 社員管理
- 基本情報（名前、部署、役職、入社日等）
- スキルセット登録
- 経歴・職歴管理
- プロフィール編集（本人による）
  - 興味関心分野（タグ形式）
  - 自己アピール（自由記述）
  - 希望キャリアパス
  - 得意分野・専門知識
  - 参加したいプロジェクトタイプ

### 2. プロジェクト実績管理
- プロジェクト情報（期間、顧客、規模、技術等）
- 参加メンバーと役割
- 成果・評価

### 3. 顧客関係管理
- 顧客情報
- 担当履歴
- 関係性の強さ

### 4. 検索・フィルタリング
- スキルベース検索
- 経験年数フィルタ
- 顧客関係検索
- 興味分野マッチング
- 全文検索
  - 自己アピール文
  - プロジェクト説明
  - 得意分野・専門知識
  - 自然言語クエリ対応

### 5. プロジェクトマッチング機能
- 募集中プロジェクトに対する適任者推薦
  - 必要スキルマッチング（重み付けスコア）
  - 過去の類似プロジェクト経験者抽出
  - 顧客関係スコア（既存関係の活用）
  - 稼働可能性予測
  - 興味関心マッチング（自己アピール文との意味的類似度）
- マッチングアルゴリズム
  - コサイン類似度（スキルベクトル）
  - 協調フィルタリング（過去の成功パターン）
  - 機械学習モデル（Random Forest, XGBoost）
  - BERT/Doc2Vecによる文書類似度（自己アピールとプロジェクト説明）
- チーム編成最適化
  - スキル補完性分析
  - コミュニケーションコスト考慮
  - 過去の協働実績評価

### 6. 可視化・分析
- スキルマップ
  - スキルクラスタリング（k-means）
  - スキル相関分析
- ネットワークグラフ（社員-顧客関係）
  - 中心性分析（PageRank、次数中心性）
  - コミュニティ検出
- 経験分布チャート
  - ヒストグラム、箱ひげ図
  - 統計的要約（平均、中央値、標準偏差）
- チーム編成シミュレーション
  - スキル補完性スコア
  - 最適化アルゴリズム
- 予測分析
  - 離職リスク予測
  - スキルギャップ分析
  - キャリアパス推薦

## データモデル

### Employee（社員）
- id
- name
- email（ログインID）
- password_hash
- department
- position
- joined_date
- skills (多対多)
- interests (多対多)
- role（一般社員/マネージャー/管理者）
- is_active
- self_introduction（自己アピール文、TEXT）
- career_goals（希望キャリアパス、TEXT）
- specialties（得意分野・専門知識、TEXT）
- preferred_project_types（参加したいプロジェクトタイプ、JSON）
- search_vector（全文検索用ベクトル）

### Project（プロジェクト）
- id
- name
- client_id
- status (draft/recruiting/planning/in_progress/completed/on_hold/cancelled)
- start_date
- end_date
- description
- technologies
- required_skills (多対多)
- preferred_skills (多対多)  # 推奨スキル
- difficulty_level
- team_size
- estimated_duration  # 予定期間
- priority  # 優先度
- recruitment_deadline  # 募集締切
- budget  # 予算

### Client（顧客）
- id
- name
- industry
- contact_info

### ProjectMember（プロジェクトメンバー）
- project_id
- employee_id
- role
- contribution_level

### Skill（スキル）
- id
- name
- category
- level

### EmployeeSkill（社員スキル）
- employee_id
- skill_id
- proficiency_level
- years_of_experience

## API設計

### エンドポイント例
- `POST /api/auth/login` - ログイン（社員全員）
- `POST /api/auth/refresh` - トークンリフレッシュ
- `GET /api/auth/me` - 現在のユーザー情報
- `GET /api/employees` - 社員一覧（権限に応じたフィルタリング）
- `GET /api/employees/{id}` - 社員詳細
- `POST /api/employees` - 社員登録（管理者のみ）
- `PUT /api/employees/{id}` - 社員情報更新（本人または管理者）
- `PUT /api/employees/{id}/profile` - プロフィール更新（本人のみ）
- `GET /api/employees/search` - 社員検索
- `POST /api/search/fulltext` - 全文検索（自己アピール、専門知識等）
- `GET /api/projects` - プロジェクト一覧
- `GET /api/clients` - 顧客一覧
- `GET /api/skills` - スキル一覧
- `GET /api/analytics/skill-map` - スキルマップデータ
- `GET /api/analytics/network` - ネットワークグラフデータ
- `GET /api/analytics/skill-clusters` - スキルクラスタリング結果
- `GET /api/analytics/team-recommendations` - チーム編成推薦
- `GET /api/analytics/employee-similarity` - 社員類似度分析
- `POST /api/analytics/predict-career-path` - キャリアパス予測
- `GET /api/projects?status=recruiting` - 募集中プロジェクト一覧
- `POST /api/projects/{id}/match-employees` - 適任者マッチング
- `GET /api/projects/{id}/recommendations` - 推薦社員リスト（スコア付き）
- `POST /api/projects/{id}/simulate-team` - チーム編成シミュレーション

## セキュリティ考慮事項
- JWT認証（全社員ログイン可能）
- ロールベースアクセス制御（RBAC）
  - 一般社員: 自分の情報閲覧・編集、検索、分析結果閲覧
  - マネージャー: チームメンバー情報閲覧、プロジェクトマッチング利用
  - 管理者: 全機能アクセス、データ管理
- APIレート制限
- データ暗号化
- 監査ログ
- シングルサインオン（SSO）対応
  - Azure AD / Google Workspace連携

## 開発フェーズ

### Phase 1: 基盤構築 ✅ 完了
1. プロジェクト初期設定 ✅
2. データベース設計・構築 ✅
3. 認証システム実装 ✅
4. 基本的なCRUD API ✅

### Phase 2: コア機能実装 🚧 進行中
1. 社員管理機能 ✅
2. プロジェクト管理機能 ✅
3. スキル管理機能 ✅
4. クライアント管理機能 ✅
5. 検索機能 ⏳ 未実装

### Phase 3: マッチング機能 ⏳ 未実装
1. 募集中プロジェクト機能
2. 適任者マッチング
3. 勧誘メール機能

### Phase 4: 可視化・分析 ⏳ 未実装
1. ダッシュボード（基本版のみ実装済）
2. グラフ・チャート実装
3. レポート機能

### Phase 5: 拡張機能 ⏳ 未実装
1. 通知システム
2. インポート/エクスポート
3. 外部システム連携

## 開発・デプロイ環境

### ローカル開発環境（Docker）
```yaml
# docker-compose.yml
services:
  backend:
    build: ./backend
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=postgresql://user:pass@db:5432/tms
    volumes:
      - ./backend:/app
  
  frontend:
    build: ./frontend
    ports:
      - "5173:5173"
    volumes:
      - ./frontend:/app
  
  db:
    image: postgres:15
    environment:
      - POSTGRES_DB=tms
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=pass
    volumes:
      - postgres_data:/var/lib/postgresql/data
  
  elasticsearch:
    image: elasticsearch:8.11.0
    environment:
      - discovery.type=single-node
    ports:
      - "9200:9200"
```

### AWS本番環境構成
- **コンピューティング**: ECS Fargate / EKS
- **データベース**: RDS PostgreSQL (Multi-AZ)
- **検索**: Amazon OpenSearch Service
- **ストレージ**: S3 (静的ファイル)
- **CDN**: CloudFront
- **ロードバランサー**: ALB
- **認証**: Cognito (オプション)
- **メール送信**: SES
- **CI/CD**: GitHub Actions + ECR + ECS
- **監視**: CloudWatch + X-Ray
- **インフラ管理**: Terraform

## プロジェクト勧誘メール機能

### 機能概要
- マネージャーが募集中プロジェクトに適した社員を検索・選定
- 選定した複数の社員に一括で勧誘メールを送信
- メールテンプレートのカスタマイズ
- 返信状況のトラッキング

### メール機能詳細
- **テンプレート管理**
  - プロジェクトタイプ別テンプレート
  - 変数埋め込み（社員名、プロジェクト詳細等）
  - プレビュー機能
- **送信管理**
  - 送信予約
  - 一括送信/個別送信
  - CC/BCC設定
- **トラッキング**
  - 開封率追跡
  - 返信状況管理
  - 参加意思表示の集計

### データモデル追加
```
### ProjectInvitation（プロジェクト勧誘）
- id
- project_id
- employee_id
- sent_at
- opened_at
- response_status (pending/accepted/declined)
- response_comment
- sent_by (マネージャーID)

### EmailTemplate（メールテンプレート）
- id
- name
- subject
- body
- variables (JSON)
- created_by
```

### API追加
- `POST /api/projects/{id}/invitations` - 勧誘メール送信
- `GET /api/projects/{id}/invitations` - 勧誘状況一覧
- `PUT /api/invitations/{id}/response` - 社員の返答登録
- `GET /api/email-templates` - テンプレート一覧
- `POST /api/email-templates` - テンプレート作成

## 推奨追加機能

### 1. スキル評価・フィードバック機能
- プロジェクト終了後の360度評価
- スキルレベルの客観的評価（同僚・上司による）
- 成長曲線の可視化
- スキルギャップ分析と学習推奨

### 2. ナレッジ共有機能
- プロジェクトの振り返り・学びの記録
- 技術的なTips・ノウハウ共有
- 社内勉強会・技術ブログ機能
- Q&Aフォーラム

### 3. 稼働管理・リソース最適化
- 現在の稼働率可視化
- 将来の稼働予測
- プロジェクト間のリソース調整提案
- オーバーワーク警告

### 4. メンタリング・成長支援
- メンター・メンティーマッチング
- 1on1記録管理
- キャリア面談履歴
- 個人目標管理（OKR/MBO）

### 5. 外部連携・自動化
- カレンダー連携（Google Calendar/Outlook）
- Slack/Teams通知連携
- 勤怠システム連携
- GitHubアクティビティ自動取得
- CI/CDパイプラインとの統合

### 6. AI活用機能
- スキル習得予測（どのくらいで習得可能か）
- チーム相性分析
- プロジェクト成功確率予測
- 自動レポート生成（月次・四半期）
- 異常検知（急激なパフォーマンス低下など）