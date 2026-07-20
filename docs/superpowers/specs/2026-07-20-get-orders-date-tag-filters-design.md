# Get Orders: Updated-Date and Tag Filters — Design

**Date:** 2026-07-20
**Component:** `nodes/ShopifyGraphQl/ShopifyGraphQl.node.ts` — `getOrders` operation

## Goal

Extend the `Get Orders` operation so users can:

1. Optionally filter orders by last-updated date/time.
2. Choose between a **relative** window (`now − minutes lag`, for scheduled polling) and a **specific** date/time.
3. Optionally return only orders carrying one of a set of tags.

Filters must apply to **both** retrieval modes (`Return All` pagination and limited `limit`). When no new filter is enabled, output must be byte-for-byte identical to current behavior.

## New UI fields

All fields are shown only when `operation === 'getOrders'` (via `displayOptions.show`).

| Name (param) | Type | Default | Shown when |
|---|---|---|---|
| `filterByUpdatedDate` | boolean | `false` | Get Orders |
| `dateMode` | options: `relative` / `specific` | `relative` | `filterByUpdatedDate` = true |
| `minutesLag` | number (`minValue: 0`) | `5` | `dateMode` = `relative` |
| `updatedAfter` | dateTime | `''` | `dateMode` = `specific` |
| `tags` | string (comma-separated) | `''` | Get Orders |

Field labels (displayName): `Filter by Updated Date`, `Date Mode`, `Minutes Lag`, `Updated After`, `Tags`.

`dateMode` option labels: `Relative (now - lag)` → value `relative`; `Specific date/time` → value `specific`.

## Query-building logic

Build a Shopify orders search string (`queryString`) from the enabled filters, then pass it as the `$query` GraphQL variable to whichever order query runs.

Clauses, combined with ` AND ` when both are present:

1. **Updated-date clause** — only when `filterByUpdatedDate` is true:
   - `relative`: `cutoff = new Date(Date.now() - minutesLag * 60000).toISOString()`
   - `specific`: `cutoff = new Date(updatedAfter).toISOString()` (normalizes the n8n dateTime value to a UTC ISO-8601 string; lag is **not** applied in this mode)
   - Clause: `updated_at:>=${cutoff}`
   - Guard: in `specific` mode, if `updatedAfter` is empty/blank, emit **no** date clause (avoids `new Date('')` → `Invalid Date`).
2. **Tag clause** — only when `tags` is non-empty:
   - Split on `,`, `.trim()` each, drop empties (same pattern as `excludeTags` in `getProducts`).
   - If ≥1 tag remains: `(tag:a OR tag:b OR ...)` — ANY match.

If neither clause is present, `queryString` is `''`. Shopify treats an empty `query` argument as "no filter", so results equal today's unfiltered behavior.

Example combined query string:
```
updated_at:>=2026-07-20T18:55:00.000Z AND (tag:vip OR tag:wholesale)
```

## Implementation notes

- Both order GraphQL documents (the `returnAll` pagination query and the limited query) gain a `$query: String!` operation variable and change `orders(first: ...)` → `orders(first: ..., query: $query)`. The pagination query keeps its existing `after: $cursor`.
- `variables` for each path includes the built `query` string:
  - Pagination path: `{ query: queryString, cursor }` (or `{ query: queryString }` on the first page), preserving the existing cursor logic.
  - Limited path: `{ limit, query: queryString }`.
- Compute `queryString` once, before the `returnAll` branch, since both branches use it.
- Server-side `now` (execution time, UTC) is used for the relative cutoff, so `minutesLag` is effectively the lookback window.

## Out of scope

- No changes to any other operation.
- No new fields on the returned order objects.
- No upper-bound / "settling" delay on the date filter (lag is a lower-bound overlap only).

## Verification

Manual, against a running n8n instance (no automated test suite exists):

1. Filter off, no tags → identical result set to current build.
2. Relative mode, lag = N → only orders with `updated_at >= now − N min`.
3. Specific mode with a picked date → only orders updated at/after that date; empty date → no date filtering.
4. Tags = `a, b` → only orders tagged `a` or `b`; combined with a date clause → both constraints hold.
5. Each of the above works with both `Return All` on and off.
