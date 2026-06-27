import { TrendingUp, TrendingDown } from "lucide-react";

export interface ChartSeries {
  label: string;
  color: string;
  values: number[];
  /** Draw a gradient area under the line (the primary metric). */
  area?: boolean;
}

interface Props {
  title: string;
  xLabels: string[];
  series: ChartSeries[];
  /** Big headline number shown top-right (e.g. total / latest). */
  total?: string;
  totalLabel?: string;
  /** Week-over-week (or period) change, as a percentage. */
  trend?: number;
}

const W = 640;
const H = 170;
const PAD = { top: 16, right: 16, bottom: 26, left: 16 };

// Smooth a polyline into a path using quadratic midpoints — gives a clean curve
// without a charting dependency.
function smoothPath(pts: { x: number; y: number }[]): string {
  if (pts.length === 0) return "";
  if (pts.length === 1) return `M ${pts[0].x} ${pts[0].y}`;
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const midX = (pts[i].x + pts[i + 1].x) / 2;
    const midY = (pts[i].y + pts[i + 1].y) / 2;
    d += ` Q ${pts[i].x} ${pts[i].y} ${midX} ${midY}`;
  }
  const last = pts[pts.length - 1];
  d += ` T ${last.x} ${last.y}`;
  return d;
}

export function TrendChart({ title, xLabels, series, total, totalLabel, trend }: Props) {
  const n = xLabels.length;
  const allVals = series.flatMap((s) => s.values);
  const max = Math.max(1, ...allVals);
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;
  const x = (i: number) => PAD.left + (n <= 1 ? plotW / 2 : (i / (n - 1)) * plotW);
  const y = (v: number) => PAD.top + plotH - (v / max) * plotH;
  const gradId = `tg-${title.replace(/\W/g, "")}`;

  return (
    <div className="card" style={{ padding: "18px 20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
        <div>
          <h3 style={{ fontSize: "11px", fontWeight: "700", color: "var(--fg-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{title}</h3>
          <div style={{ display: "flex", gap: "14px", marginTop: "8px" }}>
            {series.map((s) => (
              <div key={s.label} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ width: "9px", height: "9px", borderRadius: "3px", background: s.color, display: "inline-block" }} />
                <span style={{ fontSize: "11px", color: "var(--fg-muted)", fontWeight: "500" }}>{s.label}</span>
              </div>
            ))}
          </div>
        </div>
        {total !== undefined && (
          <div style={{ textAlign: "right" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", justifyContent: "flex-end" }}>
              <span style={{ fontSize: "22px", fontWeight: "750", letterSpacing: "-0.02em", color: "var(--fg)" }}>{total}</span>
              {trend !== undefined && trend !== 0 && (
                <span style={{ display: "flex", alignItems: "center", gap: "2px", fontSize: "11px", fontWeight: "700", color: trend > 0 ? "var(--green)" : "var(--red)" }}>
                  {trend > 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                  {Math.abs(trend)}%
                </span>
              )}
            </div>
            {totalLabel && <div style={{ fontSize: "10px", color: "var(--fg-faint)", marginTop: "2px" }}>{totalLabel}</div>}
          </div>
        )}
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: "block", overflow: "visible" }} preserveAspectRatio="none">
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={series[0]?.color ?? "var(--accent)"} stopOpacity="0.28" />
            <stop offset="100%" stopColor={series[0]?.color ?? "var(--accent)"} stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* horizontal gridlines */}
        {[0, 0.5, 1].map((t) => (
          <line key={t} x1={PAD.left} x2={W - PAD.right} y1={PAD.top + plotH * t} y2={PAD.top + plotH * t}
            stroke="var(--border)" strokeWidth="1" strokeDasharray={t === 1 ? "0" : "3 4"} opacity={t === 1 ? 0.8 : 0.5} />
        ))}

        {series.map((s, si) => {
          const pts = s.values.map((v, i) => ({ x: x(i), y: y(v) }));
          const line = smoothPath(pts);
          return (
            <g key={s.label}>
              {s.area && (
                <path d={`${line} L ${x(n - 1)} ${PAD.top + plotH} L ${x(0)} ${PAD.top + plotH} Z`} fill={`url(#${gradId})`} />
              )}
              <path d={line} fill="none" stroke={s.color} strokeWidth={s.area ? 2.5 : 2} strokeLinecap="round"
                strokeDasharray={si > 0 ? "5 4" : "0"} />
              {pts.map((p, i) => (
                <circle key={i} cx={p.x} cy={p.y} r={s.area ? 3 : 2.5} fill="var(--bg)" stroke={s.color} strokeWidth="2" />
              ))}
            </g>
          );
        })}

        {/* x-axis labels */}
        {xLabels.map((lbl, i) => (
          <text key={i} x={x(i)} y={H - 8} textAnchor="middle" fontSize="10" fill="var(--fg-faint)">{lbl}</text>
        ))}
      </svg>
    </div>
  );
}
