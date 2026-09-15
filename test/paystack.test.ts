import { afterEach, describe, expect, it, vi } from "vitest";
import { verifyPaystackTransaction } from "@/lib/paystack";

afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.PAYSTACK_SECRET_KEY;
});

describe("verifyPaystackTransaction", () => {
  it("throws when PAYSTACK_SECRET_KEY isn't configured", async () => {
    await expect(verifyPaystackTransaction("edy_1")).rejects.toThrow("Payments aren't configured yet");
  });

  it("propagates a network failure", async () => {
    process.env.PAYSTACK_SECRET_KEY = "sk_test";
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));

    await expect(verifyPaystackTransaction("edy_1")).rejects.toThrow("network down");
  });

  it("returns the parsed transaction details on a successful verify", async () => {
    process.env.PAYSTACK_SECRET_KEY = "sk_test";
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        status: true,
        data: { status: "success", amount: 6_000_000, channel: "card" },
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await verifyPaystackTransaction("edy_1");

    expect(result).toEqual({ ok: true, status: "success", amountKobo: 6_000_000, channel: "card" });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.paystack.co/transaction/verify/edy_1",
      expect.objectContaining({ headers: { Authorization: "Bearer sk_test" } })
    );
  });

  it("URL-encodes the reference", async () => {
    process.env.PAYSTACK_SECRET_KEY = "sk_test";
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ status: true, data: {} }) });
    vi.stubGlobal("fetch", fetchMock);

    await verifyPaystackTransaction("edy/1 2");

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.paystack.co/transaction/verify/edy%2F1%202",
      expect.anything()
    );
  });

  it("reports ok:false when Paystack's own status flag is false", async () => {
    process.env.PAYSTACK_SECRET_KEY = "sk_test";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ status: false, message: "Transaction not found" }) })
    );

    const result = await verifyPaystackTransaction("edy_missing");

    expect(result.ok).toBe(false);
    expect(result.status).toBe("");
  });

  it("reports ok:false on a non-2xx HTTP response", async () => {
    process.env.PAYSTACK_SECRET_KEY = "sk_test";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, json: async () => ({ status: true, data: {} }) }));

    const result = await verifyPaystackTransaction("edy_1");

    expect(result.ok).toBe(false);
  });
});
