import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { products, drafts } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { ScheduleCalendar } from "./ScheduleCalendar";

export default async function SchedulePage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const product = await db.query.products.findFirst({
    where: and(eq(products.ownerId, session.user.id), eq(products.onboardingDone, true)),
    columns: { id: true },
    orderBy: (p) => [desc(p.createdAt)],
  });
  if (!product) redirect("/onboarding");

  const allDrafts = await db.select({
    id: drafts.id,
    body: drafts.body,
    platform: drafts.platform,
    channel: drafts.channel,
    status: drafts.status,
    scheduledDay: drafts.scheduledDay,
    scheduledTime: drafts.scheduledTime,
  }).from(drafts)
    .where(eq(drafts.productId, product.id))
    .orderBy(desc(drafts.createdAt));

  const socialDrafts = allDrafts.filter((d) =>
    ["instagram", "facebook", "reddit"].includes(d.platform ?? d.channel)
  );

  return <ScheduleCalendar drafts={socialDrafts} />;
}
