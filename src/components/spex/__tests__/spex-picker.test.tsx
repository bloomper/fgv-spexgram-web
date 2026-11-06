import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { type PickedSpex, SpexPicker } from "@/components/spex/spex-picker.client";

const searchSpexAction = vi.hoisted(() => vi.fn());

vi.mock("@/app/(app)/manage/actions.server", () => ({ searchSpexAction }));
vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));

const NOBEL = { id: "6", title: "Nobel", year: 1975, revival: false, parentId: null, categoryName: "Chalmersspexet" };
const NOBEL_REVIVAL = {
  id: "7",
  title: "Nobel",
  year: 1992,
  revival: true,
  parentId: "6",
  categoryName: "Chalmersspexet",
};
const LONELY_REVIVAL = {
  id: "9",
  title: "Fritiof",
  year: 2001,
  revival: true,
  parentId: "missing",
  categoryName: null,
};

function Picker({ initial = [] }: { initial?: PickedSpex[] }) {
  const [value, setValue] = useState(initial);
  const [none, setNone] = useState(false);

  return <SpexPicker value={value} onChange={setValue} none={none} onNoneChange={setNone} />;
}

describe("SpexPicker", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    searchSpexAction.mockResolvedValue({ ok: true, data: [NOBEL, NOBEL_REVIVAL, LONELY_REVIVAL] });
  });

  it("shows revivals indented under their original and the picked ones as picked", async () => {
    render(<Picker initial={[NOBEL]} />);

    await userEvent.type(screen.getByLabelText("searchMore"), "No");
    const results = await screen.findByRole("list", { name: "results" });
    const [original, revival, lonely] = within(results).getAllByRole("button");

    expect(original).toBeDisabled();
    expect(original).toHaveTextContent("alreadyPicked");
    expect(revival.querySelector("svg")).not.toBeNull();
    expect(revival).toHaveTextContent("(revival)");
    expect(lonely.querySelector("svg")).toBeNull();
  });

  it("removes a spex, and marking no spex clears them all", async () => {
    render(<Picker initial={[NOBEL, NOBEL_REVIVAL]} />);

    expect(screen.getByText("mainHint")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /removeOf.*Nobel 1975/ }));
    expect(within(screen.getByRole("list", { name: "picked" })).getAllByRole("listitem")).toHaveLength(1);
    expect(screen.queryByText("main")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("checkbox", { name: "none" }));
    expect(screen.queryByRole("list", { name: "picked" })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("checkbox", { name: "none" }));
    expect(screen.getByLabelText("search")).toBeInTheDocument();
    expect(screen.queryByRole("list", { name: "picked" })).not.toBeInTheDocument();
  });
});
