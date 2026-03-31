# Phase 15: Click-to-Edit Workflow + FAB - Research

**Researched:** 2026-03-24
**Domain:** Interactive Training Planner (Modals, FABs, Forms, Optimistic UI)
**Confidence:** HIGH

## Summary

This phase transforms the training planner from a read-only grid into an interactive workspace. The primary technical challenges involve providing a responsive and fluid experience across desktop and mobile, implementing a scroll-aware floating action button (FAB), and ensuring immediate visual feedback via optimistic UI updates.

**Primary recommendation:** Use a "Responsive Modal" pattern that switches between a `shadcn/ui` Dialog (Desktop) and a `vaul` Drawer (Mobile), and implement optimistic UI updates directly in the `useWorkoutEntries` hook's reducer to ensure the grid feels snappy.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **Presentation:** Adaptive Dialog/Drawer (Centered on desktop, bottom sheet on mobile).
- **Styling:** Precision Athlete (PA) styled header with navy background and glassmorphism (backdrop-blur).
- **Deletion:** Trash icon in the top-right corner of the interface, guarded by a confirmation dialog.
- **Mobile FAB Appearance:** Circular floating button with a `+` icon, fixed in the bottom-right corner.
- **Mobile FAB Behavior:** Defaults to "Today" for new workouts. Hides when scrolling down and reappears when scrolling up.
- **Completion:** Direct-toggle via a visible checkbox on the grid cards (no need to open the modal).
- **Visual Feedback:** Completed workouts fade to 60% opacity and display a checkmark.
- **Workout Form Fields:** Type, Distance, Duration, Description.
- **Form Enhancements:** Iconic Type Select and Live Color Preview.
- **Editable Date:** The date field is editable within the form to allow moving workouts between days.

### Claude's Discretion
- Implementation details of the scroll-sensitive FAB.
- Architecture of the optimistic UI updates.
- Selection of libraries for animations and drawers.

### Deferred Ideas (OUT OF SCOPE)
- Drag-and-drop workout reordering (deferred to future milestone).
- Rich text notes in workout description.
- Multiple workouts per day sorting (sorting is by creation time for now).
- Light/Dark mode toggle (design system is light-only).
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| EDIT-01 | User can tap a workout card to open an edit modal with full workout details | Researched `ResponsiveModal` pattern using `Dialog` and `vaul` Drawer. |
| EDIT-02 | User can create a new workout via the "Ny Okt" floating action button | Researched scroll-sensitive FAB with `framer-motion` and `useScrollDirection`. |
| EDIT-03 | User can mark a workout as completed from the edit modal | Researched optimistic UI updates for `toggleCompleted` and grid visibility. |
| EDIT-04 | User can delete a workout from the edit modal | Researched confirmation dialogs and optimistic deletion with rollback. |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `vaul` | 1.1.2 | Drawer / Bottom Sheet | The community standard for accessible, swipeable bottom sheets in React. |
| `framer-motion` | 12.38.0 | Animations | Powerful declarative animations for the FAB and modal transitions. |
| `react-hook-form` | 7.71.2 | Form Management | High-performance, lightweight form state management. |
| `zod` | 4.3.6 | Validation | Schema-first validation that integrates perfectly with RHF. |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|--------------|
| `@radix-ui/react-dialog` | 1.1.15 | Desktop Modals | Base primitive for accessible centered dialogs. |
| `lucide-react` | 0.575.0 | Icons | Standard icon set for `+`, `Trash`, `Check`, etc. |

**Installation:**
```bash
npm install vaul framer-motion
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── components/
│   ├── ui/
│   │   ├── ResponsiveModal.jsx   # Wrapper for Dialog/Drawer
│   │   ├── Drawer.jsx            # vaul implementation
│   │   └── FAB.jsx               # Floating Action Button
│   └── planner/
│       ├── WorkoutForm.jsx       # Shared form for create/edit
│       └── WorkoutCardPreview.jsx # Live preview of the workout card
└── hooks/
    └── useScrollDirection.js     # Detects scroll for FAB hiding
```

### Pattern 1: Responsive Modal (Dialog vs Drawer)
**What:** Use a media query hook to switch between `Dialog` on desktop and `Drawer` on mobile.
**When to use:** For all workout-related interactions (create, edit, delete confirmation).
**Example:**
```typescript
// Inspired by shadcn/ui responsive dialog examples
const isDesktop = useMediaQuery("(min-width: 768px)");

if (isDesktop) {
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>{children}</DialogContent>
    </Dialog>
  );
}

return (
  <Drawer open={open} onOpenChange={setOpen}>
    <DrawerContent className="p-4">{children}</DrawerContent>
  </Drawer>
);
```

