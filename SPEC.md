# リミットチャット 仕様書

AI に開発指示を出すときに、このアプリの仕様を共有するためのドキュメント。
コードから読み取れる現状の仕様を記述する。

---

## 1. 概要

「リミットチャット」は、グループごとの**常時つかえるチャット**を主役に、そこへ**脱落ゲーム**を随時かぶせられるサービス。

- グループページには**いつでも書き込める常時チャット**がある。メンバー登録（名前）した人が発言できる。
- 常時チャットは**午前4時**で日付が切り替わり、その日ぶんは**日別の過去ログ**として読み返せる（過去のセッションと同じ扱い）。
- メンバー一覧には**いまサイトを開いているか（オンライン）**の印が出る。
- **脱落ゲーム**（従来の中核）は、開催されると常時チャットの**上**に別枠で出てくる。ゲームは常時チャットとは**完全に別のメッセージストリーム**。
  - 脱落ゲーム内では **他人と60秒以内に発言を交わす（会話が成立する）と沈黙タイマーが動きだす。** 制限時間内に次の発言をしないと「脱落」。一方的に発言しただけではタイマーは動かない。
  - 終了時刻まで脱落しなかった人が「生き残り」。
- 開催されていない間も、メンバーは常時チャットと「ひとこと」プロフィールで緩くつながれる。

### 主な特徴
- **脱落状態を DB に保存しない。** 参加者の `lastMessageAt`（最終発言時刻）だけを保存し、脱落／生存はクライアント側で時刻から**導出**する（[src/lib/survival.ts](src/lib/survival.ts)）。過去セッションを後から見ても同じロジックで正しい結果が出る。
- **オンライン／日付の区切りも「時刻を保存 → クライアントで導出」で統一。** 在席は `lastSeenAt` の打刻から、常時チャットの「日」は `createdAt` から午前4時区切りの `dayKey` を導出する（[src/lib/day.ts](src/lib/day.ts)）。
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
| `/:groupId` | グループページ（常時チャット会場） | `group` |
| `/:groupId/s/:sessionId` | セッション詳細（開始前カウントダウン／終了後ログ） | `session` |
| `/:groupId/log/:dayKey` | 常時チャットの日別過去ログ（読み取り専用） | `log` |
| その他 | Not Found | `notFound` |

- `dayKey` は `YYYY-MM-DD`（午前4時区切りのローカル日付）。
- **予約スラッグ**（グループ URL に使えない）: `admin`, `s`, `log`, `api`, `assets`, `static`。
- リンクは `linkProps()` を使い、`pushState` で SPA 遷移する（Cmd/Ctrl+クリック等は通常遷移）。

---

## 5. データモデル（Firestore）

コレクション構造:

