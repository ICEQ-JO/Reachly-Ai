# Reachly — System Architecture (Poster)

> AI-powered growth platform for B2B **and** B2C products: one onboarding → lead scraping,
> channel-native content generation, scheduling, and an AI strategist — on a serverless stack
> that scales out without a rewrite.

```mermaid
flowchart TB
  classDef user   fill:#fde68a,stroke:#f59e0b,color:#000,font-weight:bold;
  classDef edge   fill:#0f172a,stroke:#38bdf8,color:#e2e8f0;
  classDef core   fill:#1c1917,stroke:#f59e0b,color:#fafafa;
  classDef data   fill:#064e3b,stroke:#10b981,color:#ecfdf5;
  classDef ext    fill:#2e1065,stroke:#a855f7,color:#f5f3ff;
  classDef future fill:#0b0b0e,stroke:#52525b,color:#a1a1aa,stroke-dasharray:5 5;

  subgraph USERS["Users"]
    direction LR
    U1["🏢 B2B Founder"]:::user
    U2["👥 B2C Brand"]:::user
  end

  USERS --> EDGE

  subgraph EDGE["▲ Vercel Edge · Next.js 16 App Router"]
    direction LR
    CDN["Global CDN<br/>cached landing + assets"]:::edge
    RSC["React Server Components<br/>dashboards + charts"]:::edge
    API["Route Handlers<br/>/api/*"]:::edge
    AUTH["Better Auth<br/>session · ownership scoping"]:::edge
  end

  EDGE --> CORE

  subgraph CORE["Application Services"]
    direction TB
    ONB["Onboarding + AI Classify"]:::core
    CAMP["Campaign Engine<br/>B2B leads · B2B LinkedIn · B2C social"]:::core
    GEN["Content Generation<br/>parallel · channel-native"]:::core
    SCH["Scheduler / Calendar"]:::core
    CHAT["AI Strategist Chat<br/>context-aware cards"]:::core
    VAULT["Post + Lead Vault"]:::core
  end

  CAMP --> GEN

  subgraph DATA["Neon Serverless Postgres · Drizzle ORM"]
    direction LR
    D1[("products")]:::data
    D2[("campaigns")]:::data
    D3[("leads")]:::data
    D4[("drafts")]:::data
    D5[("agent_runs")]:::data
    D6[("chat_messages")]:::data
  end

  CORE --> DATA

  subgraph EXT["External Services"]
    direction LR
    LLM["OpenRouter LLM<br/>gpt-4o-mini"]:::ext
    APIFY["Apify Actor<br/>live lead scraping"]:::ext
  end

  GEN --> LLM
  ONB --> LLM
  CHAT --> LLM
  CAMP --> APIFY

  subgraph SCALE["Scale-out roadmap — drop-in, no rewrite"]
    direction LR
    Q["Job Queue + Workers<br/>async generation & scraping"]:::future
    IMG["AI Image Gen<br/>DALL·E / Stability"]:::future
    OBJ["Object storage + CDN<br/>generated media"]:::future
    CACHE["Redis cache<br/>sessions · hot reads"]:::future
    HOOK["Webhook ingestion<br/>real engagement & KPIs"]:::future
    REPL["Postgres read replicas"]:::future
  end

  CAMP -. queue long jobs .-> Q
  GEN  -. generate images .-> IMG
  IMG  -.-> OBJ
  API  -. cache hot reads .-> CACHE
  HOOK -. write metrics .-> D4
  DATA -. fan-out reads .-> REPL
```

**Why it scales (talk track):**
- **Stateless serverless** — Next.js handlers + Neon HTTP driver scale horizontally per-request; no servers to manage.
- **Ownership-scoped data** — every query is filtered by `products.ownerId`, so multi-tenancy is built in.
- **`agent_runs` table is the async seam** — today work runs inline; tomorrow the same records back a **job queue + workers** with zero schema change.
- **Provider-agnostic AI** — OpenRouter means swapping or load-balancing models is a config change.
- **Media path is ready** — `drafts.mediaUrl` / `imagePrompt` already exist, so real **image generation + object storage/CDN** drop in.
- **Real metrics later** — **webhook ingestion** populates `drafts.engagements` & `leads.kpiData`; **read replicas** + **Redis** absorb dashboard read load.