### Pattern 2: Optimistic UI with Reducer (React 18)
**What:** Enhance the `useWorkoutEntries` hook's reducer to handle "optimistic" actions that update the UI immediately with a temporary ID and a `pending` flag.
**When to use:** `createEntry`, `updateEntry`, `deleteEntry`, and `toggleCompleted`.
**Implementation:**
- `type: "PENDING_CREATE"`: Add to entries with `id: "temp-..."` and `pending: true`.
- `type: "COMMIT_CREATE"`: Replace temp ID with real ID from server.
- `type: "ROLLBACK"`: Remove temp items or restore old state on error.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Bottom Sheet Gestures | Custom touch listeners | `vaul` | Handles swipe-to-dismiss, snap points, and accessibility natively. |
| FAB Animation | Manual CSS transitions | `framer-motion` | Handles `AnimatePresence` for entrance/exit animations much more reliably. |
| Scroll Tracking | Bare `window.scrollY` | `useScrollDirection` hook | Needs thresholding and debouncing to prevent flickering. |
| Form State | `useState` per field | `react-hook-form` | Handles validation, watching, and dirty states with less boilerplate. |

## Common Pitfalls

### Pitfall 1: Scroll Direction Flickering
**What goes wrong:** The FAB hides and shows repeatedly when scrolling slowly or when the user "jiggles" the scroll.
**How to avoid:** Implement a threshold (e.g., 10-20px) in the `useScrollDirection` hook before triggering a state change.

### Pitfall 2: Mobile Keyboard Overlay
**What goes wrong:** The virtual keyboard covers the inputs in the bottom sheet (Drawer).
**How to avoid:** `vaul` handles this well by default, but ensuring the `DrawerContent` has enough padding/bottom margin or using `snapPoints` is critical.

### Pitfall 3: Duplicate Temporary Entries
**What goes wrong:** Multiple optimistic creates happen before the first one finishes, leading to key collisions or out-of-order items.
**How to avoid:** Use a truly unique temporary ID (`crypto.randomUUID()` or `Date.now() + Math.random()`).

## Code Examples

### Scroll-Aware FAB
```javascript
// src/hooks/useScrollDirection.js
export function useScrollDirection(threshold = 20) {
  const [direction, setDirection] = useState("up");
  const prevY = useRef(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentY = window.scrollY;
      if (Math.abs(currentY - prevY.current) < threshold) return;
      
      setDirection(currentY > prevY.current ? "down" : "up");
      prevY.current = currentY;
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [threshold]);

  return direction;
}
```

### Live Color Preview (RHF)
```javascript
// src/components/planner/WorkoutForm.jsx
const workoutType = watch("workout_type");
const meta = WORKOUT_TYPES[workoutType] ?? WORKOUT_TYPES.EASY;

return (
  <div className="space-y-4">
    {/* Preview */}
    <div style={{ "--pa-type-bg": `var(${meta.colorContainerToken})` }}>
      <WorkoutCardPreview workoutType={workoutType} />
    </div>
    {/* Fields */}
    <Select {...register("workout_type")}>...</Select>
  </div>
);
```

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest + React Testing Library |
| Config file | `vitest.config.js` |
| Quick run command | `npm run test` |
| Full suite command | `npm run test:all` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| EDIT-01 | Click card opens modal | UI | `npm run test tests/unit/weeklyplan.test.jsx` | ✅ |
| EDIT-02 | FAB opens empty form | UI | `npm run test tests/unit/weeklyplan.test.jsx` | ✅ |
| EDIT-03 | Completion toggle updates grid | Unit/UI | `npm run test tests/unit/useWorkoutEntries.test.jsx` | ✅ |
| EDIT-04 | Delete removes card | Unit/UI | `npm run test tests/unit/useWorkoutEntries.test.jsx` | ✅ |

### Wave 0 Gaps
- [ ] `src/hooks/useScrollDirection.js` — needed for FAB.
- [ ] `src/components/ui/ResponsiveModal.jsx` — needed for EDIT-01/02.
- [ ] `src/components/ui/Drawer.jsx` — `vaul` installation and setup.

## Sources

### Primary (HIGH confidence)
- `shadcn/ui` Documentation (Dialog/Form)
- `vaul` GitHub README (Gestures, Snap points)
- `framer-motion` Documentation (Scroll-triggered animations)

### Secondary (MEDIUM confidence)
- "Modern Optimistic UI in React 18" (Community patterns for useReducer)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Libraries are industry standard (2025).
- Architecture: HIGH - Follows existing project patterns and shadcn conventions.
- Pitfalls: MEDIUM - Derived from common React/Mobile interaction issues.

**Research date:** 2026-03-24
**Valid until:** 2026-04-24
