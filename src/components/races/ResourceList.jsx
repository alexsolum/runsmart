import React from "react";
import ResourceItem from "./ResourceItem";
import { Button } from "../ui/button";
import { Plus } from "lucide-react";
import { useI18n } from "../../i18n/translations";

const TYPE_ORDER = ["race_page", "course_map", "registration", "blog", "video", "other"];
const TYPE_LABELS = {
  race_page: "Official",
  course_map: "Course Maps",
  blog: "Blog Posts",
  video: "Video",
  registration: "Registration",
  other: "Other",
};

export default function ResourceList({ resources, onAdd, onDelete }) {
  const { t } = useI18n();

  const grouped = TYPE_ORDER
    .map((type) => ({
      type,
      label: TYPE_LABELS[type],
      items: resources.filter((r) => r.type === type),
    }))
    .filter((group) => group.items.length > 0);

  return (
    <div className="flex flex-col gap-5">
      {grouped.map((group) => (
        <div key={group.type}>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2 pl-1">
            {group.label}
          </p>
          <div className="flex flex-col gap-2">
            {group.items.map((resource) => (
              <ResourceItem key={resource.id} resource={resource} onDelete={onDelete} />
            ))}
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={onAdd}
        className="flex items-center justify-center gap-2 p-3 border-2 border-dashed border-slate-300 rounded-lg text-slate-500 text-sm font-medium hover:border-slate-400 hover:text-slate-600 transition-colors"
      >
        <Plus size={16} />
        {t("races.addResource")}
      </button>
    </div>
  );
}
