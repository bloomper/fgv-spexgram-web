import "@testing-library/jest-dom/vitest";
import { afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";
import { MockIntersectionObserver } from "./src/components/gram/__tests__/mock-intersection-observer";

afterEach(() => {
  cleanup();
});

vi.mock("next-intl", () => ({
  useTranslations: () => Object.assign(
    (key: string, values?: Record<string, unknown>) => (values ? `${key}:${JSON.stringify(values)}` : key),
    { has: () => false },
  ),
  useLocale: () => "sv",
}));

vi.mock("@/auth", () => ({
  auth: { api: { getSession: vi.fn(), getAccessToken: vi.fn() } },
}));

vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);

// jsdom ships no ResizeObserver, which Base UI's popups construct on mount.
class MockResizeObserver implements ResizeObserver {
  observe = () => {
  };
  unobserve = () => {
  };
  disconnect = () => {
  };
}

vi.stubGlobal("ResizeObserver", MockResizeObserver);

// Menus scroll the highlighted item into view. jsdom has no layout, so this is a no-op.
Element.prototype.scrollIntoView = vi.fn();

// Base UI waits out running animations before it unmounts a popup. jsdom has no Web Animations API.
Element.prototype.getAnimations = vi.fn(() => []);

vi.stubGlobal(
  "matchMedia",
  vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
);
