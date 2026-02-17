export function StatTile(label, value, tone = "default") {
  return `<div class="stat-tile stat-tile--${tone}"><span>${label}</span><strong>${value}</strong></div>`;
}
