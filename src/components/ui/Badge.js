export function Badge(text, tone = "neutral") {
  return `<span class="ui-badge ui-badge--${tone}">${text}</span>`;
}
