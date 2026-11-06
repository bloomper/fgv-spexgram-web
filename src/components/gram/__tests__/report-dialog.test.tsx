import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ReportDialog } from "@/components/gram/report-dialog.client";

const reportAction = vi.hoisted(() => vi.fn());

vi.mock("@/app/(app)/actions.server", () => ({ reportAction }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/components/gram/turnstile.client", () => ({
  Turnstile: ({ onToken }: { onToken: (token: string) => void }) =>
    <button type="button" onClick={() => onToken("token-1")}>pass turnstile</button>,
}));

describe("ReportDialog", () => {
  beforeEach(() => {
    reportAction.mockReset().mockResolvedValue({ ok: true, data: null });
  });

  it("lets a member report with a reason and a message", async () => {
    const onOpenChange = vi.fn();

    render(<ReportDialog itemId="i1" open onOpenChange={onOpenChange} viewer={{ visitor: false, turnstileSiteKey: null }} />);
    await userEvent.click(screen.getByLabelText("reasons.OTHER"));
    await userEvent.type(screen.getByLabelText("message"), "Fel år");
    await userEvent.click(screen.getByRole("button", { name: "send" }));

    await waitFor(() => expect(reportAction).toHaveBeenCalledWith({
      itemId: "i1", reason: "OTHER", message: "Fel år", email: undefined, turnstileToken: undefined,
    }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("needs an email address and Turnstile's token from a visitor", async () => {
    render(<ReportDialog itemId="i1" open onOpenChange={vi.fn()} viewer={{ visitor: true, turnstileSiteKey: "key" }} />);
    await userEvent.click(screen.getByLabelText("reasons.I_AM_IN_IT"));
    expect(screen.getByText("hiddenAtOnce")).toBeInTheDocument();

    const send = screen.getByRole("button", { name: "send" });

    await userEvent.type(screen.getByLabelText("email"), "besok@example.org");
    expect(send).toBeDisabled();
    await userEvent.click(screen.getByRole("button", { name: "pass turnstile" }));
    expect(send).toBeEnabled();
    await userEvent.click(send);

    await waitFor(() => expect(reportAction).toHaveBeenCalledWith(expect.objectContaining({
      reason: "I_AM_IN_IT", email: "besok@example.org", turnstileToken: "token-1",
    })));
  });
});
