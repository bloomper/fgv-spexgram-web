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

  it("shows Immich's thumbhash blurred until the image has loaded", () => {
    const { container } = render(<ItemImage src="https://media.test/a/1/thumbnail/1/s" alt="Finalen" thumbhash="1QcSHQRnh493V4dIh4eXh1h4kJUI" />);
    const image = screen.getByRole("img", { name: "Finalen" });

    expect((container.firstChild as HTMLElement).style.backgroundImage).toMatch(/^url\("?data:image\/png/);
    expect(image).toHaveClass("opacity-0");
    fireEvent.load(image);
    expect(image).not.toHaveClass("opacity-0");
  });
});
