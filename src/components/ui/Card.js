export function Card(content, opts = {}) {
  const tone = opts.tone ? ` ui-card--${opts.tone}` : "";
  return `<article class="ui-card${tone}">${content}</article>`;
}
