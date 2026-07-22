# リミットチャット 仕様書

AI に開発指示を出すときに、このアプリの仕様を共有するためのドキュメント。
コードから読み取れる現状の仕様を記述する。

---

## 1. 概要

「リミットチャット」は、**発言し続けないと脱落する**リアルタイムチャットゲーム。

- 参加者はセッション（開催回）に名前を登録して参加する。
- **一度発言すると沈黙タイマーが動きだす。** 制限時間内に次の発言をしないと「脱落」。
- 終了時刻まで脱落しなかった人が「生き残り」。
- グループ（コミュニティ）単位でセッションを繰り返し開催できる。
- 開催されていない間も、メンバーは「ひとこと」プロフィールで緩くつながれる。

### 主な特徴
- **脱落状態を DB に保存しない。** 参加者の `lastMessageAt`（最終発言時刻）だけを保存し、脱落／生存はクライアント側で時刻から**導出**する（[src/lib/survival.ts](src/lib/survival.ts)）。過去セッションを後から見ても同じロジックで正しい結果が出る。
- グループは URL（スラッグ）を知っている人だけが入る想定。トップページに一覧は出さない。

---

## 2. 技術スタック

| 項目 | 内容 |
|---|---|
| フレームワーク | React 18 + TypeScript |
| ビルドツール | Vite 5 |
| バックエンド | Firebase（Authentication + Cloud Firestore） |
| ルーティング | 自作（[src/lib/router.ts](src/lib/router.ts)、`history.pushState` ベース。React Router 等は不使用） |
| 状態管理 | React hooks + Firestore の `onSnapshot` によるリアルタイム購読（外部ステート管理ライブラリなし） |
| スタイル | 素の CSS（[src/index.css](src/index.css)） |
| デプロイ | Vercel（コミット履歴より） |

### スクリプト
- `npm run dev` — 開発サーバ
- `npm run build` — `tsc && vite build`
- `npm run preview` — ビルド結果のプレビュー

---

## 3. 認証（[src/hooks/useAuth.ts](src/hooks/useAuth.ts)）

- **参加者**: Firebase の**匿名ログイン**。アプリ起動時に自動でサインインする。ユーザ識別は匿名 `uid`。
- **管理者**: メール／パスワードでログイン（非匿名アカウント）。`isAdmin = 非匿名アカウントであること`。
- ログアウトすると再び匿名ログインに戻る。

> 匿名 uid はブラウザ／セッションに紐づく。別端末・別ブラウザでは別人扱いになる。

---

## 4. ルーティング（[src/lib/router.ts](src/lib/router.ts)）

| パス | 画面 | Route |
|---|---|---|
| `/` | トップ（案内のみ） | `home` |
| `/admin` | 管理画面 | `admin` |
| `/:groupId` | グループページ（チャット会場） | `group` |
| `/:groupId/s/:sessionId` | セッション詳細（開始前カウントダウン／終了後ログ） | `session` |
| その他 | Not Found | `notFound` |

- **予約スラッグ**（グループ URL に使えない）: `admin`, `s`, `api`, `assets`, `static`。
- リンクは `linkProps()` を使い、`pushState` で SPA 遷移する（Cmd/Ctrl+クリック等は通常遷移）。

---

## 5. データモデル（Firestore）

コレクション構造:

```
groups/{groupId}
  ├─ sessions/{sessionId}
  │    ├─ participants/{uid}
  │    └─ messages/{messageId}
  └─ members/{uid}
```

型定義は [src/types.ts](src/types.ts)。時刻はすべて **エポックミリ秒（number）**。

### Group（`groups/{groupId}`）
グループ本体。ドキュメント ID = URL スラッグ。

| フィールド | 型 | 説明 |
|---|---|---|
| `id` | string | ドキュメント ID と同一（URL 末尾のスラッグ） |
| `name` | string | グループ名 |
| `description` | string | 説明（任意） |
| `ownerUid` | string | 作成した管理者の uid |
| `createdAt` | number | 作成時刻 |

### Session（`groups/{groupId}/sessions/{sessionId}`）
開催回。

| フィールド | 型 | 説明 |
|---|---|---|
| `id` | string | ドキュメント ID |
| `title` | string | タイトル |
| `startTime` | number | 開始時刻 |
| `endTime` | number | 終了時刻 |
| `silenceLimitMs` | number | 沈黙して脱落するまでのミリ秒 |
| `createdAt` | number | 作成時刻 |
| `createdBy` | string | 作成者 uid |
| `canceledAt` | number \| null | キャンセルした時刻。未設定なら開催予定どおり |

### Participant（`.../participants/{uid}`）
セッションへの参加者。ドキュメント ID = 参加者の uid。

