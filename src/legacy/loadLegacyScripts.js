const externalScripts = [
  "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2",
  "https://cdn.plot.ly/plotly-2.35.2.min.js",
];

const localScripts = ["/lang.js", "/compute.js", "/config.js", "/app.js"];

function appendScript(src) {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      if (existing.dataset.loaded === "true") return resolve();
      existing.addEventListener("load", resolve, { once: true });
      existing.addEventListener("error", reject, { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = src;
    script.async = false;
    script.addEventListener("load", () => {
      script.dataset.loaded = "true";
      resolve();
    });
    script.addEventListener("error", reject);
    document.body.appendChild(script);
  });
}

export async function loadLegacyScripts() {
  for (const src of externalScripts) {
    await appendScript(src);
  }

  for (const src of localScripts) {
    await appendScript(src);
  }
}
