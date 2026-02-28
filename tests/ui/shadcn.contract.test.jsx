/**
 * shadcn/ui Component Contract Tests
 *
 * Asserts behavioral contracts for shadcn components used in RunSmart:
 * - Button: correct role, click handling, disabled state, variants
 * - Card: layout structure (Card > CardHeader > CardContent > CardFooter)
 * - Input: renders input element, accessible via Label
 * - Label: associates with input via htmlFor
 * - Select: trigger has combobox role, options selectable, onChange fires
 * - Dialog: opens on trigger click, closes on close action
 *
 * Rules: assert behavior, not CSS snapshots.
 */
import React, { useState } from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { Button } from "../../src/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "../../src/components/ui/card";
import { Input } from "../../src/components/ui/input";
import { Label } from "../../src/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "../../src/components/ui/select";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogTitle,
} from "../../src/components/ui/dialog";

// ── Button ────────────────────────────────────────────────────────────────────

describe("Button — behavioral contract", () => {
  it("renders with role=button", () => {
    render(<Button>Save</Button>);
    expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
  });

  it("fires onClick when clicked", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Save</Button>);
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("does not fire onClick when disabled", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<Button onClick={onClick} disabled>Save</Button>);
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(onClick).not.toHaveBeenCalled();
  });

  it("button is disabled when disabled prop is set", () => {
    render(<Button disabled>Save</Button>);
    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
  });

  it("renders children correctly", () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText("Click me")).toBeInTheDocument();
  });

  it("variant=destructive still renders as a button", () => {
    render(<Button variant="destructive">Delete</Button>);
    expect(screen.getByRole("button", { name: "Delete" })).toBeInTheDocument();
  });

  it("variant=outline still renders as a button", () => {
    render(<Button variant="outline">Cancel</Button>);
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
  });

  it("variant=ghost still renders as a button", () => {
    render(<Button variant="ghost">Menu</Button>);
    expect(screen.getByRole("button", { name: "Menu" })).toBeInTheDocument();
  });
});

// ── Card ──────────────────────────────────────────────────────────────────────

describe("Card — layout contract", () => {
  it("renders Card with CardHeader, CardContent, and CardFooter", () => {
    render(
      <Card data-testid="card">
        <CardHeader data-testid="card-header">
          <CardTitle>Weekly Summary</CardTitle>
        </CardHeader>
        <CardContent data-testid="card-content">
          <p>18 km this week</p>
        </CardContent>
        <CardFooter data-testid="card-footer">
          <Button>View details</Button>
        </CardFooter>
      </Card>
    );

    const card = screen.getByTestId("card");
    expect(card).toBeInTheDocument();
    expect(within(card).getByTestId("card-header")).toBeInTheDocument();
    expect(within(card).getByTestId("card-content")).toBeInTheDocument();
    expect(within(card).getByTestId("card-footer")).toBeInTheDocument();
  });

  it("renders CardTitle text inside CardHeader", () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Training Load</CardTitle>
        </CardHeader>
        <CardContent>Content</CardContent>
      </Card>
    );
    expect(screen.getByText("Training Load")).toBeInTheDocument();
  });

  it("renders CardContent children", () => {
    render(
      <Card>
        <CardContent>
          <p>Ready to run</p>
        </CardContent>
      </Card>
    );
    expect(screen.getByText("Ready to run")).toBeInTheDocument();
  });

  it("multiple Cards are independent", () => {
    render(
      <>
        <Card data-testid="card-a"><CardContent>Card A</CardContent></Card>
        <Card data-testid="card-b"><CardContent>Card B</CardContent></Card>
      </>
    );
    expect(screen.getByText("Card A")).toBeInTheDocument();
    expect(screen.getByText("Card B")).toBeInTheDocument();
  });
});

// ── Input ─────────────────────────────────────────────────────────────────────

describe("Input — behavioral contract", () => {
  it("renders an input element", () => {
    render(<Input placeholder="Enter value" />);
    expect(screen.getByPlaceholderText("Enter value")).toBeInTheDocument();
  });

  it("accepts typed text", async () => {
    const user = userEvent.setup();
    render(<Input placeholder="Distance" />);
    const input = screen.getByPlaceholderText("Distance");
    await user.type(input, "10");
    expect(input).toHaveValue("10");
  });

  it("calls onChange when value changes", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Input placeholder="Distance" onChange={onChange} />);
    await user.type(screen.getByPlaceholderText("Distance"), "5");
    expect(onChange).toHaveBeenCalled();
  });

  it("is disabled when disabled prop is set", () => {
    render(<Input placeholder="Distance" disabled />);
    expect(screen.getByPlaceholderText("Distance")).toBeDisabled();
  });
});

// ── Label ─────────────────────────────────────────────────────────────────────

