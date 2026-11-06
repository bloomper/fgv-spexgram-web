import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { LoginPrompt } from "@/components/login-prompt.client";

vi.mock("next/navigation", () => ({
  usePathname: () => "/albums/a1",
  useSearchParams: () => new URLSearchParams("x=1"),
}));

describe("LoginPrompt", () => {
  it("asks visitors to log in and come back to the page, without saying whether it exists", () => {
    render(<LoginPrompt />);

    expect(screen.getByRole("heading", { name: "title" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "login" })).toHaveAttribute("href", "/api/auth/login?returnTo=%2Falbums%2Fa1%3Fx%3D1");
  });

  it("tells someone logged in without access that it cannot be shown, with no login link", () => {
    render(<LoginPrompt noAccess />);

    expect(screen.getByRole("heading", { name: "noAccessTitle" })).toBeInTheDocument();
    expect(screen.queryByRole("link")).toBeNull();
  });
});
