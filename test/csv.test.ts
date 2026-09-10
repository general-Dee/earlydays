import { afterEach, describe, expect, it, vi } from "vitest";
import { downloadCsv, escapeCsvField, toCsv } from "@/lib/csv";

describe("escapeCsvField", () => {
  it("passes through a plain value unchanged", () => {
    expect(escapeCsvField("Aisha")).toBe("Aisha");
  });

  it("passes through an empty string unchanged", () => {
    expect(escapeCsvField("")).toBe("");
  });

  it("wraps a value containing a comma in quotes", () => {
    expect(escapeCsvField("Kaduna, Nigeria")).toBe('"Kaduna, Nigeria"');
  });

  it("wraps a value containing a newline in quotes", () => {
    expect(escapeCsvField("line one\nline two")).toBe('"line one\nline two"');
  });

  it("wraps a value containing a double quote in quotes and doubles it", () => {
    expect(escapeCsvField('She said "hi"')).toBe('"She said ""hi"""');
  });

  it("handles a value with multiple special characters together", () => {
    expect(escapeCsvField('a, "b"\nc')).toBe('"a, ""b""\nc"');
  });
});

describe("toCsv", () => {
  it("joins headers and rows with commas within a line and newlines between lines", () => {
    const csv = toCsv(
      ["Name", "Email"],
      [
        ["Aisha", "aisha@example.com"],
        ["Bola", "bola@example.com"],
      ]
    );
    expect(csv).toBe("Name,Email\nAisha,aisha@example.com\nBola,bola@example.com");
  });

  it("escapes cells that need it while leaving others as-is", () => {
    const csv = toCsv(["Name", "Note"], [["Aisha", "Loves, cake"]]);
    expect(csv).toBe('Name,Note\nAisha,"Loves, cake"');
  });

  it("produces just the header line when rows is empty", () => {
    expect(toCsv(["Name", "Email"], [])).toBe("Name,Email");
  });
});

describe("downloadCsv", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("builds a CSV blob, names the download, clicks it, and cleans up", () => {
    let capturedParts: BlobPart[] = [];
    let capturedOptions: BlobPropertyBag | undefined;
    const RealBlob = globalThis.Blob;
    vi.stubGlobal(
      "Blob",
      vi.fn((parts: BlobPart[], options?: BlobPropertyBag) => {
        capturedParts = parts;
        capturedOptions = options;
        return new RealBlob(parts, options);
      })
    );
    URL.createObjectURL = vi.fn(() => "blob:fake-url");
    const revokeObjectURL = vi.fn();
    URL.revokeObjectURL = revokeObjectURL;

    const link = document.createElement("a");
    const clickSpy = vi.spyOn(link, "click").mockImplementation(() => {});
    const createElementSpy = vi.spyOn(document, "createElement").mockReturnValue(link);

    downloadCsv("subscribers", "Email\nparent@example.com");

    expect(capturedParts).toEqual(["Email\nparent@example.com"]);
    expect(capturedOptions).toEqual({ type: "text/csv;charset=utf-8" });
    expect(link.download).toMatch(/^subscribers-\d{4}-\d{2}-\d{2}\.csv$/);
    expect(clickSpy).toHaveBeenCalled();
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:fake-url");

    createElementSpy.mockRestore();
  });
});
