interface Env {
  KV: KVNamespace;
  ANTHROPIC_API_KEY: string;
  DISCORD_WEBHOOK_URL: string;
}

interface GitHubRelease {
  tag_name: string;
  name: string;
  body: string;
  html_url: string;
  published_at: string;
}

interface ClaudeResponse {
  content: Array<{ type: string; text: string }>;
}

async function getLatestRelease(): Promise<GitHubRelease> {
  const res = await fetch(
    "https://api.github.com/repos/anthropics/claude-code/releases/latest",
    {
      headers: { "User-Agent": "claude-code-watcher" },
    }
  );
  if (!res.ok) throw new Error(`GitHub API error: ${res.status}`);
  return res.json();
}

async function summarize(release: GitHubRelease, apiKey: string): Promise<string> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "content-type": "application/json",
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: `Claude Code ${release.tag_name} のリリースノートを日本語で要約してください。

ルール:
- 主な変更点を箇条書き（5個以内）
- 注目ポイントを1-2文で
- 簡潔に、開発者目線で

リリースノート:
${release.body}`,
        },
      ],
    }),
  });
  if (!res.ok) throw new Error(`Claude API error: ${res.status}`);
  const data: ClaudeResponse = await res.json();
  return data.content[0].text;
}

async function sendTextNotification(
  webhookUrl: string,
  release: GitHubRelease,
  summary: string
): Promise<void> {
  await fetch(webhookUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      content: [
        `🚀 **Claude Code ${release.tag_name}** がリリースされました`,
        "",
        summary,
        "",
        `🔗 ${release.html_url}`,
      ].join("\n"),
    }),
  });
}

async function sendEmbedNotification(
  webhookUrl: string,
  release: GitHubRelease,
  summary: string
): Promise<void> {
  await fetch(webhookUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      embeds: [
        {
          title: `🚀 Claude Code ${release.tag_name}`,
          description: summary,
          url: release.html_url,
          color: 0xd97706, // amber
          footer: {
            text: "claude-code-watcher",
          },
          timestamp: release.published_at,
        },
      ],
    }),
  });
}

export default {
  async scheduled(_event: ScheduledEvent, env: Env, _ctx: ExecutionContext): Promise<void> {
    const release = await getLatestRelease();

    // 前回と同じリリースならスキップ
    const lastSeen = await env.KV.get("last_release_tag");
    if (release.tag_name === lastSeen) return;

    // Claude API で要約
    const summary = await summarize(release, env.ANTHROPIC_API_KEY);

    // テキスト版を送信
    await sendTextNotification(env.DISCORD_WEBHOOK_URL, release, summary);

    // 最新タグを KV に保存
    await env.KV.put("last_release_tag", release.tag_name);
  },
};
