import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { ItemImage } from "@/components/gram/item-image.client";

describe("ItemImage", () => {
  it("shows the image with its text alternative", () => {
    render(<ItemImage src="https://media.test/a/1/thumbnail/1/s" alt="Finalen" />);

    expect(screen.getByRole("img", { name: "Finalen" })).toHaveAttribute("src", "https://media.test/a/1/thumbnail/1/s");
  });

  it("says when Immich is processing the item or failed with it", () => {
    const { rerender } = render(<ItemImage src="x" alt="Finalen" status="PROCESSING" />);

    expect(screen.getByRole("img", { name: "Finalen (processing)" })).toBeInTheDocument();
    rerender(<ItemImage src="x" alt="Finalen" status="FAILED" />);
    expect(screen.getByRole("img", { name: "Finalen (failed)" })).toBeInTheDocument();
  });

  it("falls back to a placeholder when the image cannot be loaded, e.g. Immich is down", () => {
    render(<ItemImage src="https://media.test/a/1/thumbnail/1/s" alt="Finalen" />);
    fireEvent.error(screen.getByRole("img", { name: "Finalen" }));

    expect(screen.getByRole("img", { name: "Finalen (unavailable)" })).toBeInTheDocument();
  });
});
