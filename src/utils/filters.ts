import type { AlbumFilter, Visibility } from "@/gql/graphql";
import { ID } from "@/utils/ids";

/** The album filters as they travel in the address. */
export type FilterSearch = {
  category?: string;
  year?: string;
  kind?: string;
  spex?: string;
  visibility?: string;
  page?: string;
  q?: string;
  smart?: string;
};

/**
 * The address's parameters with one value each: `?q=a&q=b` arrives as an array, which a page reading a string would
 * stumble over. The first value counts.
 */
export function firstValues<T extends Record<string, string | undefined>>(search: T | Record<string, string | string[] | undefined>): T {
  return Object.fromEntries(Object.entries(search).map(([key, value]) => [key, Array.isArray(value) ? value[0] : value])) as T;
}

const VISIBILITY: ReadonlySet<string> = new Set(["UNPUBLISHED", "MEMBERS", "PUBLIC"]);

/**
 * The filter for the server from the address; anything malformed is left out. `visibility` is for editors only.
 */
export function toAlbumFilter(search: FilterSearch, editor = false): AlbumFilter {
  const year = Number(search.year);

  return {
    categoryId: search.category && ID.test(search.category) ? search.category : null,
    year: Number.isInteger(year) && year > 1800 && year < 3000 ? year : null,
    kindId: search.kind && ID.test(search.kind) ? search.kind : null,
    spexId: search.spex && ID.test(search.spex) ? search.spex : null,
    visibility: editor && search.visibility && VISIBILITY.has(search.visibility) ? search.visibility as Visibility : null,
  };
}

/** A page number from the address, 0 when it is not one. */
export function toPage(value: string | undefined): number {
  const page = Number(value ?? "0");

  return Number.isInteger(page) && page >= 0 ? page : 0;
}

/**
 * The address with this filter and page; empty parts are left out.
 */
export function filterHref(path: string, search: FilterSearch, changes: Partial<FilterSearch> = {}): string {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries({ ...search, ...changes })) {
    if (value && !(key === "page" && value === "0")) {
      params.set(key, value);
    }
  }

  const query = params.toString();

  return query ? `${path}?${query}` : path;
}
