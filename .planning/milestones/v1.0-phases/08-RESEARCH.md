# Research: Phase 8 - Insight Reliability

## 1. Strict Header Plucking Regex (Deno)

To ensure the AI output is clean and structured even when Gemini adds "chatter" or markdown fences, use a multi-pass regex extraction strategy.

### Extraction Pattern
This pattern identifies the four mandatory sections by looking for the header name followed by a colon, capturing everything until the next header or end-of-string.

```typescript
const REQUIRED_HEADINGS = [
  "Mileage Trend",
  "Intensity Distribution",
  "Long-Run Progression",
  "Race Readiness",
];

/**
 * Extracts sections using a sliding window regex.
 * Handles cases where AI adds markdown headers (###) or bullet points before the keys.
 */
function pluckSynthesisSections(rawText: string): Record<string, string> {
  const sections: Record<string, string> = {};
  const cleaned = rawText.replace(/```json|```/g, "").trim();

  REQUIRED_HEADINGS.forEach((heading, idx) => {
    const nextHeading = REQUIRED_HEADINGS[idx + 1];
    // Pattern: (Start or Newline) -> (Optional markdown artifacts) -> Heading -> Colon -> Content
    const regex = new RegExp(
      `(?:^|\\n)\\s*(?:[#\\-\\s]*)${heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*:\\s*([\\s\\S]*?)(?=\\n\\s*(?:[#\\-\\s]*)(?:${REQUIRED_HEADINGS.join("|")})\\s*:|$)`,
      "i"
    );
    const match = cleaned.match(regex);
    if (match && match[1]) {
      sections[heading] = match[1].trim();
    }
  });

  return sections;
}

/**
 * Rebuilds the response as clean H3-based Markdown.
 */
function rebuildSanitizedMarkdown(sections: Record<string, string>): string {
  return REQUIRED_HEADINGS
    .filter(h => sections[h])
    .map(h => `### ${h}\n${sections[h]}`)
    .join("\n\n");
}
```

---

## 2. React-Markdown Implementation (InsightsPage.jsx)

Standardize rendering using `react-markdown` with a specific Tailwind mapping to match the app's aesthetic.

### Implementation Pattern

```jsx
import ReactMarkdown from 'react-markdown';

// Component logic
const renderableSynthesis = useMemo(() => {
  return sanitizeAndRebuildMarkdown(synthesis); 
}, [synthesis]);

// Render Logic
{renderableSynthesis && (
  <div className="insights-coach-synthesis bg-blue-50/50 border border-blue-100 rounded-xl p-6 mb-8 shadow-sm">
    <ReactMarkdown
      className="prose prose-slate max-w-none prose-sm"
      components={{
        h3: ({node, ...props}) => (
          <h3 className="text-sm font-bold text-blue-900 uppercase tracking-wider mt-0 mb-2 flex items-center gap-2" {...props}>
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
            {props.children}
          </h3>
        ),
        p: ({node, ...props}) => (
          <p className="text-slate-700 leading-relaxed mb-4 last:mb-0" {...props} />
        ),
        strong: ({node, ...props}) => (
          <strong className="font-semibold text-slate-900" {...props} />
        ),
        ul: ({node, ...props}) => (
          <ul className="list-disc ml-5 mb-4 space-y-1" {...props} />
        ),
        li: ({node, ...props}) => (
          <li className="text-slate-600" {...props} />
        )
      }}
    >
      {renderableSynthesis}
    </ReactMarkdown>
  </div>
)}
```

*Note: Requires `npm install react-markdown`.*

---

## 3. Edge Function Logging Pattern

To improve prompt engineering, log malformed responses to a dedicated audit table.

### Database Schema (Migration)
```sql
CREATE TABLE ai_audit_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamptz DEFAULT now(),
  user_id uuid REFERENCES auth.users(id),
  mode text NOT NULL,
  raw_response text,
  error_type text,
  metadata jsonb
);
```

### Edge Function Logic
```typescript
async function logAiFailure(supabase: any, userId: string, mode: string, raw: string, error: string) {
  await supabase.from("ai_audit_logs").insert({
    user_id: userId,
    mode,
    raw_response: raw,
    error_type: error,
    metadata: { timestamp: new Date().toISOString() }
  });
}

// Inside Deno.serve
const sanitized = rebuildSanitizedMarkdown(pluckSynthesisSections(rawText));
const hasAllSections = REQUIRED_HEADINGS.every(h => sanitized.includes(h));

if (!hasAllSections) {
  // Fire and forget logging
  logAiFailure(supabase, user.id, "insights_synthesis", rawText, "missing_sections")
    .catch(console.error);
}
```

---

## 4. Dependencies to Add
- `react-markdown`: For safe Markdown rendering.
- `lucide-react`: Already in project, can be used for section icons (optional).
