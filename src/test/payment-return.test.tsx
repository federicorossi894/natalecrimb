import { act, fireEvent, render, screen, cleanup } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { CAMPAIGN, campaignCapabilities } from "@/lib/campaign";
import { Route } from "@/routes/pagamento";
const mocks = vi.hoisted(() => ({
  check: vi.fn(),
  details: vi.fn(),
  dedicate: vi.fn(),
  search: {
    id: "00000000-0000-4000-8000-000000000001",
    annullato: undefined as number | undefined,
  },
}));
vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (options: unknown) => ({ options, useSearch: () => mocks.search }),
  Link: ({ children }: { children: React.ReactNode }) => <a>{children}</a>,
}));
vi.mock("@tanstack/react-start", () => ({ useServerFn: (fn: unknown) => fn }));
vi.mock("@/lib/payments.functions", () => ({
  checkDonationPayment: mocks.check,
  paidDonationDetails: mocks.details,
  updatePaidDedication: mocks.dedicate,
}));
vi.mock("@/lib/payment-device", () => ({
  loadDonationAccess: (id: string) => ({ id, accessToken: "test-only" }),
}));
vi.mock("@/components/xmas/Shell", () => ({
  Shell: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock("@/components/xmas/PostDonation", () => ({
  PostcardStudio: ({ ornamentId }: { ornamentId: string }) => (
    <output aria-label="private postcard">{ornamentId}</output>
  ),
}));
vi.mock('@/components/xmas/PaidGiftEmail', () => ({ PaidGiftEmail: () => null }));
const Component = (Route.options as unknown as { component: () => React.ReactNode }).component;
const original = { ...CAMPAIGN };
beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  mocks.search.annullato = undefined;
  mocks.check.mockResolvedValue({ status: "paid", ornamentId: "ornament-once" });
  mocks.details.mockResolvedValue({ id: "ornament-once", kind: "calore" });
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  Object.assign(CAMPAIGN, original);
});
it("DEMO return never checks providers or offers a paid postcard", async () => {
  Object.assign(CAMPAIGN, campaignCapabilities("DEMO"));
  render(<Component />);
  await act(async () => {
    await vi.advanceTimersByTimeAsync(30000);
  });
  expect(mocks.check).not.toHaveBeenCalled();
  expect(mocks.details).not.toHaveBeenCalled();
  expect(screen.queryByRole("button", { name: "Prepara cartolina WhatsApp" })).toBeNull();
});
it.each(["BASIC", "ADVANCED_1", "ADVANCED_2"] as const)(
  "%s paid return stops polling and links local postcard to confirmed ornament",
  async (mode) => {
    Object.assign(CAMPAIGN, campaignCapabilities(mode));
    CAMPAIGN.livePayments = true;
    render(<Component />);
    await act(async () => {
      await Promise.resolve();
    });
    expect(mocks.check).toHaveBeenCalledTimes(1);
    expect(mocks.details).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: "Prepara cartolina WhatsApp" }));
    expect(screen.getByLabelText("private postcard")).toHaveTextContent("ornament-once");
    await act(async () => {
      await vi.advanceTimersByTimeAsync(45000);
    });
    expect(mocks.check).toHaveBeenCalledTimes(1);
  },
);
it("browser cancel is not proof of failure and never authorizes capture", async () => {
  Object.assign(CAMPAIGN, campaignCapabilities("BASIC"));
  CAMPAIGN.livePayments = true;
  mocks.search.annullato = 1;
  mocks.check.mockResolvedValue({ status: "pending", ornamentId: null });
  render(<Component />);
  await act(async () => {
    await Promise.resolve();
  });
  expect(mocks.check).toHaveBeenCalledWith({ data: expect.objectContaining({ capture: false }) });
  expect(mocks.details).not.toHaveBeenCalled();
  expect(screen.queryByRole("button", { name: "Prepara cartolina WhatsApp" })).toBeNull();
});
