import { useMemo, useState } from "react";

export function useListFilter<T>(items: T[], getSearchText: (item: T) => string, pageSize = 20) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return items;
    return items.filter((item) => getSearchText(item).toLowerCase().includes(needle));
  }, [items, query, getSearchText]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paged = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return { query, setQuery, page: currentPage, setPage, filtered, paged, totalPages };
}
