# claude-code-watcher

Claude Code のリリースを監視して、Discord に AI 要約付きで通知する。

## 仕組み

```
Cloudflare Workers (毎分)
  → GitHub Releases API で最新リリースをチェック
  → 新リリース検知
  → Claude API で日本語要約を生成
  → Discord Webhook で通知
```

## 技術スタック

- **Cloudflare Workers** — cron trigger で毎分実行
- **Cloudflare KV** — 前回チェックしたリリースタグを記憶
- **Claude API (Sonnet)** — リリースノートの要約
- **Discord Webhook** — 通知送信

## セットアップ

### 1. インストール

```bash
pnpm install
```

### 2. KV namespace 作成

```bash
npx wrangler kv namespace create KV
```

出力された `id` を `wrangler.toml` に記入。

### 3. Secrets 設定

```bash
npx wrangler secret put ANTHROPIC_API_KEY
npx wrangler secret put DISCORD_WEBHOOK_URL
```

### 4. デプロイ

```bash
pnpm deploy
```

## 環境変数

| 変数 | 用途 |
|---|---|
| `ANTHROPIC_API_KEY` | Claude API キー |
| `DISCORD_WEBHOOK_URL` | Discord Webhook URL |

## ライセンス

MIT
