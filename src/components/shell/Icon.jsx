export default function Icon({ name, size = 16, className = "", ...rest }) {
  const props = { width: size, height: size, viewBox: "0 0 24 24", className: `ic ${className}`, ...rest };
  switch (name) {
    case "grid":     return <svg {...props}><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>;
    case "calendar": return <svg {...props}><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 9h18M8 3v4M16 3v4"/></svg>;
    case "chat":     return <svg {...props}><path d="M21 12a8 8 0 1 1-3.1-6.32L21 5l-.9 3.3A8 8 0 0 1 21 12z"/><path d="M8 11h8M8 14h5"/></svg>;
    case "chart":    return <svg {...props}><path d="M3 20h18"/><path d="M6 16l4-5 4 3 5-8"/></svg>;
    case "trophy":   return <svg {...props}><path d="M8 4h8v4a4 4 0 0 1-8 0V4z"/><path d="M8 6H5a2 2 0 0 0 0 4h3M16 6h3a2 2 0 0 1 0 4h-3"/><path d="M10 14h4v3h-4zM8 20h8"/></svg>;
    case "book":     return <svg {...props}><path d="M4 4h10a4 4 0 0 1 4 4v12H8a4 4 0 0 1-4-4V4z"/><path d="M4 16a4 4 0 0 1 4-4h10"/></svg>;
    case "database": return <svg {...props}><ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v6c0 1.7 3.6 3 8 3s8-1.3 8-3V5"/><path d="M4 11v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6"/></svg>;
    case "map":      return <svg {...props}><path d="M9 3 3 6v15l6-3 6 3 6-3V3l-6 3-6-3z"/><path d="M9 3v15M15 6v15"/></svg>;
    case "phone":    return <svg {...props}><rect x="7" y="2" width="10" height="20" rx="2"/><path d="M10 19h4"/></svg>;
    case "search":   return <svg {...props}><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>;
    case "bell":     return <svg {...props}><path d="M6 10a6 6 0 0 1 12 0v4l2 3H4l2-3v-4z"/><path d="M10 21a2 2 0 0 0 4 0"/></svg>;
    case "play":     return <svg {...props}><path d="M8 5v14l11-7z"/></svg>;
    case "share":    return <svg {...props}><path d="M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7"/><path d="M16 6l-4-4-4 4M12 2v14"/></svg>;
    case "sparkle":  return <svg {...props}><path d="M12 3l2 5 5 2-5 2-2 5-2-5-5-2 5-2 2-5z"/><path d="M19 14l.8 2 2 .8-2 .8L19 20l-.8-2-2-.8 2-.8L19 14z"/></svg>;
    case "chevR":    return <svg {...props}><path d="M9 6l6 6-6 6"/></svg>;
    case "chevD":    return <svg {...props}><path d="M6 9l6 6 6-6"/></svg>;
    case "chevU":    return <svg {...props}><path d="M18 15l-6-6-6 6"/></svg>;
    case "arrowUR":  return <svg {...props}><path d="M7 17 17 7M8 7h9v9"/></svg>;
    case "arrowDR":  return <svg {...props}><path d="M7 7l10 10M17 8v9h-9"/></svg>;
    case "mountain": return <svg {...props}><path d="M3 20l6-10 4 6 3-4 5 8H3z"/><circle cx="16" cy="6" r="1.6"/></svg>;
    case "run":      return <svg {...props}><circle cx="16" cy="4.5" r="1.8"/><path d="M7 22l3-6 2-2-1-4 4 2 2 3 4-1"/><path d="m10 14-3 1-2 3"/></svg>;
    case "pin":      return <svg {...props}><path d="M12 21s7-7 7-12a7 7 0 1 0-14 0c0 5 7 12 7 12z"/><circle cx="12" cy="9" r="2.5"/></svg>;
    case "flag":     return <svg {...props}><path d="M5 21V4"/><path d="M5 4h11l-2 4 2 4H5"/></svg>;
    case "heart":    return <svg {...props}><path d="M12 21s-7-4.5-9.5-9A5 5 0 0 1 12 6a5 5 0 0 1 9.5 6C19 16.5 12 21 12 21z"/></svg>;
    case "send":     return <svg {...props}><path d="m4 12 16-8-6 16-3-7-7-1z"/></svg>;
    case "settings": return <svg {...props}><circle cx="12" cy="12" r="3"/><path d="M19 12a7 7 0 0 0-.1-1.3l2-1.5-2-3.5-2.3.8a7 7 0 0 0-2.2-1.3L14 3h-4l-.4 2.2a7 7 0 0 0-2.2 1.3l-2.3-.8-2 3.5 2 1.5a7 7 0 0 0 0 2.6l-2 1.5 2 3.5 2.3-.8a7 7 0 0 0 2.2 1.3L10 21h4l.4-2.2a7 7 0 0 0 2.2-1.3l2.3.8 2-3.5-2-1.5c.07-.43.1-.86.1-1.3z"/></svg>;
    case "filter":   return <svg {...props}><path d="M3 5h18M6 12h12M10 19h4"/></svg>;
    case "check":    return <svg {...props}><path d="M5 12l5 5L20 7"/></svg>;
    case "plus":     return <svg {...props}><path d="M12 5v14M5 12h14"/></svg>;
    case "x":        return <svg {...props}><path d="M6 6l12 12M18 6 6 18"/></svg>;
    default:         return null;
  }
}