| フィールド | 型 | 説明 |
|---|---|---|
| `id` | string | uid |
| `name` | string | セッション内の表示名 |
| `joinedAt` | number | 参加時刻 |
| `firstMessageAt` | number \| null | 初回発言時刻。null の間は脱落しない |
| `lastMessageAt` | number \| null | 最終発言時刻。**脱落判定の基準** |

### Message（`.../messages/{messageId}`）

| フィールド | 型 | 説明 |
|---|---|---|
| `id` | string | ドキュメント ID |
| `userId` | string | 発言者 uid |
| `userName` | string | 発言時の表示名 |
| `text` | string | 本文（最大 500 文字） |
| `createdAt` | number | 発言時刻 |

### Membership（`groups/{groupId}/members/{uid}`）
セッションとは独立したグループのメンバー登録。ドキュメント ID = uid。

| フィールド | 型 | 説明 |
|---|---|---|
| `id` | string | uid |
| `name` | string | 表示名 |
| `joinedAt` | number | メンバー登録時刻 |
| `note` | string | プロフィールの「ひとこと」（最大 240 文字） |
| `noteUpdatedAt` | number \| null | ひとことの最終更新時刻 |

> **参加すると自動でメンバーになる。** セッションに `join` すると members にも登録される（[src/hooks/useSession.ts](src/hooks/useSession.ts)）。逆に、開催前でもグループに直接メンバー登録できる（[src/components/GroupJoinForm.tsx](src/components/GroupJoinForm.tsx)）。

---

## 6. サバイバル判定ロジック（[src/lib/survival.ts](src/lib/survival.ts)）

このアプリの中核。**DB に脱落フラグを持たず、時刻から状態を導出する。**

### セッションの局面 `sessionPhase(session, now)`
- `before` — `now < startTime`（開始前）
- `live` — 開催中
- `ended` — `now >= endTime`（終了）

### 参加者の状態 `SurvivalStatus`（`evaluate()` が返す）

| status | 意味 | 条件 |
|---|---|---|
| `waiting` | 開始前 | セッションが `before` |
| `grace` | 参加済み・未発言（**脱落しない**） | `live` かつ `firstMessageAt` が null |
| `alive` | 発言済み・沈黙タイマー進行中 | 沈黙期限が未到来 |
| `eliminated` | 沈黙しすぎて脱落 | 沈黙期限 `<= now` |
| `survived` | 終了時刻まで脱落しなかった | `ended` で脱落条件に該当せず |
| `silent` | 一度も発言せず終了 | `ended` かつ未発言 |

### 脱落判定の核心
- 沈黙期限 `deadline = lastMessageAt + silenceLimitMs`。
- **`deadline > endTime` の場合は脱落しない。** つまり終了間際に発言すれば、その後沈黙してタイマーが切れても終了時刻まで逃げ切れば「生存」。
- `deadline <= now` になった瞬間に `eliminated`、脱落確定時刻は `deadline`。

### 発言可否 `canSpeak(state)`
- `grace` または `alive` のときだけ発言できる。脱落後・終了後・開始前は不可。

### 結果集計 `summarize()`
参加者を `survivors` / `eliminated` / `silent` / `waiting` に分類。脱落者は脱落が早い順にソート。

---

## 7. 画面仕様

### トップページ（`/`）[src/pages/HomePage.tsx](src/pages/HomePage.tsx)
案内文のみ。「グループの URL を直接開いてください」。一覧・管理リンクは出さない。

### グループページ（`/:groupId`）[src/pages/GroupPage.tsx](src/pages/GroupPage.tsx)
**チャットの会場でもある**メイン画面。

- 同時に開催されるセッションは **1 つだけ**（時間重複は管理側で禁止）。
- 開催中セッションがあれば `LiveSession` を埋め込んでチャットを表示。
- 未参加ならグループ参加フォーム（`GroupJoinForm`）。
- メンバー一覧（`MemberList`）を常時表示。開催されていない間の主要コンテンツ。自分の行では**表示名**と**ひとこと**を編集できる。
- 開催中でなければ「いまは開催されていません」＋次回開始までのカウントダウン。
- これからの予定 / 過去のセッション一覧。
- **過去のセッション履歴は、一度でも参加したメンバー（または管理者）だけが見られる。**
- キャンセルされたセッションは参加者側には表示しない。

### セッションページ（`/:groupId/s/:sessionId`）[src/pages/SessionPage.tsx](src/pages/SessionPage.tsx)
単体セッションの詳細。**開催中のチャットはやらない**（グループトップへ誘導）。

- `before`: 開始までのカウントダウン。
- `live`: 自動でグループトップへリダイレクト（チャット会場はそちら）。
- `ended`: 結果（`SessionResult`）＋チャットログ（読み取り専用）。
- `canceledAt`: 「この回はキャンセルされました」表示。

### 管理画面（`/admin`）[src/pages/AdminPage.tsx](src/pages/AdminPage.tsx)
管理者ログイン後のコンソール。

