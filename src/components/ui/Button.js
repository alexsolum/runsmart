export function Button(label, opts = {}) {
  const variant = opts.variant || "primary";
  const disabled = opts.disabled ? " disabled" : "";
  const loading = opts.loading ? ' data-loading="true"' : "";
  return `<button class="ui-button ui-button--${variant}"${disabled}${loading}>${label}</button>`;
}
