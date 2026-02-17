export function Input(name, opts = {}) {
  const type = opts.type || "text";
  const placeholder = opts.placeholder || "";
  return `<input class="ui-input" name="${name}" type="${type}" placeholder="${placeholder}" />`;
}
