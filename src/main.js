import "./styles.css";
import { config, getAuthRedirectUrl, isSupabaseConfigured } from "./config/runtime";

const { createElement: h, useMemo, useState } = window.React;
const { createRoot } = window.ReactDOM;

const phases = [
  { name: "Fase 1", title: "React shell + statisk UI", done: true },
  { name: "Fase 2", title: "Auth", done: true },
  { name: "Fase 3", title: "Plans/Insights/Data", done: true },
  { name: "Fase 4", title: "Fjern legacy app.js-koblinger", done: true },
];

function App() {
  const client = useMemo(() => {
    if (!isSupabaseConfigured() || !window.supabase) return null;
    return window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey);
  }, []);

  const [status, setStatus] = useState(
    client ? "Supabase client is ready." : "Missing Supabase runtime config.",
  );

  async function signInWithGoogle() {
    if (!client) return;
    const { error } = await client.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: getAuthRedirectUrl() },
    });
    setStatus(error ? error.message : "Redirecting to Google…");
  }

  return h(
    "main",
    { className: "container" },
    h("h1", null, "RunSmart strangler migration"),
    h(
      "p",
      null,
      "Vite build uses ",
      h("code", null, `base=${config.baseUrl}`),
      " and deploy target is Vercel (production).",
    ),
    h(
      "section",
      null,
      h("h2", null, "Migreringsfaser"),
      h(
        "ul",
        null,
        ...phases.map((phase) =>
          h(
            "li",
            { key: phase.name },
            h("strong", null, `${phase.name}: `),
            `${phase.title} ${phase.done ? "✅" : "⏳"}`,
          ),
        ),
      ),
    ),
    h(
      "section",
      null,
      h("h2", null, "Auth runtime-config"),
      h(
        "p",
        null,
        h("strong", null, "Redirect URL: "),
        h("code", null, getAuthRedirectUrl()),
      ),
      h(
        "button",
        { id: "google-login", disabled: !client, onClick: signInWithGoogle },
        "Sign in with Google",
      ),
      h("p", { id: "auth-status" }, status),
    ),
  );
}

createRoot(document.getElementById("app")).render(h(App));
