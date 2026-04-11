import React from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "../ui/accordion";
import { Badge } from "../ui/badge";
import { Separator } from "../ui/separator";
import ParticipationItem from "./ParticipationItem";

function parseFinishTime(timeStr) {
  if (!timeStr) return null;
  const cleaned = timeStr.replace(/^0+(?=\d{2}:)/, "");
  return cleaned;
}

function findPRIndex(participations) {
  let bestIdx = -1;
  let bestTime = null;
  participations.forEach((p, i) => {
    if (!p.finish_time) return;
    const str = String(p.finish_time);
    if (bestTime === null || str < bestTime) {
      bestTime = str;
      bestIdx = i;
    }
  });
  return bestIdx;
}

export default function ParticipationAccordion({ participations }) {
  const sorted = [...participations].sort(
    (a, b) => new Date(b.race_date) - new Date(a.race_date)
  );

  const prIndex = findPRIndex(sorted);

  return (
    <Accordion type="single" collapsible className="flex flex-col gap-3">
      {sorted.map((p, idx) => {
        const isPR = idx === prIndex && participations.length > 1;
        const dateLabel = new Date(p.race_date).toLocaleDateString("en-US", {
          month: "long",
          year: "numeric",
        });
        const timeDisplay = parseFinishTime(p.finish_time);

        return (
          <AccordionItem
            key={p.id}
            value={p.id}
            className="border border-slate-200 rounded-lg bg-white overflow-hidden"
          >
            <AccordionTrigger className="px-4 py-3 hover:no-underline">
              <div className="flex items-center gap-3 w-full">
                <div
                  className={`w-2 h-2 rounded-full flex-shrink-0 ${
                    idx === 0 ? "bg-blue-500" : "bg-blue-200"
                  }`}
                />
                <div className="flex-1 text-left">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm">{dateLabel}</span>
                    {isPR && (
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs">
                        PR 🏆
                      </Badge>
                    )}
                  </div>
                  {timeDisplay && (
                    <div className="text-xs text-slate-500 mt-0.5">
                      {timeDisplay} finish
                    </div>
                  )}
                </div>
              </div>
            </AccordionTrigger>
            <Separator />
            <AccordionContent>
              <ParticipationItem participation={p} isPR={isPR} />
            </AccordionContent>
          </AccordionItem>
        );
      })}
    </Accordion>
  );
}
