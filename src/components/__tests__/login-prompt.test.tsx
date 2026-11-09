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

    expect(screen.getByRole("heading", { name: "content.title" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "login" })).toHaveAttribute("href", "/api/auth/login?returnTo=%2Falbums%2Fa1%3Fx%3D1");
  });

  it("tells someone logged in without access that it cannot be shown, with no login link", () => {
    render(<LoginPrompt noAccess />);

    expect(screen.getByRole("heading", { name: "content.noAccessTitle" })).toBeInTheDocument();
    expect(screen.queryByRole("link")).toBeNull();
  });

  it("says a members' page is for members, to visitors and to someone logged in without access", () => {
    const { unmount } = render(<LoginPrompt kind="page" />);
    expect(screen.getByRole("heading", { name: "page.title" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "login" })).toBeInTheDocument();
    unmount();

    render(<LoginPrompt kind="page" noAccess />);
    expect(screen.getByRole("heading", { name: "page.noAccessTitle" })).toBeInTheDocument();
    expect(screen.queryByRole("link")).toBeNull();
  });
});