```
groups/{groupId}
  ├─ sessions/{sessionId}       … 脱落ゲームの開催回
  │    ├─ participants/{uid}
  │    └─ messages/{messageId}  … ゲーム専用のメッセージストリーム
  ├─ members/{uid}             … グループのメンバー登録＋ひとこと
  ├─ chat/{messageId}          … 常時チャットの発言（dayKey 付き）
  ├─ chatDays/{dayKey}         … 発言のあった日の索引（過去ログ一覧用）
  └─ presence/{uid}            … 在席（いま開いているか）
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

### ChatMessage（`groups/{groupId}/chat/{messageId}`）
常時チャットの1発言。脱落ゲームの `messages` とは**別コレクション**。

| フィールド | 型 | 説明 |
|---|---|---|
| `id` | string | ドキュメント ID |
| `userId` | string | 発言者 uid |
| `userName` | string | 発言時の表示名 |
| `text` | string | 本文（最大 500 文字） |
| `createdAt` | number | 発言時刻 |
| `dayKey` | string | `createdAt` から導出した論理日（午前4時区切り, `YYYY-MM-DD`）。日別ログの索引 |

### ChatDay（`groups/{groupId}/chatDays/{dayKey}`）
発言のあった日の索引。過去ログ一覧を出すために発言のたびに更新する軽い集計。ドキュメント ID = `dayKey`。

| フィールド | 型 | 説明 |
|---|---|---|
| `lastMessageAt` | number | その日の最終発言時刻 |
| `messageCount` | number | 発言数（`increment` で加算） |

### Presence（`groups/{groupId}/presence/{uid}`）
在席記録。ドキュメント ID = uid。

| フィールド | 型 | 説明 |
|---|---|---|
| `lastSeenAt` | number | 最後に「見ています」を打刻した時刻 |

> オンライン判定は `lastSeenAt` から**クライアント側で導出**する（`now - lastSeenAt <= 45秒` ならオンライン, [src/hooks/usePresence.ts](src/hooks/usePresence.ts)）。タブが見えている間だけ約20秒ごとにハートビートを打つ。メンバー登録済みのときだけ打刻する。
> **離脱してもドキュメントは消さない。** TTL を過ぎればオフライン表示になり、残った `lastSeenAt` を使ってメンバー一覧に「最終オンライン ○分前／日時」を（ひとことの時刻と同じ相対＋絶対の形で）表示する。

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
| `grace` | 会話未成立（**脱落しない**） | `live` かつ未発言、または発言済みでも会話が成立していない |
| `alive` | 会話成立・沈黙タイマー進行中 | 沈黙期限が未到来 |
| `eliminated` | 沈黙しすぎて脱落 | 沈黙期限 `<= now` |
| `survived` | 終了時刻まで脱落しなかった | `ended` で脱落条件に該当せず（発言したが会話未成立のまま終了した場合も含む） |
| `silent` | 一度も発言せず終了 | `ended` かつ未発言 |

### タイマー開始条件：会話の成立 `computeTimerStarts(messages)`
- **一方的に発言しただけではタイマーは動かない。** 自分の発言と他人の発言が **60秒以内**（`REPLY_WINDOW_MS`）に交わされた＝**会話が成立した**時点で、その両者のタイマーが動き出す。
- 3人目以降も同じ規則：他人の発言に60秒以内に発言する、または自分の発言に誰かが60秒以内に発言すると開始。
- 例：他の全員が脱落した後に発言しても、誰も60秒以内に反応しなければタイマーは始まらず脱落しない。
- 開始時刻は会話が成立した（返信された）メッセージの時刻。全メッセージ履歴からクライアント側で導出する。

### 脱落判定の核心
- 沈黙期限 `deadline = max(lastMessageAt, 会話成立時刻) + silenceLimitMs`。
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
**常時チャットの会場**であるメイン画面。上から順に:

- **脱落ゲーム（開催中のみ）**: 開催中セッションがあれば `LiveSession` を最上部に埋め込む。常時チャットとは別枠・別ストリーム。同時開催は **1 つだけ**（時間重複は管理側で禁止）。
- **常時チャット（`DailyChat`）**: いつでも書ける。メンバー登録した人が発言できる。午前4時で日付が切り替わり、その日ぶんは過去ログになる（[src/hooks/useChat.ts](src/hooks/useChat.ts)）。
- 未参加ならグループ参加フォーム（`GroupJoinForm`）をチャットの前に出す（発言には名前登録が必要）。
- **メンバー一覧（`MemberList`）**: 自分の行では**表示名**と**ひとこと**を編集できる。各行に**オンライン**（いまサイトを開いているか）の緑ドットを出し、見出しにオンライン人数を表示する。オフラインのメンバーには**「最終オンライン ○分前／日時」**を表示する。
- 開催予定があれば次回開始までのカウントダウン。
- **過去のチャット**（日別ログ一覧）/ 過去のセッション一覧。
- **過去のチャット／セッション履歴は、一度でも参加したメンバー（または管理者）だけが見られる。**
- キャンセルされたセッションは参加者側には表示しない。

### 日別ログページ（`/:groupId/log/:dayKey`）[src/pages/LogPage.tsx](src/pages/LogPage.tsx)
常時チャットの過去1日ぶんを読み取り専用で表示。過去ログは午前4時を過ぎれば増えないので購読ではなく一度だけ取得する。メンバー（または管理者）のみ閲覧可。

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
│  ├─ survival.ts       サバイバル判定・時刻フォーマット（脱落ゲームの中核ロジック）
│  └─ day.ts            常時チャットの午前4時区切り（dayKey）ユーティリティ
├─ hooks/
│  ├─ useAuth.ts        匿名／管理者ログイン
│  ├─ useGroup.ts       グループ・セッション一覧・メンバー購読／管理操作
│  ├─ useSession.ts     セッション本体・参加者・メッセージ購読／参加・発言
│  ├─ useChat.ts        常時チャット（今日ぶん購読・発言・日別ログ一覧・過去日の取得）
│  ├─ usePresence.ts    在席ハートビート＋オンライン導出
│  └─ useNow.ts         現在時刻フック
├─ pages/
│  ├─ HomePage.tsx
│  ├─ GroupPage.tsx     常時チャット会場を兼ねるメイン画面
│  ├─ SessionPage.tsx   開始前カウントダウン／終了後ログ
│  ├─ LogPage.tsx       常時チャットの日別過去ログ（読み取り専用）
│  └─ AdminPage.tsx     管理コンソール
└─ components/
   ├─ LiveSession.tsx     開催中の脱落ゲーム（GroupPage 最上部に埋め込み・メンバーは自動参加）
   ├─ ChatRoom.tsx        脱落ゲームのメッセージ表示・入力・沈黙タイマー
   ├─ DailyChat.tsx       常時チャット（今日ぶんの表示・入力）
   ├─ ChatLog.tsx         チャットメッセージ一覧（常時チャットと過去ログで共用）
   ├─ GroupJoinForm.tsx   グループ参加フォーム（名前登録の入口）
   ├─ ParticipantList.tsx 参加者の生存状況一覧
   ├─ MemberList.tsx      メンバーとひとこと＋オンライン印
   └─ SessionResult.tsx   終了後の結果表示
```

---

## デモモード（Firebase なし）

`npm run dev:demo` / `npm run build:demo` で、Firebase を使わずに動くデモ版になる。

- `vite.config.ts` が `--mode demo` のときだけ `firebase/app`・`firebase/auth`・`firebase/firestore` を `src/demo/` の代替実装に差し替える。アプリ本体のコードはそのまま。
- データは localStorage に保存し、タブ間は storage イベントで同期する。匿名ユーザーはタブごとに別人（sessionStorage）。管理者ログインは任意のメール/パスワードで通る。
- 初回（または3時間経過後）に「デモ部」（`/demo`）を初期データ付きで作る。開催中のサバイバルセッションではボット2人が会話・返事をし、1人は黙ったまま脱落する。
- 画面上部に案内バー（リセットボタン付き）を出す。
- Firestore 代替は、現在アプリが使う API（doc / collection / query / where('==') / orderBy / increment と読み書き・購読）だけを実装している。新しい API を使う場合は `src/demo/firestore.ts` にも追加すること。

サブパスに置く場合（例: `/p/chat0125/`）は `--base /p/chat0125/` でビルドする。`lib/router.ts` は `import.meta.env.BASE_URL` を接頭辞として扱う（通常ビルドでは `/` なので影響なし）。
