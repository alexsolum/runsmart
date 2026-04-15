import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { BookIcon, GiftIcon, HeartIcon } from "lucide-react";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "../../src/components/ui/tabs";

describe("Tabs 3 shared variant", () => {
  it("adds the Tabs 3 class hooks and preserves the rounded pill treatment for icon tabs", () => {
    render(
      <Tabs defaultValue="book">
        <TabsList>
          <TabsTrigger value="book">
            <BookIcon aria-hidden="true" />
            <span>Book</span>
          </TabsTrigger>
          <TabsTrigger value="gift">
            <GiftIcon aria-hidden="true" />
            <span>Gift</span>
          </TabsTrigger>
          <TabsTrigger value="heart">
            <HeartIcon aria-hidden="true" />
            <span>Heart</span>
          </TabsTrigger>
        </TabsList>
        <TabsContent value="book">Book content</TabsContent>
        <TabsContent value="gift">Gift content</TabsContent>
        <TabsContent value="heart">Heart content</TabsContent>
      </Tabs>
    );

    expect(screen.getByRole("tablist")).toHaveClass("tabs-03-list", "rounded-2xl");
    expect(screen.getByRole("tab", { name: "Book" })).toHaveClass("tabs-03-trigger", "rounded-xl");
    expect(screen.getByRole("tab", { name: "Gift" })).toHaveClass("text-slate-200");
    expect(screen.getByRole("tabpanel")).toHaveClass("tabs-03-content");
    expect(screen.getByRole("tab", { name: "Book" })).toHaveAttribute("data-state", "active");
  });
});
