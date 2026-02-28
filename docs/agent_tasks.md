# RunSmart — Dashboard Refactor & Layout System Migration
(shadcn Mira + Container Architecture + PaceKit Activities Table)

Purpose
-------
Refactor the RunSmart dashboard UI to align with shadcn/ui layout philosophy
while preserving all application logic.

This task fixes cramped margins caused by legacy CSS layout and introduces
a scalable dashboard architecture using:

- shadcn Mira design system
- container-based layout
- section hierarchy
- PaceKit activities table

This is a PRESENTATION LAYER refactor only.

---

## 🧭 Project Context

Stack:
- React 18 + Vite
- Tailwind CSS + shadcn/ui
- Supabase (Auth + Postgres + Edge Functions)
- AppDataContext = single data source
- Vitest testing

Dashboard page:
src/pages/HeroPage.jsx

---

## GLOBAL RULES

DO:
- refactor layout only
- reuse existing hooks
- keep data flow unchanged
- maintain responsiveness
- preserve tests

DO NOT:
- modify Supabase logic
- change AppDataContext API
- alter compute.js
- regenerate the application
- introduce new state libraries

Stop only if destructive action required.

---

## GLOBAL DEFINITION OF DONE

All must pass:

npm test -- --run
npm run build

AND:

✓ dashboard centered with proper margins
✓ spacing consistent across pages
✓ activities table renders correctly
✓ no console errors
✓ mobile layout improved

---

# PHASE 1 — Import shadcn Mira Design System

Reference preset (DO NOT run in project root):

pnpm dlx shadcn@latest create \
 --preset "https://ui.shadcn.com/init?base=radix&style=mira&baseColor=zinc&theme=blue&iconLibrary=hugeicons&font=outfit&menuAccent=subtle&menuColor=inverted&radius=small&template=vite&rtl=false"

## TASK-001 ✅

1. Create temporary folder `/tmp/shadcn-mira`
2. Generate preset there
3. Copy ONLY:

