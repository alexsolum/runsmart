export function Select(name, options = []) {
  const items = options
    .map((opt) => `<option value="${opt.value}">${opt.label}</option>`)
    .join("");
  return `<select class="ui-select" name="${name}">${items}</select>`;
}
