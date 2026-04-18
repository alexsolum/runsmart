import React, { useMemo, useState, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import { useAppData } from "../context/AppDataContext";
import { useI18n } from "../i18n/translations.js";
import { buildCoachPayload } from "../lib/coachPayload.js";
import PageContainer from "../components/layout/PageContainer";
import {
  computeLongRuns,
  computeTrainingLoad,
  computeTrainingLoadState,
  computeWeeklyHRZones,
  computeRecentActivityZones,
  computeEnduranceEfficiency,
  generateCoachingInsights,
} from "../domain/compute";
import { Button } from "@/components/ui/button";
import {
  ComposedChart,
  BarChart,
  ScatterChart,
  Scatter,
  Cell,
  Area,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

// ── Constants ─────────────────────────────────────────────────────────────────

const DEFAULT_INSIGHT_REFRESH_INTERVAL_HOURS = 24;
const SYNTHESIS_CACHE_KEY_PREFIX = "runsmart-insights-synthesis";

const ZONE_KEYS = ["z1", "z2", "z3", "z4", "z5"];
const ZONE_LABELS = ["Z1 Recovery", "Z2 Aerobic", "Z3 Tempo", "Z4 Threshold", "Z5 VO\u2082max"];
const ZONE_COLORS = ["#94a3b8", "#22c55e", "#3b82f6", "#f59e0b", "#ef4444"];

const INSIGHT_ICON_MAP = {
  battery: "⚡",
  warning: "⚠",
  alert: "◈",
  fatigue: "◐",
  trending: "↗",
  decline: "↘",
  balance: "◎",
};

const READINESS_LABELS = {
  en: { fresh: "Fresh", neutral: "Neutral", fatigued: "Fatigued" },
  no: { fresh: "Frisk", neutral: "Nøytral", fatigued: "Sliten" },
};

const RISK_LABELS = {
  en: { high: "High", moderate: "Moderate", low: "Low" },
  no: { high: "Høy", moderate: "Moderat", low: "Lav" },
};

const LOAD_STATE_LABELS = {
  en: {
    good_form: "Good Form",
    neutral: "Neutral",
    accumulating_fatigue: "Accumulating Fatigue",
    overreaching_risk: "Overreaching Risk",
    Improving: "Improving",
    Stable: "Stable",
    Declining: "Declining",
  },
  no: {
    good_form: "God form",
    neutral: "Nøytral",
    accumulating_fatigue: "Opparbeidet tretthet",
    overreaching_risk: "Risiko for overbelastning",
    Improving: "Bedres",
    Stable: "Stabil",
    Declining: "Synker",
  },
};

const LOAD_STATE_OVERLAYS = {
  good_form: {
    Improving: {
      en: "You're in excellent form right now — a prime window for a quality session or long run.",
      no: "Du er i svært god form akkurat nå — et godt vindu for en kvalitetsøkt eller langtur.",
    },
    Stable: {
      en: "You're in good form. Training stress is well-controlled — a good time to hit your key sessions.",
      no: "Du er i god form. Treningsstresset er godt kontrollert, bra tidspunkt for nøkkeløktene dine.",
    },
    Declining: {
      en: "Form is still positive but trending down. Normal in a build week — monitor load and protect sleep.",
      no: "Formen er fortsatt positiv, men er på vei ned. Normalt i en byggeuke — følg med på belastning.",
    },
  },
  neutral: {
    Improving: {
      en: "Load and form are balancing out. Stay consistent — fitness is accumulating.",
      no: "Belastning og form er i ferd med å balansere seg. Hold deg jevn — formen bygger seg opp.",
    },
    Stable: {
      en: "Training load is balanced. Neutral form is normal mid-block — stick to the plan.",
      no: "Treningsbelastningen er i balanse. Nøytral form er normalt midt i en blokk.",
    },
    Declining: {
      en: "Form is sliding toward neutral. Consider whether fatigue is planned or unexpected.",
      no: "Formen glir mot nøytral sone. Vurder om trettheten er planlagt eller uventet.",
    },
  },
  accumulating_fatigue: {
    Improving: {
      en: "Fatigue is elevated but easing. A recovery day will accelerate the rebound.",
      no: "Trettheten er forhøyet, men er på vei ned. En restitusjonsdag vil gi raskere respons.",
    },
    Stable: {
      en: "Fatigue is accumulating. Expected in a hard block — keep quality low, volume easy.",
      no: "Trettheten bygger seg opp. Forventet i en hard blokk — hold intensiteten lav.",
    },
    Declining: {
      en: "Fatigue is building and not recovering. Prioritize sleep and consider a rest day.",
      no: "Trettheten øker uten å slippe taket. Prioriter søvn og vurder en hviledag.",
    },
  },
  overreaching_risk: {
    Improving: {
      en: "High fatigue, but rebounding. You're coming out of a hard block — protect recovery.",
      no: "Trettheten er høy, men du er på vei tilbake. Vern om restitusjonen.",
    },
    Stable: {
      en: "Training stress is very high. Overreaching risk is real — reduce load now.",
      no: "Treningsstresset er svært høyt. Risikoen for overbelastning er reell — reduser nå.",
    },
    Declining: {
      en: "Overreaching risk: TSB declining. Back off intensity immediately and prioritize recovery.",
      no: "Risiko for overbelastning: TSB synker. Slipp opp intensiteten med en gang.",
    },
  },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(value) {
  return new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function formatPaceText(speedKph) {
  if (!speedKph || speedKph <= 0) return "—";
  const totalSeconds = 3600 / speedKph;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.round(totalSeconds % 60);
  return `${minutes}:${String(seconds === 60 ? 0 : seconds).padStart(2, "0")} min/km`;
}

function getSynthesisCacheKey(userId, lang) {
  return `${SYNTHESIS_CACHE_KEY_PREFIX}-${userId}-${lang}`;
}

function readSynthesisCache(userId, lang) {
  if (!userId || typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(getSynthesisCacheKey(userId, lang));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed.text !== "string" || typeof parsed.fetchedAt !== "string") return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeSynthesisCache(userId, lang, text, fetchedAt) {
  if (!userId || typeof localStorage === "undefined") return;
  localStorage.setItem(getSynthesisCacheKey(userId, lang), JSON.stringify({ userId, lang, text, fetchedAt }));
}

function sanitizeSynthesisText(input) {
  if (typeof input !== "string") return { text: "", isTrusted: false };
  let text = input.trim();
  if (!text) return { text: "", isTrusted: false };
  text = text.replace(/^```(?:json|markdown|text)?\s*/i, "").replace(/\s*```$/, "").trim();
  if (!text) return { text: "", isTrusted: false };
  if (text.startsWith("{") || text.startsWith('"')) {
    try {
      const parsed = JSON.parse(text);
      if (typeof parsed === "string") return { text: sanitizeSynthesisText(parsed).text, isTrusted: true };
      if (typeof parsed?.synthesis === "string") return { text: sanitizeSynthesisText(parsed.synthesis).text, isTrusted: true };
    } catch { /* not JSON */ }
  }
  const jsonLikeMatch = text.match(/\{\s*["']synthesis["']\s*:\s*(["'])([\s\S]*?)\1\s*\}/i);
  if (jsonLikeMatch?.[2]) return { text: jsonLikeMatch[2].replace(/\\n/g, "\n").replace(/\\"/g, '"').trim(), isTrusted: true };
  const synthesisKeyMatch = text.match(/["']synthesis["']\s*:\s*(["'])([\s\S]*?)\1/i);
  if (synthesisKeyMatch?.[2]) return { text: synthesisKeyMatch[2].replace(/\\n/g, "\n").replace(/\\"/g, '"').trim(), isTrusted: true };
  return { text: text.trim(), isTrusted: false };
}

const SYNTHESIS_HEADING_SETS = {
  en: ["Mileage Trend", "Intensity Distribution", "Long-Run Progression", "Race Readiness"],
  no: ["Kilometerutvikling", "Intensitetsfordeling", "Langturprogresjon", "Løpsberedskap"],
};

function hasRequiredSynthesisHeadings(text, lang) {
  if (!text) return false;
  const sets = lang === "no"
    ? [SYNTHESIS_HEADING_SETS.no, SYNTHESIS_HEADING_SETS.en]
    : [SYNTHESIS_HEADING_SETS.en, SYNTHESIS_HEADING_SETS.no];
  return sets.some((headings) =>
    headings.every((h) => new RegExp(`(?:^|\\n)\\s*(?:[-*]\\s*)?(?:#+\\s*)?${h}\\s*:`, "i").test(text))
  );
}

// ── Shared style constants ────────────────────────────────────────────────────

const TICK = { fontSize: 11, fill: "var(--ink-muted)" };
const TOOLTIP_STYLE = {
  backgroundColor: "var(--surface)",
  border: "none",
  borderRadius: 10,
  fontSize: 12,
  boxShadow: "var(--shadow-lift)",
};
const SUBTLE_GRID = { stroke: "rgba(11,23,56,0.04)", strokeDasharray: "2 4", vertical: false };

// ── Primitive sub-components ──────────────────────────────────────────────────

function ChapterTag({ ch, label }) {
  return (
    <span
      className="block mb-3"
      style={{
        font: "var(--type-caption)",
        textTransform: "uppercase",
        letterSpacing: "0.12em",
        color: "var(--ink-muted)",
      }}
    >
      CH. {String(ch).padStart(2, "0")} · {label}
    </span>
  );
}

function KpiMono({ label, value, sub, accent }) {
  return (
    <div className="flex flex-col gap-1">
      <span
        className="block"
        style={{ font: "var(--type-caption)", textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--ink-muted)" }}
      >
        {label}
      </span>
      <span
        className="block"
        style={{
          fontFamily: "var(--font-family-mono)",
          fontWeight: 500,
          fontSize: "clamp(20px, 2.5vw, 28px)",
          lineHeight: 1,
          color: accent ? "var(--accent-race)" : "var(--ink)",
        }}
      >
        {value}
      </span>
      {sub && (
        <span style={{ font: "var(--type-caption)", color: "var(--ink-muted)" }}>{sub}</span>
      )}
    </div>
  );
}

function InsightPullQuote({ icon, text }) {
  return (
    <p
      className="m-0"
      style={{
        font: "var(--type-headline-italic)",
        color: "var(--ink)",
        lineHeight: 1.4,
      }}
    >
      {icon && <span className="mr-2 not-italic" style={{ color: "var(--accent-race)" }}>{icon}</span>}
      {text}
    </p>
  );
}

function EditorialCard({ children, className = "" }) {
  return (
    <div
      className={`rounded-[var(--radius-xl)] p-6 ${className}`}
      style={{ background: "var(--paper-raised)", boxShadow: "var(--shadow-lift)" }}
    >
      {children}
    </div>
  );
}

function SkeletonBlock({ height = 240 }) {
  return (
    <div
      className="skeleton-block rounded-xl animate-pulse"
      style={{ height, background: "var(--paper-raised)" }}
      aria-hidden="true"
    />
  );
}

function SynthesisCallout({ text, fetchedAt, fromCache, loading, locale, copy }) {
  if (loading) return <SkeletonBlock height={120} data-testid="synthesis-skeleton" />;
  if (!text) return null;
  return (
    <div
      className="insights-coach-synthesis rounded-[var(--radius-xl)] p-6"
      data-testid="synthesis-callout"
      style={{ background: "var(--paper-raised)", boxShadow: "var(--shadow-lift)" }}
    >
      <p
        className="mb-4 block"
        style={{
          font: "var(--type-caption)",
          textTransform: "uppercase",
          letterSpacing: "0.12em",
          color: "var(--ink-muted)",
        }}
      >
        AI · Training Analysis
      </p>
      <div
        className="prose max-w-none"
        style={{ fontFamily: "var(--font-family-sans)", fontSize: 14, color: "var(--ink)" }}
      >
        <ReactMarkdown
          components={{
            h3: ({ node, ...props }) => (
              <h3
                className="mt-0 mb-2"
                style={{
                  font: "var(--type-caption)",
                  textTransform: "uppercase",
                  letterSpacing: "0.12em",
                  color: "var(--ink-muted)",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
                {...props}
              >
                <span
                  style={{
                    display: "inline-block",
                    width: 5,
                    height: 5,
                    borderRadius: "50%",
                    background: "var(--accent-race)",
                  }}
                />
                {props.children}
              </h3>
            ),
            p: ({ node, ...props }) => (
              <p className="mb-4 last:mb-0 leading-relaxed" style={{ color: "var(--ink)" }} {...props} />
            ),
            strong: ({ node, ...props }) => (
              <strong style={{ color: "var(--ink)", fontWeight: 600 }} {...props} />
            ),
          }}
        >
          {text}
        </ReactMarkdown>
      </div>
      <div className="mt-4 flex gap-4 text-xs" style={{ color: "var(--ink-muted)" }}>
        {fromCache && <span>{copy.insightRefreshCached}</span>}
        {fetchedAt && (
          <span>{copy.insightRefreshUpdated}: {new Date(fetchedAt).toLocaleString(locale)}</span>
        )}
      </div>
    </div>
  );
}

function ActivityZoneBreakdown({ activityZones, locale }) {
  return (
    <div className="grid gap-5">
      {activityZones.map((activity) => (
        <div key={activity.id} className="grid gap-1.5">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium" style={{ color: "var(--ink)" }}>{activity.name}</span>
            <span className="text-xs" style={{ color: "var(--ink-muted)" }}>
              {new Date(activity.date).toLocaleDateString(locale, { month: "short", day: "numeric" })}
            </span>
          </div>
          <div className="flex rounded-full overflow-hidden h-3">
            {ZONE_KEYS.map((key, zi) => {
              const pct = activity.total > 0 ? (activity[key] / activity.total) * 100 : 0;
              return pct > 0 ? (
                <div
                  key={key}
                  className="h-full"
                  style={{ width: `${pct}%`, background: ZONE_COLORS[zi] }}
                  title={`${ZONE_LABELS[zi]}: ${Math.round(activity[key] / 60)}m (${Math.round(pct)}%)`}
                />
              ) : null;
            })}
          </div>
          <div className="flex flex-wrap gap-3">
            {ZONE_KEYS.map((key, zi) =>
              activity[key] > 0 ? (
                <span key={key} className="text-[11px] font-semibold" style={{ color: ZONE_COLORS[zi] }}>
                  Z{zi + 1} {Math.round(activity[key] / 60)}m
                </span>
              ) : null,
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function EfficiencyTooltip({ active, payload, locale }) {
  if (!active || !payload?.length) return null;
  const data = payload.find((e) => e?.payload?.name)?.payload || payload[0].payload;
  return (
    <div className="rounded-lg p-3 text-xs" style={{ background: "var(--surface)", boxShadow: "var(--shadow-lift)" }}>
      <p className="font-bold mb-1" style={{ color: "var(--ink)" }}>{data.name}</p>
      <p className="mb-2" style={{ color: "var(--ink-muted)" }}>{new Date(data.date).toLocaleDateString(locale)}</p>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1">
        <span style={{ color: "var(--ink-muted)" }}>EF</span>
        <span className="text-right font-mono font-bold" style={{ color: "var(--ink)" }}>
          {data.efficiencyFactor?.toFixed(3) ?? data.y?.toFixed(3) ?? "—"}
        </span>
        <span style={{ color: "var(--ink-muted)" }}>Avg HR</span>
        <span className="text-right font-mono font-bold" style={{ color: "var(--accent-race)" }}>
          {Math.round(data.averageHeartRate ?? 0)} bpm
        </span>
        <span style={{ color: "var(--ink-muted)" }}>Pace</span>
        <span className="text-right font-mono font-bold" style={{ color: "var(--ink)" }}>
          {formatPaceText(data.speedKph)}
        </span>
      </div>
    </div>
  );
}

function DecouplingTooltip({ active, payload, locale }) {
  if (!active || !payload?.length) return null;
  const data = payload[0].payload;
  return (
    <div className="rounded-lg p-3 text-xs" style={{ background: "var(--surface)", boxShadow: "var(--shadow-lift)" }}>
      <p className="font-bold mb-1" style={{ color: "var(--ink)" }}>{data.name}</p>
      <p className="mb-2" style={{ color: "var(--ink-muted)" }}>{new Date(data.date).toLocaleDateString(locale)}</p>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1">
        <span style={{ color: "var(--ink-muted)" }}>Duration</span>
        <span className="text-right font-mono font-bold" style={{ color: "var(--ink)" }}>{Math.round(data.durationMinutes)} min</span>
        <span style={{ color: "var(--ink-muted)" }}>Pa:HR</span>
        <span
          className="text-right font-mono font-bold"
          style={{ color: data.y <= 5 ? "var(--signal-good)" : "var(--signal-risk)" }}
        >
          {data.y.toFixed(1)}%
        </span>
      </div>
    </div>
  );
}

// ── Today Tab ─────────────────────────────────────────────────────────────────

function TodayTab({ kpiData, trainingLoadSeries, loadState, topInsight, recentActivity, lang, copy }) {
  const tsb = trainingLoadSeries.at(-1)?.tsb;
  const ctl = trainingLoadSeries.at(-1)?.ctl ?? 0;

  const loadMsg =
    loadState &&
    (LOAD_STATE_OVERLAYS[loadState.state]?.[loadState.trendLabel]?.[lang] ?? "");

  return (
    <div className="grid gap-8">
      {/* Editorial header */}
      <div>
        <ChapterTag ch="01" label="Today" />
        <div style={{ borderLeft: "3px solid var(--accent-race)", paddingLeft: 20, marginTop: 12 }}>
          {topInsight ? (
            <InsightPullQuote
              icon={INSIGHT_ICON_MAP[topInsight.icon]}
              text={topInsight.descText}
            />
          ) : (
            <p style={{ font: "var(--type-headline-italic)", color: "var(--ink-muted)" }}>
              No coaching insights yet — sync activities to unlock recommendations.
            </p>
          )}
        </div>
      </div>

      {/* KPI row — 4 mono values */}
      <div
        className="grid gap-8 max-[600px]:grid-cols-2"
        style={{ gridTemplateColumns: "repeat(4, 1fr)" }}
      >
        <KpiMono label="CTL" value={Math.round(ctl)} sub="Chronic load" />
        <KpiMono
          label="TSB"
          value={tsb == null ? "—" : `${tsb > 0 ? "+" : ""}${tsb.toFixed(1)}`}
          sub={tsb == null ? null : tsb > 5 ? "Fresh" : tsb < -5 ? "Fatigued" : "Neutral"}
          accent={tsb != null && tsb > 5}
        />
        <KpiMono label="7-day load" value={kpiData.thisWeekKm ? `${kpiData.thisWeekKm} km` : "—"} sub={kpiData.distDelta} />
        <KpiMono label="Consistency" value={kpiData.consistencyFrac} sub="Last 8 weeks" />
      </div>

      {/* Load state note */}
      {loadState && loadMsg && (
        <EditorialCard>
          <ChapterTag ch="02" label={LOAD_STATE_LABELS[lang][loadState.state] ?? loadState.state} />
          <p
            className="m-0 leading-relaxed"
            style={{ fontFamily: "var(--font-family-sans)", fontSize: 14, color: "var(--ink)" }}
          >
            {loadMsg}
          </p>
          <div
            className="mt-4 flex gap-3"
            style={{ fontFamily: "var(--font-family-mono)", fontSize: 12, color: "var(--ink-muted)" }}
          >
            <span>ATL {Math.round(trainingLoadSeries.at(-1)?.atl ?? 0)}</span>
            <span>·</span>
            <span>CTL {Math.round(ctl)}</span>
            <span>·</span>
            <span>TSB {tsb != null ? `${tsb > 0 ? "+" : ""}${tsb.toFixed(1)}` : "—"}</span>
          </div>
        </EditorialCard>
      )}

      {/* Most recent activity */}
      {recentActivity && (
        <EditorialCard>
          <ChapterTag ch="03" label="Last activity" />
          <div className="flex items-baseline gap-4 flex-wrap">
            <span style={{ font: "var(--type-headline-italic)", color: "var(--ink)" }}>
              {recentActivity.name || recentActivity.type || "Run"}
            </span>
            <span
              style={{
                fontFamily: "var(--font-family-mono)",
                fontSize: 20,
                fontWeight: 500,
                color: "var(--accent-race)",
              }}
            >
              {recentActivity.distance ? `${((recentActivity.distance) / 1000).toFixed(1)} km` : ""}
            </span>
          </div>
          <div
            className="mt-2 flex gap-6 flex-wrap"
            style={{ fontFamily: "var(--font-family-mono)", fontSize: 12, color: "var(--ink-muted)" }}
          >
            {recentActivity.moving_time && (
              <span>{Math.floor(recentActivity.moving_time / 60)} min</span>
            )}
            {recentActivity.elevation_gain > 0 && (
              <span>{Math.round(recentActivity.elevation_gain)} m elev</span>
            )}
            {recentActivity.started_at && (
              <span>
                {new Date(recentActivity.started_at).toLocaleDateString(undefined, {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                })}
              </span>
            )}
          </div>
        </EditorialCard>
      )}
    </div>
  );
}

// ── Trends Tab ────────────────────────────────────────────────────────────────

function TrendsTab({
  trainingLoadSeries,
  weeklyLoadPoints,
  zoneChartData,
  activityZones,
  longRunPoints,
  latestLongRunKm,
  targetLongRunKm,
  longRunCompletion,
  fitnessScore,
  fitnessLevel,
  fitnessLevelKey,
  ctl,
  loadState,
  checkins,
  formStat,
  readiness,
  risk,
  synthesis,
  synthesisFetchedAt,
  synthesisFromCache,
  synthesisLoading,
  locale,
  lang,
  copy,
}) {
  const formatShortDate = (v) => new Date(v).toLocaleDateString(locale, { month: "short", day: "numeric" });

  return (
    <div className="grid gap-6">

      {/* Synthesis callout */}
      <SynthesisCallout
        text={synthesis}
        fetchedAt={synthesisFetchedAt}
        fromCache={synthesisFromCache}
        loading={synthesisLoading}
        locale={locale}
        copy={copy}
      />

      {/* Training Load Trend */}
      {trainingLoadSeries.length >= 7 && (
        <EditorialCard>
          <ChapterTag ch="T1" label="Training Load Trend" />
          <p className="m-0 mb-4 text-sm" style={{ color: "var(--ink-muted)" }}>
            Fitness (CTL), Fatigue (ATL), and Form (TSB) over 90 days.
          </p>
          <ResponsiveContainer width="100%" height={240}>
            <ComposedChart data={trainingLoadSeries} margin={{ top: 4, right: 8, left: -8, bottom: 0 }}>
              <defs>
                <linearGradient id="ctlGradIntel" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--phase-base)" stopOpacity={0.18} />
                  <stop offset="95%" stopColor="var(--phase-base)" stopOpacity={0.01} />
                </linearGradient>
              </defs>
              <CartesianGrid {...SUBTLE_GRID} />
              <XAxis dataKey="date" tickFormatter={formatShortDate} interval={13} tick={TICK} axisLine={false} tickLine={false} />
              <YAxis tick={TICK} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v, n) => [Number(v).toFixed(1), n]} labelFormatter={formatShortDate} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
              <Area type="monotone" dataKey="ctl" name="Fitness (CTL)" stroke="var(--phase-base)" strokeWidth={2.5} fill="url(#ctlGradIntel)" dot={false} activeDot={{ r: 4, strokeWidth: 0 }} />
              <Line type="monotone" dataKey="atl" name="Fatigue (ATL)" stroke="var(--signal-risk)" strokeWidth={2} dot={false} activeDot={{ r: 4, strokeWidth: 0 }} />
              <Line type="monotone" dataKey="tsb" name="Form (TSB)" stroke="var(--signal-good)" strokeWidth={2} strokeDasharray="6 3" dot={false} activeDot={{ r: 4, strokeWidth: 0 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </EditorialCard>
      )}

      {/* Weekly Load + HR Zones */}
      {(weeklyLoadPoints.length >= 3 || zoneChartData.length >= 2) && (
        <div className="grid grid-cols-2 gap-6 max-[800px]:grid-cols-1">
          {weeklyLoadPoints.length >= 3 && (
            <EditorialCard>
              <ChapterTag ch="T2" label="Weekly Load" />
              <p className="m-0 mb-4 text-sm" style={{ color: "var(--ink-muted)" }}>
                Rolling 8-week view of accumulated training minutes.
              </p>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={weeklyLoadPoints} margin={{ top: 4, right: 8, left: -8, bottom: 0 }}>
                  <CartesianGrid {...SUBTLE_GRID} />
                  <XAxis dataKey="label" tick={TICK} axisLine={false} tickLine={false} />
                  <YAxis tick={TICK} axisLine={false} tickLine={false} unit=" m" />
                  <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => [`${v} min`, "Load"]} />
                  <Bar dataKey="load" fill="var(--phase-base)" radius={[5, 5, 0, 0]} maxBarSize={52} />
                </BarChart>
              </ResponsiveContainer>
            </EditorialCard>
          )}

          {zoneChartData.length >= 2 && (
            <EditorialCard>
              <ChapterTag ch="T3" label="HR Zone Distribution" />
              <p className="m-0 mb-4 text-sm" style={{ color: "var(--ink-muted)" }}>
                Time per zone each week. Build Z1–Z2 aerobic base.
              </p>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={zoneChartData} margin={{ top: 4, right: 8, left: -8, bottom: 0 }}>
                  <CartesianGrid {...SUBTLE_GRID} />
                  <XAxis dataKey="label" tick={TICK} axisLine={false} tickLine={false} />
                  <YAxis tick={TICK} axisLine={false} tickLine={false} unit="m" />
                  <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v, n) => [`${v} min`, n]} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                  <Bar dataKey="z1" name="Z1 Recovery" stackId="z" fill="#94a3b8" />
                  <Bar dataKey="z2" name="Z2 Aerobic" stackId="z" fill="#22c55e" />
                  <Bar dataKey="z3" name="Z3 Tempo" stackId="z" fill="#3b82f6" />
                  <Bar dataKey="z4" name="Z4 Threshold" stackId="z" fill="#f59e0b" />
                  <Bar dataKey="z5" name="Z5 VO₂max" stackId="z" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </EditorialCard>
          )}
        </div>
      )}

      {/* Zone breakdown per activity */}
      {activityZones.length >= 1 && (
        <EditorialCard>
          <ChapterTag ch="T4" label="Zone Breakdown per Workout" />
          <ActivityZoneBreakdown activityZones={activityZones} locale={locale} />
        </EditorialCard>
      )}

      {/* Fitness level + Long run */}
      <div className="grid grid-cols-[2fr_3fr] gap-6 max-[800px]:grid-cols-1">
        <EditorialCard>
          <ChapterTag ch="T5" label="Fitness Level" />
          <div className="flex items-baseline gap-2 mb-3">
            <span
              className="fitness-meter-value"
              style={{ fontFamily: "var(--font-family-mono)", fontSize: 40, fontWeight: 700, lineHeight: 1, color: "var(--ink)" }}
            >
              {fitnessScore}
            </span>
            <span style={{ color: "var(--ink-muted)", fontSize: 14 }}>/ 100</span>
          </div>
          <div
            className="fitness-meter w-full h-2 rounded-full overflow-hidden mb-3"
            style={{ background: "rgba(11,23,56,0.08)" }}
            role="img"
          >
            <div
              className="fitness-meter__fill h-full rounded-full transition-all duration-700"
              style={{
                width: `${fitnessScore}%`,
                background: fitnessScore < 35 ? "var(--ink-muted)" : fitnessScore < 65 ? "var(--phase-build)" : "var(--phase-base)",
              }}
            />
          </div>
          <span
            className="inline-block px-2.5 py-1 rounded-full text-xs font-bold"
            style={{ background: "var(--paper)", color: "var(--ink)" }}
          >
            {fitnessLevel}
          </span>
          <span className="ml-2 text-xs" style={{ color: "var(--ink-muted)" }}>
            CTL {Math.round(ctl)}
          </span>
        </EditorialCard>

        {longRunPoints.length >= 2 ? (
          <EditorialCard>
            <div className="flex items-start justify-between gap-4 mb-3">
              <ChapterTag ch="T6" label="Long Run Progression" />
              <span
                style={{ fontFamily: "var(--font-family-mono)", fontSize: 24, fontWeight: 700, color: "var(--ink)" }}
              >
                {longRunCompletion}%
              </span>
            </div>
            <div
              className="w-full h-1.5 rounded-full overflow-hidden mb-4"
              style={{ background: "rgba(11,23,56,0.08)" }}
            >
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${longRunCompletion}%`, background: "var(--phase-base)" }}
              />
            </div>
            <ResponsiveContainer width="100%" height={160}>
              <ComposedChart data={longRunPoints} margin={{ top: 4, right: 16, left: -8, bottom: 0 }}>
                <CartesianGrid {...SUBTLE_GRID} />
                <XAxis dataKey="label" tick={TICK} axisLine={false} tickLine={false} />
                <YAxis yAxisId="left" tick={TICK} axisLine={false} tickLine={false} unit=" km" />
                <YAxis yAxisId="right" orientation="right" tick={TICK} axisLine={false} tickLine={false} unit=" m" />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Bar yAxisId="left" dataKey="distanceKm" name="Distance (km)" fill="var(--accent-race)" radius={[4, 4, 0, 0]} maxBarSize={44} />
                <Line yAxisId="right" type="monotone" dataKey="elevation" name="Elevation (m)" stroke="var(--signal-warn)" strokeWidth={2} dot={{ r: 3, fill: "var(--signal-warn)", strokeWidth: 0 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </EditorialCard>
        ) : (
          <EditorialCard>
            <ChapterTag ch="T6" label="Long Run Progression" />
            <p className="text-sm text-center py-8" style={{ color: "var(--ink-muted)" }}>
              Log 2+ long runs to see progression.
            </p>
          </EditorialCard>
        )}
      </div>

      {/* Check-in summary */}
      <EditorialCard id="insight-summary">
        <div className="grid grid-cols-[1fr_auto] gap-6 items-start max-[600px]:grid-cols-1">
          <div>
            <ChapterTag ch="T7" label="Latest Check-in" />
            <p className="text-sm leading-relaxed m-0" style={{ color: "var(--ink)" }} id="latest-checkin-text">
              {checkins.checkins[0]
                ? (() => {
                    const c = checkins.checkins[0];
                    return `Week of ${new Date(c.week_of).toLocaleDateString(locale)}: fatigue ${c.fatigue}/5, sleep ${c.sleep_quality}/5, motivation ${c.motivation}/5${c.niggles ? ` · Niggles: ${c.niggles}` : ""}`;
                  })()
                : "No check-in yet. Submit your weekly check-in to track readiness."}
            </p>
          </div>
          <div className="flex gap-8 shrink-0" id="insight-stats">
            <div className="text-center">
              <span className="block mb-1 text-[11px] uppercase tracking-wide" style={{ color: "var(--ink-muted)" }}>Form</span>
              <strong
                id="stat-form"
                style={{
                  fontFamily: "var(--font-family-mono)",
                  fontSize: 20,
                  fontWeight: 700,
                  color: formStat == null ? "var(--ink-muted)" : formStat > 5 ? "var(--signal-good)" : formStat < -5 ? "var(--signal-risk)" : "var(--ink)",
                }}
              >
                {formStat == null ? "—" : `${formStat > 0 ? "+" : ""}${formStat.toFixed(1)}`}
              </strong>
            </div>
            <div className="text-center">
              <span className="block mb-1 text-[11px] uppercase tracking-wide" style={{ color: "var(--ink-muted)" }}>Readiness</span>
              <strong
                id="stat-readiness"
                style={{
                  fontFamily: "var(--font-family-mono)",
                  fontSize: 20,
                  fontWeight: 700,
                  color: readiness === READINESS_LABELS[lang].fresh ? "var(--signal-good)" : readiness === READINESS_LABELS[lang].fatigued ? "var(--signal-risk)" : "var(--ink)",
                }}
              >
                {readiness}
              </strong>
            </div>
            <div className="text-center">
              <span className="block mb-1 text-[11px] uppercase tracking-wide" style={{ color: "var(--ink-muted)" }}>Risk</span>
              <strong
                id="stat-risk"
                style={{
                  fontFamily: "var(--font-family-mono)",
                  fontSize: 20,
                  fontWeight: 700,
                  color: risk === RISK_LABELS[lang].high ? "var(--signal-risk)" : risk === RISK_LABELS[lang].moderate ? "var(--signal-warn)" : "var(--signal-good)",
                }}
              >
                {risk}
              </strong>
            </div>
          </div>
        </div>
      </EditorialCard>
    </div>
  );
}

// ── Efficiency Tab ────────────────────────────────────────────────────────────

function EfficiencyTab({ aerobicEfficiencyData, locale }) {
  return (
    <div className="grid gap-6">
      <div>
        <ChapterTag ch="E1" label="Endurance Efficiency" />
        <p style={{ font: "var(--type-headline-italic)", color: "var(--ink)", margin: 0 }}>
          How well your aerobic engine converts effort into speed.
        </p>
      </div>

      <EditorialCard>
        <ChapterTag ch="E2" label="Efficiency Factor" />
        <p className="m-0 mb-4 text-sm" style={{ color: "var(--ink-muted)" }}>
          Flat, aerobic runs and rides over the past 365 days. A 30-day rolling average smooths noise from heat, sleep, and day-to-day stress.
        </p>
        {aerobicEfficiencyData.points.length > 0 && (
          <div className="flex items-center justify-between mb-4">
            <div />
            <div className="text-right px-4 py-2 rounded-xl" style={{ background: "var(--paper)" }}>
              <span className="block text-[10px] uppercase tracking-wider mb-1" style={{ color: "var(--ink-muted)" }}>30-day avg</span>
              <span style={{ fontFamily: "var(--font-family-mono)", fontSize: 22, fontWeight: 700, color: "var(--ink)" }}>
                {aerobicEfficiencyData.points.at(-1)?.rollingAverage?.toFixed(3) ?? "—"}
              </span>
              <span className="block text-[10px]" style={{ color: "var(--ink-muted)" }}>
                HR cap {Math.round(aerobicEfficiencyData.maxHeartRate * 0.8)} bpm
              </span>
            </div>
          </div>
        )}
        {aerobicEfficiencyData.points.length === 0 ? (
          <p className="text-sm text-center py-12" style={{ color: "var(--ink-muted)" }}>
            No qualifying aerobic reference sessions yet. Activities need 30+ minutes, controlled heart rate, and relatively flat terrain.
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={320}>
            <ComposedChart data={aerobicEfficiencyData.points} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid {...SUBTLE_GRID} />
              <XAxis dataKey="x" type="number" domain={["dataMin", "dataMax"]} tickFormatter={fmtDate} tick={TICK} axisLine={false} tickLine={false} />
              <YAxis type="number" domain={["auto", "auto"]} tickFormatter={(v) => Number(v).toFixed(2)} tick={TICK} axisLine={false} tickLine={false} />
              <Tooltip content={<EfficiencyTooltip locale={locale} />} />
              <Scatter name="EF" data={aerobicEfficiencyData.points} shape={(props) => {
                const { cx, cy, fill } = props;
                return <circle cx={cx} cy={cy} r={5} fill={fill} fillOpacity={0.75} />;
              }}>
                {aerobicEfficiencyData.points.map((entry, i) => (
                  <Cell key={`ef-${i}`} fill={entry.type?.toLowerCase() === "run" ? "var(--phase-base)" : "var(--signal-good)"} />
                ))}
              </Scatter>
              <Line type="monotone" dataKey="rollingAverage" stroke="var(--ink)" strokeWidth={3} dot={false} activeDot={false} name="30-day avg" />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </EditorialCard>

      <EditorialCard>
        <ChapterTag ch="E3" label="Aerobic Decoupling" />
        <p className="m-0 mb-6 text-sm" style={{ color: "var(--ink-muted)" }}>
          When Pa:HR stays under 5%, your aerobic durability is holding for that duration. Higher values suggest the engine fades later in the session.
        </p>
        {aerobicEfficiencyData.decouplingPoints.length === 0 ? (
          <p className="text-sm text-center py-12" style={{ color: "var(--ink-muted)" }}>
            No sessions with enough split data to calculate Pa:HR yet.
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <ScatterChart margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid {...SUBTLE_GRID} />
              <XAxis type="number" dataKey="x" tickFormatter={(v) => `${Math.round(v)}m`} tick={TICK} axisLine={false} tickLine={false} name="Duration" />
              <YAxis type="number" dataKey="y" tickFormatter={(v) => `${Math.round(v)}%`} tick={TICK} axisLine={false} tickLine={false} name="Pa:HR" />
              <ReferenceLine y={5} stroke="var(--signal-warn)" strokeDasharray="4 4" label={{ value: "5%", position: "insideTopRight", fill: "var(--signal-warn)", fontSize: 11 }} />
              <Tooltip content={<DecouplingTooltip locale={locale} />} />
              <Scatter data={aerobicEfficiencyData.decouplingPoints} name="Pa:HR">
                {aerobicEfficiencyData.decouplingPoints.map((entry, i) => (
                  <Cell key={`dec-${i}`} fill={entry.y <= 5 ? "var(--signal-good)" : "var(--signal-risk)"} />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        )}
      </EditorialCard>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

const TABS = [
  { key: "today", label: "Today" },
  { key: "trends", label: "Trends" },
  { key: "efficiency", label: "Efficiency" },
];

export default function IntelligencePage() {
  const {
    auth,
    activities,
    checkins,
    plans,
    strava,
    dailyLogs,
    trainingBlocks,
    runnerProfile,
    invokeInsightsSynthesis,
  } = useAppData();
  const { lang } = useI18n();
  const locale = lang === "no" ? "nb-NO" : undefined;
  const [activeTab, setActiveTab] = useState("today");

  // ── Synthesis state (same logic as InsightsPage) ───────────────────────────
  const [synthesis, setSynthesis] = useState(null);
  const [synthesisLoading, setSynthesisLoading] = useState(false);
  const [synthesisFetchedAt, setSynthesisFetchedAt] = useState(null);
  const [synthesisFromCache, setSynthesisFromCache] = useState(false);
  const [refreshIntervalHours] = useState(DEFAULT_INSIGHT_REFRESH_INTERVAL_HOURS);
  const fetchAttemptKeyRef = useRef(null);
  const userId = auth?.user?.id ?? null;
  const hasData = activities.activities.length > 0;

  useEffect(() => {
    if (!userId) return;
    runnerProfile.loadProfile?.();
  }, [runnerProfile.loadProfile, userId]);

  useEffect(() => {
    if (!hasData || !userId) {
      fetchAttemptKeyRef.current = null;
      setSynthesis(null);
      setSynthesisFetchedAt(null);
      setSynthesisFromCache(false);
      setSynthesisLoading(false);
      return;
    }
    const cached = readSynthesisCache(userId, lang);
    const cacheAgeMs = cached ? Date.now() - new Date(cached.fetchedAt).getTime() : Number.POSITIVE_INFINITY;
    const maxAgeMs = refreshIntervalHours * 60 * 60 * 1000;
    const isFresh = cached && cacheAgeMs < maxAgeMs;
    if (isFresh) {
      setSynthesis(cached.text);
      setSynthesisFetchedAt(cached.fetchedAt);
      setSynthesisFromCache(true);
      setSynthesisLoading(false);
      return;
    }
    const fetchAttemptKey = `${userId}:${lang}:${refreshIntervalHours}`;
    if (fetchAttemptKeyRef.current === fetchAttemptKey) return;
    fetchAttemptKeyRef.current = fetchAttemptKey;
    setSynthesisLoading(true);
    (async () => {
      try {
        const payload = await buildCoachPayload({
          activities, dailyLogs, checkins,
          activePlan: plans.plans[0] ?? null,
          trainingBlocks, runnerProfile, lang,
          mode: "insights_synthesis",
        });
        const data = await invokeInsightsSynthesis(payload);
        if (data?.synthesis) {
          const { text, isTrusted } = sanitizeSynthesisText(data.synthesis);
          if (isTrusted || hasRequiredSynthesisHeadings(text, lang)) {
            const fetchedAt = new Date().toISOString();
            writeSynthesisCache(userId, lang, text, fetchedAt);
            setSynthesis(text);
            setSynthesisFetchedAt(fetchedAt);
            setSynthesisFromCache(false);
          }
        }
      } catch { /* silent fail */ }
      finally { setSynthesisLoading(false); }
    })();
  }, [activities, checkins, dailyLogs, hasData, invokeInsightsSynthesis, lang, plans.plans, refreshIntervalHours, runnerProfile, trainingBlocks, userId]);

  // ── Derived data ───────────────────────────────────────────────────────────
  const formatShortDate = (v) => new Date(v).toLocaleDateString(locale, { month: "short", day: "numeric" });

  const trainingLoadSeries = useMemo(
    () => computeTrainingLoad(activities.activities).map((item) => ({ ...item, dateObj: new Date(item.date) })),
    [activities.activities],
  );

  const loadState = useMemo(() => computeTrainingLoadState(trainingLoadSeries), [trainingLoadSeries]);

  const topInsight = useMemo(() => {
    const insights = generateCoachingInsights({
      activities: activities.activities,
      checkins: checkins.checkins,
      plans: plans.plans,
    });
    if (!insights.length) return null;
    const sorted = [...insights].sort((a, b) => (a.priority ?? 99) - (b.priority ?? 99));
    const top = sorted[0];
    const dict = lang === "no"
      ? { text: top.descKey }
      : { text: top.descKey };
    const TRANSLATIONS_INLINE = {
      "coach.overtrainingRiskDesc": lang === "no"
        ? "Trettheten din bygger seg opp raskere enn formen. Overvåk restitusjon nøye og vurder en rolig dag."
        : "Your fatigue is building faster than your fitness. Monitor recovery closely and consider an easy day.",
      "coach.wellRestedDesc": lang === "no"
        ? "Formen din er positiv — du har et overskudd av form over tretthet. Bra tidspunkt for en kvalitetsøkt."
        : "Your form is positive — you have a surplus of fitness over fatigue. Great time for a quality session.",
      "coach.deepFatigueDesc": lang === "no"
        ? "Din treningsbalanse er svært negativ. Prioriter søvn, ernæring og rolig løping de neste dagene."
        : "Your training stress balance is very negative. Prioritize sleep, nutrition, and easy running.",
      "coach.balancedLoadDesc": lang === "no"
        ? "Belastningen din er godt balansert mellom form og tretthet. Ideell tid for å opprettholde konsistens."
        : "Your load is well balanced between fitness and fatigue. Ideal time to maintain consistency.",
      "coach.fitnessGrowingDesc": lang === "no"
        ? "Den kroniske belastningen din er i vekst — formen bygger seg opp godt."
        : "Your chronic load is growing — fitness is building well.",
      "coach.fitnessDecliningDesc": lang === "no"
        ? "Den kroniske belastningen din har falt de siste 4 ukene. Vurder å øke treningsmengden gradvis."
        : "Your chronic load has declined over 4 weeks. Consider gradually increasing training volume.",
      "coach.highLoadRatioDesc": lang === "no"
        ? "Trettheten din bygger seg opp raskere enn formen. Overvåk restitusjon nøye og vurder en rolig dag."
        : "Fatigue is climbing faster than fitness. Monitor recovery and consider an easy day.",
    };
    return {
      ...top,
      descText: TRANSLATIONS_INLINE[top.descKey] ?? top.descKey,
    };
  }, [activities.activities, checkins.checkins, plans.plans, lang]);

  const longRunPoints = useMemo(
    () =>
      computeLongRuns(activities.activities).map(([weekStart, run]) => ({
        label: formatShortDate(weekStart),
        distanceKm: Math.round((run.distance / 1000) * 10) / 10,
        elevation: Math.round(run.elevation || 0),
      })),
    [activities.activities, locale],
  );

  const weeklyLoadPoints = useMemo(() => {
    const weekly = new Map();
    activities.activities.forEach((activity) => {
      const date = new Date(activity.started_at);
      const day = date.getDay();
      const diff = date.getDate() - day + (day === 0 ? -6 : 1);
      const weekStart = new Date(date);
      weekStart.setDate(diff);
      weekStart.setHours(0, 0, 0, 0);
      const key = weekStart.toISOString().split("T")[0];
      weekly.set(key, (weekly.get(key) || 0) + (Number(activity.moving_time) || 0) / 60);
    });
    return Array.from(weekly.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-8)
      .map(([weekStart, load]) => ({ label: formatShortDate(weekStart), load: Math.round(load) }));
  }, [activities.activities, locale]);

  const weeklyZones = useMemo(() => computeWeeklyHRZones(activities.activities), [activities.activities]);
  const activityZones = useMemo(() => computeRecentActivityZones(activities.activities), [activities.activities]);

  const zoneChartData = useMemo(
    () =>
      weeklyZones.map((w) => ({
        label: formatShortDate(w.weekStart),
        z1: Math.round((w.z1 || 0) / 60),
        z2: Math.round((w.z2 || 0) / 60),
        z3: Math.round((w.z3 || 0) / 60),
        z4: Math.round((w.z4 || 0) / 60),
        z5: Math.round((w.z5 || 0) / 60),
      })),
    [locale, weeklyZones],
  );

  const aerobicEfficiencyData = useMemo(
    () => computeEnduranceEfficiency(activities.activities, { windowDays: 365 }),
    [activities.activities],
  );

  const kpiData = useMemo(() => {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const diffToMonday = (dayOfWeek === 0 ? -6 : 1) - dayOfWeek;
    const thisMonday = new Date(now);
    thisMonday.setDate(now.getDate() + diffToMonday);
    thisMonday.setHours(0, 0, 0, 0);
    const lastMonday = new Date(thisMonday);
    lastMonday.setDate(thisMonday.getDate() - 7);

    let thisWeekDist = 0;
    let lastWeekDist = 0;
    const weeksWithRuns = new Set();

    activities.activities.forEach((a) => {
      const d = new Date(a.started_at);
      const dist = Number(a.distance) || 0;
      if (d >= thisMonday) thisWeekDist += dist;
      else if (d >= lastMonday) lastWeekDist += dist;
      const mondayOfWeek = new Date(d);
      const diff = (d.getDay() === 0 ? -6 : 1) - d.getDay();
      mondayOfWeek.setDate(d.getDate() + diff);
      mondayOfWeek.setHours(0, 0, 0, 0);
      weeksWithRuns.add(mondayOfWeek.toISOString().split("T")[0]);
    });

    const thisWeekKm = (thisWeekDist / 1000).toFixed(1);
    const distDeltaKm = ((thisWeekDist - lastWeekDist) / 1000).toFixed(1);
    const distDir = thisWeekDist > lastWeekDist ? "up" : thisWeekDist < lastWeekDist ? "down" : "neutral";
    const distDelta =
      distDir === "neutral"
        ? "Same as last week"
        : `${distDir === "up" ? "+" : ""}${distDeltaKm} km vs last week`;

    const last8Mondays = Array.from({ length: 8 }, (_, i) => {
      const m = new Date(thisMonday);
      m.setDate(thisMonday.getDate() - i * 7);
      return m.toISOString().split("T")[0];
    });
    const weeksRun = last8Mondays.filter((w) => weeksWithRuns.has(w)).length;
    const consistencyFrac = `${weeksRun}/8 wks`;

    return { thisWeekKm, distDelta, distDir, consistencyFrac, weeksRun };
  }, [activities.activities]);

  const latestLoad = trainingLoadSeries.at(-1);
  const ctl = latestLoad?.ctl ?? 0;
  const fitnessScore = Math.max(0, Math.min(100, Math.round((ctl / 90) * 100)));
  const fitnessLevelKey = ctl < 20 ? "Building" : ctl < 40 ? "Developing" : ctl < 60 ? "Strong" : "Peak";
  const fitnessLevel = fitnessLevelKey;

  const targetLongRunKm = useMemo(() => {
    const currentMileage = Number(plans.plans[0]?.current_mileage) || 0;
    if (currentMileage > 0) return Math.max(12, Math.round(currentMileage * 0.35));
    const longest = Math.max(...longRunPoints.map((p) => p.distanceKm), 0);
    return longest > 0 ? Math.round(longest * 1.15) : 20;
  }, [longRunPoints, plans.plans]);

  const latestLongRunKm = longRunPoints.at(-1)?.distanceKm ?? 0;
  const longRunCompletion = Math.max(0, Math.min(100, Math.round((latestLongRunKm / Math.max(1, targetLongRunKm)) * 100)));

  const formStat = trainingLoadSeries.at(-1)?.tsb;
  const readiness =
    formStat == null
      ? "—"
      : formStat > 5
      ? READINESS_LABELS[lang].fresh
      : formStat > -5
      ? READINESS_LABELS[lang].neutral
      : READINESS_LABELS[lang].fatigued;

  const risk = useMemo(() => {
    const last = trainingLoadSeries.at(-1);
    if (!last) return "—";
    const ratio = last.ctl > 0 ? last.atl / last.ctl : 0;
    return ratio > 1.5 ? RISK_LABELS[lang].high : ratio > 1.2 ? RISK_LABELS[lang].moderate : RISK_LABELS[lang].low;
  }, [trainingLoadSeries, lang]);

  const recentActivity = activities.activities.length > 0
    ? [...activities.activities].sort((a, b) => new Date(b.started_at) - new Date(a.started_at))[0]
    : null;

  const copy = useMemo(
    () => ({
      insightRefreshCached: "Using cached insight",
      insightRefreshUpdated: "Last updated",
    }),
    [],
  );

  const isLoading = activities.loading;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <PageContainer id="intelligence">

      {/* Page header */}
      <div>
        <span
          className="block mb-2"
          style={{ font: "var(--type-caption)", textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--ink-muted)" }}
        >
          CH. 01 · INTELLIGENCE
        </span>
        <h2
          className="m-0 mb-1"
          style={{ font: "var(--type-cover)", color: "var(--ink)" }}
        >
          Intelligence
        </h2>
        <p style={{ fontFamily: "var(--font-family-sans)", fontSize: 14, color: "var(--ink-muted)", margin: 0 }}>
          Training analysis, fitness trends, and aerobic efficiency.
        </p>
      </div>

      {/* Tab bar */}
      <div
        className="flex gap-1 p-1 rounded-xl w-fit"
        style={{ background: "var(--paper-raised)" }}
        role="tablist"
      >
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.key}
            onClick={() => setActiveTab(tab.key)}
            className="px-5 py-2 rounded-lg text-sm font-medium transition-all"
            style={{
              fontFamily: "var(--font-family-display)",
              background: activeTab === tab.key ? "var(--surface)" : "transparent",
              color: activeTab === tab.key ? "var(--ink)" : "var(--ink-muted)",
              boxShadow: activeTab === tab.key ? "var(--shadow-sm)" : "none",
              border: "none",
              cursor: "pointer",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Empty state */}
      {!isLoading && !hasData && (
        <div
          className="text-center py-20 rounded-[var(--radius-xl)]"
          style={{ background: "var(--paper-raised)" }}
        >
          <p
            className="m-0 mb-1"
            style={{ fontFamily: "var(--font-family-display)", fontWeight: 600, color: "var(--ink)" }}
          >
            No training data yet
          </p>
          <p className="text-sm m-0 mb-6 max-w-sm mx-auto" style={{ color: "var(--ink-muted)" }}>
            Connect Strava and sync your activities to unlock training load charts, zone analysis, and readiness tracking.
          </p>
          {strava.startConnect && (
            <Button type="button" onClick={strava.startConnect}>
              Connect Strava
            </Button>
          )}
        </div>
      )}

      {/* Loading state */}
      {isLoading && (
        <div className="grid gap-6">
          <SkeletonBlock height={200} />
          <div className="grid grid-cols-2 gap-6">
            <SkeletonBlock height={240} />
            <SkeletonBlock height={240} />
          </div>
        </div>
      )}

      {/* Tab content */}
      {!isLoading && hasData && (
        <>
          {activeTab === "today" && (
            <TodayTab
              kpiData={kpiData}
              trainingLoadSeries={trainingLoadSeries}
              loadState={loadState}
              topInsight={topInsight}
              recentActivity={recentActivity}
              lang={lang}
              copy={copy}
            />
          )}
          {activeTab === "trends" && (
            <TrendsTab
              trainingLoadSeries={trainingLoadSeries}
              weeklyLoadPoints={weeklyLoadPoints}
              zoneChartData={zoneChartData}
              activityZones={activityZones}
              longRunPoints={longRunPoints}
              latestLongRunKm={latestLongRunKm}
              targetLongRunKm={targetLongRunKm}
              longRunCompletion={longRunCompletion}
              fitnessScore={fitnessScore}
              fitnessLevel={fitnessLevel}
              fitnessLevelKey={fitnessLevelKey}
              ctl={ctl}
              loadState={loadState}
              checkins={checkins}
              formStat={formStat}
              readiness={readiness}
              risk={risk}
              synthesis={synthesis}
              synthesisFetchedAt={synthesisFetchedAt}
              synthesisFromCache={synthesisFromCache}
              synthesisLoading={synthesisLoading}
              locale={locale}
              lang={lang}
              copy={copy}
            />
          )}
          {activeTab === "efficiency" && (
            <EfficiencyTab
              aerobicEfficiencyData={aerobicEfficiencyData}
              locale={locale}
            />
          )}
        </>
      )}

    </PageContainer>
  );
}

export function __resetInsightsSynthesisCacheForTests() {
  if (typeof localStorage === "undefined") return;
  const keys = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(SYNTHESIS_CACHE_KEY_PREFIX)) keys.push(key);
  }
  keys.forEach((k) => localStorage.removeItem(k));
}
