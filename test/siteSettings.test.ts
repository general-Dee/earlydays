import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const collection = vi.fn();
const doc = vi.fn();
const get = vi.fn();

vi.mock("@/lib/firebase/admin", () => ({
  getAdminDb: () => ({ collection }),
}));

beforeEach(() => {
  vi.clearAllMocks();
  collection.mockImplementation(() => ({ doc }));
  doc.mockImplementation(() => ({ get }));
});

afterEach(() => {
  vi.resetModules();
});

describe("getSiteSettings", () => {
  it("returns the live settings merged over defaults when the doc exists", async () => {
    get.mockResolvedValue({ exists: true, data: () => ({ whatsapp: "+1234567890" }) });

    const { getSiteSettings, defaultSiteSettings } = await import("@/lib/siteSettings");
    const settings = await getSiteSettings();

    expect(settings).toEqual({ ...defaultSiteSettings(), whatsapp: "+1234567890" });
    expect(collection).toHaveBeenCalledWith("settings");
    expect(doc).toHaveBeenCalledWith("site");
  });

  it("returns defaults when the doc doesn't exist", async () => {
    get.mockResolvedValue({ exists: false });

    const { getSiteSettings, defaultSiteSettings } = await import("@/lib/siteSettings");
    const settings = await getSiteSettings();

    expect(settings).toEqual(defaultSiteSettings());
  });

  it("falls back to defaults when the live read fails", async () => {
    get.mockRejectedValue(new Error("Firestore unreachable"));
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const { getSiteSettings, defaultSiteSettings } = await import("@/lib/siteSettings");
    const settings = await getSiteSettings();

    expect(settings).toEqual(defaultSiteSettings());
    consoleSpy.mockRestore();
  });
});