- グループ作成（スラッグ・名前・説明）。スラッグは作成後変更不可。
- グループ一覧から選択。
- **グループ編集**（名前・説明。スラッグ＝URL は変更不可）。
- セッション作成（タイトル・開始／終了時刻・沈黙制限秒）。
- **セッション編集**（タイトル・開始／終了時刻・沈黙制限秒。作成時と同じく他セッションとの時間重複チェックあり）。
- セッションのキャンセル／復元（ドキュメントは消さずフラグを立てる）。

---

## 8. 主要な操作フロー

### 参加する（[src/hooks/useSession.ts](src/hooks/useSession.ts) `join`）
1. `participants/{uid}` を作成（既存なら名前だけ更新）。`firstMessageAt` / `lastMessageAt` は null 初期化。
2. 同時に `members/{uid}` にも登録（グループ履歴を見られるように）。

### 発言する（`sendMessage`）
1. `messages` に追加。
2. `participants/{uid}` の `lastMessageAt` を更新。初回なら `firstMessageAt` も設定。

### セッション作成（[src/hooks/useGroup.ts](src/hooks/useGroup.ts) `useGroupAdmin`）
- `endTime <= startTime` は拒否。
- **既存の未キャンセルセッションと時間が重なるものは拒否**（同時開催は 1 つだけ）。

### バリデーション
- スラッグ: `^[a-z0-9][a-z0-9-]{1,30}$`（英小文字・数字・ハイフン、2〜31 文字）＋予約語チェック。
- 名前: 最大 20 文字。ひとこと: 最大 240 文字。メッセージ本文: 最大 500 文字。

---

## 9. 時刻表示ユーティリティ（[src/lib/survival.ts](src/lib/survival.ts)）

- `formatRange(start, end)` — 「7月21日(月) 14:00 〜 14:30」形式。
- `formatDateTime(ts)` — 「7月21日 14:32」形式。
- `formatTimeAgo(ts, now)` — 「3分前」相対表記（1日以上は日付）。
- `formatDuration(ms)` — 「1時間5分」「3分20秒」形式。カウントダウンに使用。
- `useNow(intervalMs)` — 一定間隔で現在時刻を更新し再描画を促すフック（[src/hooks/useNow.ts](src/hooks/useNow.ts)）。

---

## 10. 設計上の注意点・制約（AI へ指示するときの前提）

- **脱落フラグを DB に書かない。** 状態は必ず `evaluate()` 経由で導出する。新機能でも「時刻を保存 → クライアントで導出」の方針を崩さないこと。
- **同時開催セッションは 1 グループ 1 つ**という前提でグループページのチャットが成り立っている。
- 認証は匿名中心。**サーバサイドのアクセス制御（Firestore セキュリティルール）はリポジトリに含まれていない。** 「参加者だけが履歴を見られる」等はクライアント側の表示制御にとどまる点に注意。
- Firebase の設定値（apiKey 等）は [src/firebase.ts](src/firebase.ts) にハードコードされている。
- ルーティングは自作の最小実装。ネストや動的パラメータの追加時は `parsePath()` を直接編集する。
- 時刻はすべてエポックミリ秒。`datetime-local` 入力はローカルタイムで変換している（[src/pages/AdminPage.tsx](src/pages/AdminPage.tsx) `toLocalInput`）。

---

## 11. ディレクトリ構成

```
src/
├─ main.tsx              エントリポイント
├─ App.tsx              ルートによる画面切り替え
├─ firebase.ts          Firebase 初期化
├─ types.ts             Firestore ドキュメントの型
├─ index.css            全スタイル
├─ lib/
│  ├─ router.ts         自作ルーター
│  └─ survival.ts       サバイバル判定・時刻フォーマット（中核ロジック）
├─ hooks/
│  ├─ useAuth.ts        匿名／管理者ログイン
│  ├─ useGroup.ts       グループ・セッション一覧・メンバー購読／管理操作
│  ├─ useSession.ts     セッション本体・参加者・メッセージ購読／参加・発言
│  └─ useNow.ts         現在時刻フック
├─ pages/
│  ├─ HomePage.tsx
│  ├─ GroupPage.tsx     チャット会場を兼ねるメイン画面
│  ├─ SessionPage.tsx   開始前カウントダウン／終了後ログ
│  └─ AdminPage.tsx     管理コンソール
└─ components/
   ├─ LiveSession.tsx     開催中チャット（GroupPage に埋め込み・メンバーは自動参加）
   ├─ ChatRoom.tsx        メッセージ表示・入力・沈黙タイマー
   ├─ GroupJoinForm.tsx   グループ参加フォーム（名前登録の入口）
   ├─ ParticipantList.tsx 参加者の生存状況一覧
   ├─ MemberList.tsx      メンバーとひとこと
   └─ SessionResult.tsx   終了後の結果表示
```