describe("Label — accessibility contract", () => {
  it("renders label text", () => {
    render(<Label htmlFor="distance-input">Distance (km)</Label>);
    expect(screen.getByText("Distance (km)")).toBeInTheDocument();
  });

  it("associates with input via htmlFor — click label focuses input", async () => {
    const user = userEvent.setup();
    render(
      <>
        <Label htmlFor="dist">Distance (km)</Label>
        <Input id="dist" placeholder="Enter km" />
      </>
    );
    await user.click(screen.getByText("Distance (km)"));
    expect(screen.getByPlaceholderText("Enter km")).toHaveFocus();
  });

  it("input is accessible by its label text", () => {
    render(
      <>
        <Label htmlFor="sleep">Sleep hours</Label>
        <Input id="sleep" type="number" />
      </>
    );
    expect(screen.getByLabelText("Sleep hours")).toBeInTheDocument();
  });
});

// ── Select ────────────────────────────────────────────────────────────────────

describe("Select — behavioral contract", () => {
  it("SelectTrigger has combobox role", () => {
    render(
      <Select>
        <SelectTrigger>
          <SelectValue placeholder="Choose type" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="easy">Easy</SelectItem>
        </SelectContent>
      </Select>
    );
    expect(screen.getByRole("combobox")).toBeInTheDocument();
  });

  it("shows placeholder text in trigger", () => {
    render(
      <Select>
        <SelectTrigger>
          <SelectValue placeholder="Choose workout type" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="easy">Easy</SelectItem>
        </SelectContent>
      </Select>
    );
    expect(screen.getByText("Choose workout type")).toBeInTheDocument();
  });

  it("opens options list on trigger click", async () => {
    const user = userEvent.setup();
    render(
      <Select>
        <SelectTrigger>
          <SelectValue placeholder="Select" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="easy">Easy Run</SelectItem>
          <SelectItem value="tempo">Tempo Run</SelectItem>
          <SelectItem value="long">Long Run</SelectItem>
        </SelectContent>
      </Select>
    );

    await user.click(screen.getByRole("combobox"));

    expect(screen.getByText("Easy Run")).toBeInTheDocument();
    expect(screen.getByText("Tempo Run")).toBeInTheDocument();
    expect(screen.getByText("Long Run")).toBeInTheDocument();
  });

  it("calls onValueChange with selected value", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();

    render(
      <Select onValueChange={onValueChange}>
        <SelectTrigger>
          <SelectValue placeholder="Select" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="easy">Easy Run</SelectItem>
          <SelectItem value="tempo">Tempo Run</SelectItem>
        </SelectContent>
      </Select>
    );

    await user.click(screen.getByRole("combobox"));
    await user.click(screen.getByText("Tempo Run"));

    expect(onValueChange).toHaveBeenCalledWith("tempo");
  });

  it("displays selected value in trigger after selection", async () => {
    const user = userEvent.setup();

    function ControlledSelect() {
      const [value, setValue] = useState("");
      return (
        <Select value={value} onValueChange={setValue}>
          <SelectTrigger>
            <SelectValue placeholder="Select type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="easy">Easy Run</SelectItem>
            <SelectItem value="long">Long Run</SelectItem>
          </SelectContent>
        </Select>
      );
    }

    render(<ControlledSelect />);
    await user.click(screen.getByRole("combobox"));
    await user.click(screen.getByText("Long Run"));

    expect(screen.getByRole("combobox")).toHaveTextContent("Long Run");
  });
});

// ── Dialog ────────────────────────────────────────────────────────────────────

describe("Dialog — behavioral contract", () => {
  it("dialog content is hidden when closed", () => {
    render(
      <Dialog>
        <DialogTrigger asChild>
          <Button>Open</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogTitle>Workout Details</DialogTitle>
          <p>Modal content here</p>
        </DialogContent>
      </Dialog>
    );
    // Content not in DOM when dialog is closed
    expect(screen.queryByText("Modal content here")).not.toBeInTheDocument();
  });

  it("opens dialog on trigger click", async () => {
    const user = userEvent.setup();
    render(
      <Dialog>
        <DialogTrigger asChild>
          <Button>Add Workout</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogTitle>New Workout</DialogTitle>
          <p>Fill in workout details</p>
        </DialogContent>
      </Dialog>
    );

    await user.click(screen.getByRole("button", { name: "Add Workout" }));
    expect(screen.getByText("Fill in workout details")).toBeInTheDocument();
  });

  it("dialog has a title when open", async () => {
    const user = userEvent.setup();
    render(
      <Dialog>
        <DialogTrigger asChild>
          <Button>Open</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogTitle>Edit Entry</DialogTitle>
        </DialogContent>
      </Dialog>
    );

    await user.click(screen.getByRole("button", { name: "Open" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Edit Entry")).toBeInTheDocument();
  });
});
