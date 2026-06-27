import { ApifyClient } from "apify-client";

const client = new ApifyClient({ token: process.env.APIFY_TOKEN });

export interface Lead {
  name: string | null;
  title: string | null;
  company: string | null;
  email: string | null;
  linkedinUrl: string | null;
  raw: Record<string, unknown>;
}

export async function runLeadSearch(opts: {
  titles: string[];
  industry?: string | null;
  companySizes?: string[] | null;
  keywords?: string[] | null;
  limit?: number;
}): Promise<Lead[]> {
  const actor = process.env.APIFY_LEAD_ACTOR ?? "khadinakbar/universal-lead-finder";

  // Build a human-readable search query from the targeting info
  const queryParts: string[] = [];
  if (opts.titles.length > 0) queryParts.push(opts.titles[0]);
  if (opts.industry) queryParts.push(opts.industry);
  if (opts.keywords && opts.keywords.length > 0) queryParts.push(opts.keywords[0]);
  queryParts.push("SaaS software");

  const searchQuery = queryParts.join(" ");

  const run = await client.actor(actor).call({
    searchQuery,
    maxResults: opts.limit ?? 20,
    crawlWebsites: true,
    includeSubpages: false,
  });

  const { items } = await client.dataset(run.defaultDatasetId).listItems();

  return items
    .filter((item: Record<string, unknown>) => item.email || item.emails)
    .map((item: Record<string, unknown>) => {
      const emails = (item.emails as string[]) ?? [];
      return {
        name:        (item.contactName as string) ?? (item.name as string) ?? null,
        title:       (item.jobTitle as string) ?? (item.title as string) ?? null,
        company:     (item.companyName as string) ?? (item.company as string) ?? (item.domain as string) ?? null,
        email:       (item.email as string) ?? emails[0] ?? null,
        linkedinUrl: (item.linkedinUrl as string) ?? (item.linkedin as string) ?? null,
        raw:         item,
      };
    });
}
