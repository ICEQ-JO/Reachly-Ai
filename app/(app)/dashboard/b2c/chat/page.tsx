import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { products, chatMessages } from "@/lib/db/schema";
import { eq, and, desc, asc } from "drizzle-orm";
import { AiChat } from "@/components/chat/AiChat";

export default async function B2cChatPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const product = await db.query.products.findFirst({
    where: and(eq(products.ownerId, session.user.id), eq(products.onboardingDone, true)),
    columns: { id: true, name: true },
    orderBy: (p) => [desc(p.createdAt)],
  });
  if (!product) redirect("/onboarding");

  const history = await db.select({
    id: chatMessages.id,
    role: chatMessages.role,
    content: chatMessages.content,
    metadata: chatMessages.metadata,
    createdAt: chatMessages.createdAt,
  }).from(chatMessages)
    .where(eq(chatMessages.productId, product.id))
    .orderBy(asc(chatMessages.createdAt))
    .limit(50);

  const messages = history.map((m) => ({
    id: m.id,
    role: m.role as "user" | "assistant",
    text: m.content,
    cards: (m.metadata as any)?.cards ?? undefined,
  }));

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <AiChat initialMessages={messages} productName={product.name} />
    </div>
  );
}
