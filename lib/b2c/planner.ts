import type { CampaignBrief, DistributionPlan, DistributionSlot, B2cPlatform } from "./types";

// Calendar grid tables — kept in sync with ScheduleCalendar.tsx so planned slots
// line up exactly with the visual schedule.
export const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
export const TIMES = ["8am", "10am", "12pm", "2pm", "4pm", "6pm", "8pm"] as const;

const DAY_INDEX: Record<string, number> = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 0 };
const TIME_HOUR: Record<string, number> = { "8am": 8, "10am": 10, "12pm": 12, "2pm": 14, "4pm": 16, "6pm": 18, "8pm": 20 };

const INTENSITY_PER_WEEK: Record<string, number> = { light: 3, steady: 5, aggressive: 7 };

/**
 * Resolve a calendar slot (weekday + time) to an absolute Date.
 * `weekOffset` shifts forward by whole weeks. The result is always the next
 * occurrence of that weekday/time at-or-after `from`, plus the offset.
 */
export function slotToDate(day: string, time: string, weekOffset = 0, from: Date = new Date()): Date {
  const targetDow = DAY_INDEX[day] ?? 1;
  const hour = TIME_HOUR[time] ?? 12;
  const d = new Date(from);
  d.setHours(hour, 0, 0, 0);
  let diff = (targetDow - d.getDay() + 7) % 7;
  if (diff === 0 && d.getTime() <= from.getTime()) diff = 7; // already passed today → next week
  d.setDate(d.getDate() + diff + weekOffset * 7);
  return d;
}

/**
 * Deterministic distribution planner — decides *where & when* before any content
 * is written. Round-robins the chosen platforms across the week's posting slots.
 *
 * Demo-friendly cadence: the first two slots are back-dated a few minutes so that,
 * once approved, they auto-publish on the very next page read (tick-on-read).
 */
export function planDistribution(brief: CampaignBrief): DistributionPlan {
  const platforms = (brief.platforms.length ? brief.platforms : ["instagram"]) as B2cPlatform[];
  const perPlatform = Math.max(1, brief.postCount || 3);
  const total = platforms.length * perPlatform;
  const postsPerWeek = INTENSITY_PER_WEEK[brief.intensity] ?? 5;

  const now = new Date();
  const slots: DistributionSlot[] = [];

  for (let i = 0; i < total; i++) {
    const platform = platforms[i % platforms.length];
    // Spread across the week, wrapping into following weeks as volume grows.
    const within = i % postsPerWeek;
    const weekOffset = Math.floor(i / postsPerWeek);
    const day = DAYS[(within * 2) % DAYS.length];          // spaced-out weekdays
    const time = TIMES[(within + Math.floor(i / DAYS.length)) % TIMES.length];

    let scheduledAt = slotToDate(day, time, weekOffset, now);
    // First two posts are immediately due so the demo shows auto-publish after approval.
    if (i < 2) scheduledAt = new Date(now.getTime() - (i + 1) * 60_000);

    slots.push({ platform, scheduledAt, scheduledDay: day, scheduledTime: time });
  }

  return {
    slots,
    postsPerWeek,
    cadence: `${postsPerWeek} posts/week across ${platforms.length} channel${platforms.length > 1 ? "s" : ""}`,
  };
}