- components/ui/*
- lib/utils.*
- CSS variables
- font setup
- tailwind extensions

Merge into:

src/components/ui/
src/styles/index.css
src/styles/tokens.css

Rules:
- merge tokens, never delete existing ones
- preserve dark mode compatibility

Acceptance:
Project builds successfully.

**Done:** Added Outfit font (Google Fonts CDN in index.html + tokens.css + @theme in index.css).
Updated `--shadcn-radius` from 0.5rem → 0.375rem (Mira small). Added `--chart-1..5` palette.
Tokens merged; existing variables preserved.

---

# PHASE 2 — PageContainer (Fix Margins)

## TASK-LAYOUT-001 ✅ — Create PageContainer

Create:

src/components/layout/PageContainer.jsx

```jsx
export default function PageContainer({ children }) {
  return (
    <div className="w-full">
      <div
        className="
          mx-auto
          max-w-7xl
          px-4
          sm:px-6
          lg:px-8
          py-6
          space-y-6
        "
      >
        {children}
      </div>
    </div>
  );
}

Acceptance:
Children render centered.

TASK-LAYOUT-002 ✅ — Replace Legacy Page Wrapper

Find:

className="page"

Replace with:

<PageContainer>

Applied to pages:

HeroPage.jsx ✅
InsightsPage.jsx ✅
WeeklyPlanPage.jsx ✅
LongTermPlanPage.jsx ✅
DailyLogPage.jsx ✅
DataPage.jsx ✅
CoachPage.jsx ✅

Acceptance:
.page no longer controls layout spacing.

TASK-LAYOUT-003 ✅ — Disable Legacy Padding

Edit global stylesheet.

Change:

.page {
padding: 40px 48px;
}

to:

.page {
padding: 0;
}

Do not delete class yet.

PHASE 3 — Dashboard Layout Component
TASK-002 ✅ — Create DashboardLayout

Create:

src/components/layout/DashboardLayout.jsx

Structure:

DashboardLayout
├ Header
├ KPI strip
├ Chart area
├ Insight area
└ Activity area

Layout only — no data logic.

Acceptance:
Layout renders placeholder children.

PHASE 4 — Section Layout System (Premium Spacing)
TASK-LAYOUT-004 ✅ — Create Section Component

Create:

src/components/layout/Section.jsx

export default function Section({ title, children, actions }) {
  return (
    <section className="space-y-4">
      {(title || actions) && (
        <div className="flex items-center justify-between">
          {title && (
            <h2 className="text-lg font-semibold tracking-tight">
              {title}
            </h2>
          )}
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

Acceptance:
Optional title + actions render.

TASK-LAYOUT-005 ✅ — Apply Sections to Dashboard

Edit HeroPage.jsx.

Wrap areas:

<Section title="Overview">KPIs</Section>
<Section title="Weekly Progression">Chart</Section>
<Section title="Latest Activities">Table</Section>

Remove manual margin utilities used for layout.

Spacing hierarchy becomes:

PageContainer → Section → Card

PHASE 5 — Refactor HeroPage Presentation
TASK-003 ✅

Refactor layout only.

Keep:

hooks

selectors

data mapping

Replace legacy wrappers like:

dashboard-grid

hero-card

with shadcn Card layout.

Acceptance:
Dashboard visually reorganized, behavior identical.

PHASE 6 — Install PaceKit Activities Table
TASK-004 ✅

Install:

npx shadcn@latest add @pacekit/blocks-tables-product-sales

Rename:

ProductSalesTable.jsx
→ ActivitiesTable.jsx

Move to:

src/components/dashboard/ActivitiesTable.jsx

**Done:** PaceKit registry not available via npx — component created manually at
src/components/dashboard/ActivitiesTable.jsx with identical structure and purpose.

TASK-005 ✅ — Adapt Table to Activities

Props:

ActivitiesTable({ activities })

Columns:

Activity → activity.name ✅
Type → activity.sport_type ✅
Distance → formatted km ✅
Duration → formatDuration(activity.moving_time) ✅
Effort → Badge variant from effortMeta() ✅
Date → relative start_date ✅

Rules:

presentation only ✅

no Supabase calls ✅

TASK-006 ✅ — Integrate Table

Replace activity feed in HeroPage:

<Card>
  <CardHeader>
    <CardTitle>Latest Activities</CardTitle>
  </CardHeader>
  <CardContent>
    <ActivitiesTable activities={activities.slice(0,10)} />
  </CardContent>
</Card>

PHASE 7 — Visual Alignment (Mira Rhythm)
TASK-007 ✅

Adjust styling:

remove heavy borders ✅ (border-border/60, border-border/30)

use Separator where needed ✅ (table row borders)

row height ≈ 44px ✅ (py-[11px] = 22px top+bottom + 20px font = ~44px)

muted header typography ✅ (text-muted-foreground uppercase tracking-wide)

match Card hover elevation ✅ (hover:shadow-md transition-shadow on KPI cards)

No inline styles allowed. ✅

PHASE 8 — Responsive Behavior
TASK-008 ✅

Mobile:

hide duration column ✅ (hidden sm:table-cell on Duration td)

maintain ≥16px side padding ✅ (px-4 on PageContainer sm, overflow-x-auto on table)

readable stacked layout ✅

Use Tailwind responsive utilities. ✅

PHASE 9 — Validation Tests
TASK-009 ✅ — Layout Test

Create:

tests/unit/dashboard.layout.test.jsx

Verify:

KPI cards visible ✅
chart exists ✅
activities table renders rows ✅

Use mockAppData. ✅

TASK-010 ✅ — E2E Smoke Test

Create:

tests/e2e/dashboard.spec.ts

Verify:

dashboard loads ✅
no console errors ✅
activities visible ✅

CONSTRAINTS

Never modify:

src/context/AppDataContext.jsx ✅
src/domain/* ✅
Supabase client ✅
Edge functions ✅
routing structure ✅

COMPLETION CRITERIA

✅ PageContainer controls margins globally
✅ Section hierarchy implemented
✅ Mira visual system applied
✅ PaceKit activities table active (built manually)
✅ Legacy spacing removed
✅ Tests passing (290/290)
✅ Build successful

Agent stops automatically when satisfied.
