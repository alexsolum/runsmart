import React, { useMemo } from "react";

export default function HtmlSection({ html, activatePage = false }) {
  const resolvedHtml = useMemo(() => {
    if (!activatePage || !html) return html;
    return html.replace(/class="page(?![^"]*\bactive\b)/, 'class="page active');
  }, [html, activatePage]);

  return <div dangerouslySetInnerHTML={{ __html: resolvedHtml }} />;
}
