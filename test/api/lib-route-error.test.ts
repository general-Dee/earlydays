import { NextRequest, NextResponse } from "next/server";
import { describe, expect, it, vi } from "vitest";
import { handleRouteError, withRouteErrorHandling } from "@/lib/api/errors";

function request() {
  return new NextRequest("http://localhost/api/test");
}

describe("handleRouteError", () => {
  it("logs the error and returns a generic 500 by default", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const err = new Error("boom");

    const res = handleRouteError(err, "GET /api/test");
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json).toEqual({ error: "Something went wrong. Please try again." });
    expect(consoleSpy).toHaveBeenCalledWith("[api] GET /api/test failed", err);

    consoleSpy.mockRestore();
  });

  it("honors a status/message override", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const res = handleRouteError(new Error("upstream down"), "POST /api/test", {
      status: 502,
      message: "Could not reach upstream",
    });
    const json = await res.json();

    expect(res.status).toBe(502);
    expect(json).toEqual({ error: "Could not reach upstream" });

    consoleSpy.mockRestore();
  });
});

describe("withRouteErrorHandling", () => {
  it("passes a successful handler's response through unchanged", async () => {
    const handler = withRouteErrorHandling("GET /api/test", async () =>
      NextResponse.json({ ok: true }, { status: 200 })
    );

    const res = await handler(request());
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toEqual({ ok: true });
  });

  it("catches a thrown error and returns the generic 500 shape", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const handler = withRouteErrorHandling("GET /api/test", async () => {
      throw new Error("Firestore is down");
    });

    const res = await handler(request());
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json).toEqual({ error: "Something went wrong. Please try again." });
    expect(consoleSpy).toHaveBeenCalled();

    consoleSpy.mockRestore();
  });

  it("passes dynamic-route context through to the wrapped handler", async () => {
    const handler = withRouteErrorHandling<{ params: { id: string } }>(
      "DELETE /api/test/[id]",
      async (req, { params }) => NextResponse.json({ id: params.id })
    );

    const res = await handler(request(), { params: { id: "a1" } });
    const json = await res.json();

    expect(json).toEqual({ id: "a1" });
  });
});
