# Provider Subscription Tokens for Flue

## 結論

GLM と Kimi はどちらも API key で Flue から呼べる余地があります。ただし、「サブスク枠をそのまま Flue の agent 実行に使う」という意味では扱いが違います。

- GLM / Z.AI: Coding Plan の API key は存在するが、公式 docs では利用先が supported tools / products に制限される。Flue は現時点で公式 supported tools に含まれていないため、初期版では採用しない。
- Kimi / Moonshot: API key は作成でき、OpenAI SDK 互換の endpoint がある。ただし API 課金は recharge / usage billing で、Kimi app subscription とは別物として扱う。

初期実装では、Flue には次の 2 経路だけを正式サポートする。

1. Kimi API key via OpenAI-compatible custom provider
2. Z.AI general API key via OpenAI-compatible custom provider

GLM Coding Plan subscription key は、Z.AI が Flue または汎用 SDK 利用を公式に許可するまで production では使わない。

## 調査メモ

### Kimi

Kimi API Platform は API key を発行できる。quickstart では OpenAI SDK を使い、`base_url` に次を指定している。

```text
https://api.moonshot.ai/v1
```

model 例:

```text
kimi-k2.6
kimi-k2.7-code
```

pricing docs では Chat Completion API は input / output token の usage billing と説明されている。rate limit は account の cumulative recharge amount に基づく。したがって、Kimi app の月額 subscription ではなく、API platform の recharge / 従量課金として設計する。

### GLM / Z.AI

Z.AI general API は API key を作成でき、OpenAI SDK compatibility を提供している。general endpoint は次。

```text
https://api.z.ai/api/paas/v4
```

model 例:

```text
glm-5.2
glm-4.7
```

GLM Coding Plan は月額 subscription で、専用 endpoint がある。

```text
https://api.z.ai/api/coding/paas/v4
```

ただし公式 docs は、Coding Plan を supported tools / products に限定しており、SDK-based access や unsupported third-party integrations では subscription benefits が制限され得ると明記している。Flue を直接つなぐ用途はこの制限に抵触する可能性が高い。

## Flue 側の設計

Flue は `registerProvider(...)` で OpenAI-compatible provider を追加する。

環境変数:

```env
KIMI_API_KEY="..."
ZAI_API_KEY="..."
FLUE_MODEL="kimi/kimi-k2.7-code"
```

provider registration 案:

```ts
registerProvider('kimi', {
  api: 'openai-completions',
  baseUrl: 'https://api.moonshot.ai/v1',
  apiKey: process.env.KIMI_API_KEY,
});

registerProvider('zai', {
  api: 'openai-completions',
  baseUrl: 'https://api.z.ai/api/paas/v4',
  apiKey: process.env.ZAI_API_KEY,
});
```

agent model 指定:

```ts
model: 'kimi/kimi-k2.7-code'
model: 'zai/glm-5.2'
```

## 採用方針

初期候補:

- implementation agent: `kimi/kimi-k2.7-code`
- triage / lightweight review: `zai/glm-4.7` or existing OpenRouter free model
- fallback: existing `openrouter/nvidia/nemotron-3-ultra-550b-a55b:free`

運用ルール:

- provider API key は Cloudflare secret に保存する。
- repository に key を commit しない。
- Coding Plan key は Flue から使わない。
- 使う provider と model は env var で切り替える。
- 429 / quota exceeded 時は fallback model に切り替えられるようにする。

## 未決事項

- Kimi API Platform の支払い方法が現在のアカウントで利用できるか。
- Z.AI general API の支払い方法が現在のアカウントで利用できるか。
- Z.AI に Flue のような custom agent runtime が Coding Plan supported tools に含まれるか問い合わせるか。
- Kimi K2.7 Code と GLM-5.2 の実測品質を PR review / issue implementation で比較するか。

## 参照

- Kimi API docs: https://platform.kimi.ai/docs/overview
- Kimi quickstart: https://platform.kimi.ai/docs/guide/start-using-kimi-api
- Kimi pricing / recharge: https://platform.kimi.ai/docs/pricing/limits
- Z.AI quickstart: https://docs.z.ai/guides/overview/quick-start
- Z.AI pricing: https://docs.z.ai/guides/overview/pricing
- Z.AI GLM Coding Plan: https://docs.z.ai/devpack/overview
- Z.AI Coding Plan usage policy: https://docs.z.ai/devpack/usage-policy
