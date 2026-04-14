import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "../../src/components/ui/tabs";

describe("Tabs 3 shared variant", () => {
  it("adds the Tabs 3 class hooks and preserves active state", () => {
    render(
      <Tabs defaultValue="book">
        <TabsList>
          <TabsTrigger value="book">Book</TabsTrigger>
          <TabsTrigger value="gift">Gift</TabsTrigger>
          <TabsTrigger value="heart">Heart</TabsTrigger>
        </TabsList>
        <TabsContent value="book">Book content</TabsContent>
        <TabsContent value="gift">Gift content</TabsContent>
        <TabsContent value="heart">Heart content</TabsContent>
      </Tabs>
    );

    expect(screen.getByRole("tablist")).toHaveClass("tabs-03-list");
    expect(screen.getByRole("tab", { name: "Book" })).toHaveClass("tabs-03-trigger");
    expect(screen.getByRole("tabpanel")).toHaveClass("tabs-03-content");
    expect(screen.getByRole("tab", { name: "Book" })).toHaveAttribute("data-state", "active");
  });
});
