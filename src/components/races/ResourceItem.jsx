import React from "react";
import { ExternalLink, Trash2 } from "lucide-react";

const TYPE_ICONS = {
  race_page: "🌐",
  course_map: "🗺️",
  blog: "📝",
  video: "🎥",
  registration: "📋",
  other: "🔗",
};

const TYPE_COLORS = {
  race_page: "bg-blue-100",
  course_map: "bg-green-100",
  blog: "bg-yellow-100",
  video: "bg-pink-100",
  registration: "bg-purple-100",
  other: "bg-slate-100",
};

export default function ResourceItem({ resource, onDelete }) {
  const icon = TYPE_ICONS[resource.type] || TYPE_ICONS.other;
  const color = TYPE_COLORS[resource.type] || TYPE_COLORS.other;

  return (
    <div className="flex items-center gap-3 p-3 border border-slate-200 rounded-lg bg-white hover:bg-slate-50 transition-colors group">
      <div className={`w-9 h-9 rounded-lg ${color} flex items-center justify-center text-base flex-shrink-0`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <a
          href={resource.url}
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-sm text-slate-900 hover:text-blue-600 transition-colors"
        >
          {resource.title || resource.url}
        </a>
        <div className="text-xs text-slate-400 truncate">{resource.url}</div>
      </div>
      <a
        href={resource.url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-slate-400 hover:text-slate-600 flex-shrink-0"
      >
        <ExternalLink size={16} />
      </a>
      {onDelete && (
        <button
          type="button"
          onClick={() => onDelete(resource.id)}
          className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
        >
          <Trash2 size={14} />
        </button>
      )}
    </div>
  );
}
