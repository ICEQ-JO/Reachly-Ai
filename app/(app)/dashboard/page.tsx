import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { products } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";

export const revalidate = 0;

export default async function DashboardPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const product = await db.query.products.findFirst({
    where: and(eq(products.ownerId, session.user.id), eq(products.onboardingDone, true)),
    columns: { audience: true },
    orderBy: (p) => [desc(p.createdAt)],
  });

  if (!product) redirect("/onboarding");

  redirect(product.audience === "b2b" ? "/dashboard/b2b" : "/dashboard/b2c");
}
