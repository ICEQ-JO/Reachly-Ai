// Contracts for the B2C content pipeline:
// Onboarding → CampaignBrief → DistributionPlan (where & when) → ContentPlan + ContentPiece[] (what & why)

export type B2cPlatform = "instagram" | "facebook" | "reddit";

export interface CampaignBrief {
  productName: string;
  description: string;
  niche: string;
  offering: string;
  tone: string;
  targetCustomer: string;
  keywords: string[];
  platforms: B2cPlatform[];
  postCount: number;        // posts per platform requested
  intensity: string;        // "light" | "steady" | "aggressive"
  mediaType: string;
  /** Per-platform extra strategy notes from the campaign form. */
  strategies: Record<string, Record<string, string>>;
}

export interface DistributionSlot {
  platform: B2cPlatform;
  scheduledAt: Date;        // absolute publish time
  scheduledDay: string;     // "Mon".."Sun" (calendar grid)
  scheduledTime: string;    // "8am".."8pm" (calendar grid)
}

export interface DistributionPlan {
  slots: DistributionSlot[];
  postsPerWeek: number;
  cadence: string;          // human description, e.g. "5 posts/week across 3 channels"
}

export interface ContentPiece {
  platform: B2cPlatform;
  body: string;
  subject?: string;         // reddit title (others omit)
  hashtags?: string;
  rationale: string;        // the "why" — why this post, for this channel, now
  imageQuery: string;       // search phrase for a relevant photo
}

export interface ContentPlan {
  theme: string;
  summary: string;
  pieces: ContentPiece[];
}
