import { db } from "@/lib/db";
import { drafts } from "@/lib/db/schema";
import { and, eq, lte, isNull, isNotNull } from "drizzle-orm";

const RANGES: Record<string, { likes: [number, number]; comments: [number, number]; shares: [number, number]; reach: [number, number] }> = {
  instagram: { likes: [180, 2600], comments: [12, 150], shares: [8, 90], reach: [3000, 42000] },
  facebook:  { likes: [60, 720],   comments: [8, 110],  shares: [10, 130], reach: [1800, 22000] },
  reddit:    { likes: [40, 480],   comments: [15, 240], shares: [0, 0],    reach: [0, 0] },
};

function rand([min, max]: [number, number]) {
  return Math.floor(min + Math.random() * (max - min));
}

/** Realistic mock engagement for a freshly "published" post. */
export function mockEngagement(platform: string) {
  const r = RANGES[platform] ?? RANGES.instagram;
  return { likes: rand(r.likes), comments: rand(r.comments), shares: rand(r.shares), reach: rand(r.reach) };
}

/**
 * Tick-on-read auto-publisher. Any scheduled post whose time has arrived is flipped
 * to "posted" with engagement — so simply visiting a B2C page advances the timeline.
 * Best-effort: never throws into the page render.
 */
export async function publishDueDrafts(productId: string): Promise<number> {
  try {
    const due = await db.select({ id: drafts.id, platform: drafts.platform, channel: drafts.channel })
      .from(drafts)
      .where(and(
        eq(drafts.productId, productId),
        eq(drafts.status, "scheduled"),
        isNotNull(drafts.scheduledAt),
        lte(drafts.scheduledAt, new Date()),
        isNull(drafts.postedAt),
      ));

    const now = new Date();
    await Promise.all(due.map((d) =>
      db.update(drafts)
        .set({ status: "posted", postedAt: now, engagements: mockEngagement(d.platform ?? d.channel), updatedAt: now })
        .where(eq(drafts.id, d.id))
    ));
    return due.length;
  } catch {
    return 0;
  }
}
