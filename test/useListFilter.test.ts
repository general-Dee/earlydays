import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useListFilter } from "@/lib/useListFilter";

type Item = { id: number; name: string };

function items(count: number): Item[] {
  return Array.from({ length: count }, (_, i) => ({ id: i + 1, name: `Item ${i + 1}` }));
}

const getSearchText = (item: Item) => item.name;

describe("useListFilter", () => {
  it("returns everything when there's no query", () => {
    const { result } = renderHook(() => useListFilter(items(3), getSearchText));
    expect(result.current.filtered).toHaveLength(3);
    expect(result.current.paged).toHaveLength(3);
  });

  it("narrows filtered and paged by a case-insensitive substring match", () => {
    const data = [{ id: 1, name: "Aisha Okafor" }, { id: 2, name: "Femi Bello" }];
    const { result } = renderHook(() => useListFilter(data, getSearchText));

    act(() => result.current.setQuery("okafor"));

    expect(result.current.filtered).toEqual([{ id: 1, name: "Aisha Okafor" }]);
    expect(result.current.paged).toEqual([{ id: 1, name: "Aisha Okafor" }]);
  });

  it("paginates at the page size boundary", () => {
    const { result } = renderHook(() => useListFilter(items(25), getSearchText, 10));

    expect(result.current.totalPages).toBe(3);
    expect(result.current.paged).toHaveLength(10);
    expect(result.current.paged[0].name).toBe("Item 1");

    act(() => result.current.setPage(3));
    expect(result.current.paged).toHaveLength(5);
    expect(result.current.paged[0].name).toBe("Item 21");
  });

  it("clamps the page when a narrower search shrinks totalPages", () => {
    const { result } = renderHook(() => useListFilter(items(25), getSearchText, 10));

    act(() => result.current.setPage(3));
    expect(result.current.page).toBe(3);

    act(() => result.current.setQuery("Item 1"));

    expect(result.current.page).toBeLessThanOrEqual(result.current.totalPages);
    expect(result.current.paged.length).toBeGreaterThan(0);
  });
});
