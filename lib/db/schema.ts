import {
  pgTable,
  text,
  boolean,
  integer,
  timestamp,
  jsonb,
} from "drizzle-orm/pg-core";

// ── Better Auth required tables ──────────────────────────────────────────────

export const users = pgTable("users", {
  id:            text("id").primaryKey(),
  name:          text("name").notNull(),
  email:         text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image:         text("image"),
  createdAt:     timestamp("created_at").notNull().defaultNow(),
  updatedAt:     timestamp("updated_at").notNull().$onUpdate(() => new Date()),
});

export const sessions = pgTable("sessions", {
  id:        text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token:     text("token").notNull().unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().$onUpdate(() => new Date()),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId:    text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
});

export const accounts = pgTable("accounts", {
  id:                    text("id").primaryKey(),
  accountId:             text("account_id").notNull(),
  providerId:            text("provider_id").notNull(),
  userId:                text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  accessToken:           text("access_token"),
  refreshToken:          text("refresh_token"),
  idToken:               text("id_token"),
  accessTokenExpiresAt:  timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope:                 text("scope"),
  password:              text("password"),
  createdAt:             timestamp("created_at").notNull().defaultNow(),
  updatedAt:             timestamp("updated_at").notNull().$onUpdate(() => new Date()),
});

export const verifications = pgTable("verifications", {
  id:         text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value:      text("value").notNull(),
  expiresAt:  timestamp("expires_at").notNull(),
  createdAt:  timestamp("created_at").notNull().defaultNow(),
  updatedAt:  timestamp("updated_at").notNull().$onUpdate(() => new Date()),
});

// ── App tables ────────────────────────────────────────────────────────────────

export const products = pgTable("products", {
  id:             text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  ownerId:        text("owner_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name:           text("name").notNull(),
  description:    text("description"),
  type:           text("type"),           // "paas" | "saas"
  audience:       text("audience"),       // "b2b" | "b2c"
  scope:          text("scope").array(),
  budgetMin:      integer("budget_min").default(0),
  budgetMax:      integer("budget_max").default(2000),
  channels:       text("channels").array(),
  companyStage:   text("company_stage"),
  // B2B targeting
  targetTitles:   text("target_titles").array(),
  targetIndustry: text("target_industry"),
  targetSizes:    text("target_sizes").array(),
  keywords:       text("keywords").array(),
  painPoint:      text("pain_point"),
  differentiator: text("differentiator"),
  // B2C campaign
  targetCustomer: text("target_customer"),
  niche:          text("niche"),
  offering:       text("offering"),
  tone:           text("tone"),
  appType:        text("app_type"),
  goals:          text("goals").array(),
  intensity:      text("intensity"),      // "light" | "steady" | "aggressive"
  // Meta
  classification: jsonb("classification"),
  onboardingDone: boolean("onboarding_done").notNull().default(false),
  createdAt:      timestamp("created_at").notNull().defaultNow(),
  updatedAt:      timestamp("updated_at").notNull().$onUpdate(() => new Date()),
});

// ── Campaigns ─────────────────────────────────────────────────────────────────

export const campaigns = pgTable("campaigns", {
  id:        text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  productId: text("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  name:      text("name").notNull(),
  // ["instagram","facebook","reddit"] or ["lead-gen","linkedin"]
  platforms: text("platforms").array(),
  // "b2c-content" | "b2b-leads" | "b2b-linkedin"
  type:      text("type").notNull(),
  // "active" | "paused" | "completed"
  status:    text("status").default("active"),
  // platform-specific strategy / settings (targets, tone, subreddits, etc.)
  settings:  jsonb("settings"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().$onUpdate(() => new Date()),
});

// ── Leads ─────────────────────────────────────────────────────────────────────

export const leads = pgTable("leads", {
  id:              text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  productId:       text("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  campaignId:      text("campaign_id").references(() => campaigns.id, { onDelete: "set null" }),
  name:            text("name"),
  title:           text("title"),
  company:         text("company"),
  email:           text("email"),
  linkedinUrl:     text("linkedin_url"),
  source:          text("source").default("apollo"),
  // "new" | "contacted" | "replied" | "bounced"
  status:          text("status").default("new"),
  raw:             jsonb("raw"),
  // KPIs: emailOpened, replied, meetings booked
  kpiData:         jsonb("kpi_data").$default(() => ({ emailOpened: false, replied: false, meetings: 0, emailsSent: 0 })),
  notes:           text("notes"),
  lastContactedAt: timestamp("last_contacted_at"),
  createdAt:       timestamp("created_at").notNull().defaultNow(),
});

// ── Drafts ────────────────────────────────────────────────────────────────────

export const drafts = pgTable("drafts", {
  id:           text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  productId:    text("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  campaignId:   text("campaign_id").references(() => campaigns.id, { onDelete: "set null" }),
  leadId:       text("lead_id").references(() => leads.id, { onDelete: "set null" }),
  // "cold-email" | "linkedin" | "instagram" | "reddit" | "facebook"
  channel:      text("channel").notNull(),
  // explicit platform (matches channel for social, separate for email)
  platform:     text("platform"),
  subject:      text("subject"),
  body:         text("body").notNull(),
  // "draft" | "approved" | "scheduled" | "sent" | "failed"
  status:       text("status").default("draft"),
  scheduledAt:  timestamp("scheduled_at"),
  // Calendar slot for horizontal schedule view
  scheduledDay: text("scheduled_day"),  // "Mon" | "Tue" | ... | "Sun"
  scheduledTime:text("scheduled_time"), // "9am" | "12pm" | "3pm" | "6pm" | "9pm"
  postedAt:     timestamp("posted_at"),
  // Mock engagement data
  engagements:  jsonb("engagements").$default(() => ({ likes: 0, comments: 0, shares: 0, reach: 0 })),
  // Future image generation
  imagePrompt:  text("image_prompt"),
  createdAt:    timestamp("created_at").notNull().defaultNow(),
  updatedAt:    timestamp("updated_at").notNull().$onUpdate(() => new Date()),
});

// ── Agent Runs ────────────────────────────────────────────────────────────────

export const agentRuns = pgTable("agent_runs", {
  id:         text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  productId:  text("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  campaignId: text("campaign_id").references(() => campaigns.id, { onDelete: "set null" }),
  channel:    text("channel").notNull(),
  type:       text("type").notNull(),
  // "queued" | "running" | "succeeded" | "failed"
  status:     text("status").default("queued"),
  output:     jsonb("output"),
  createdAt:  timestamp("created_at").notNull().defaultNow(),
});

// ── AI Chat Messages ──────────────────────────────────────────────────────────

export const chatMessages = pgTable("chat_messages", {
  id:        text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  productId: text("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  // "user" | "assistant"
  role:      text("role").notNull(),
  content:   text("content").notNull(),
  // { type: "text"|"campaign_summary"|"lead_card"|"post_preview"|"analytics"|"schedule" }
  metadata:  jsonb("metadata"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
