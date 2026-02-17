export function Textarea(name, opts = {}) {
  const rows = opts.rows || 3;
  const placeholder = opts.placeholder || "";
  return `<textarea class="ui-textarea" name="${name}" rows="${rows}" placeholder="${placeholder}"></textarea>`;
}
