# Get Orders Date/Tag Filters Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add optional updated-date filtering (relative `now − lag` or a specific date/time) and multi-tag filtering to the `Get Orders` operation.

**Architecture:** All changes are confined to `nodes/ShopifyGraphQl/ShopifyGraphQl.node.ts`. New UI properties are added to `description.properties[]`; the `getOrders` branch of `execute()` builds a Shopify orders search string and passes it as a `$query` GraphQL variable into both the `returnAll` pagination query and the limited query.

**Tech Stack:** TypeScript (strict, ES2019/CommonJS), n8n-workflow node API, gulp for icon copy, eslint-plugin-n8n-nodes-base.

## Global Constraints

- Node ships from compiled `dist/`, so `npm run build` must succeed for the change to take effect. (`build` = `tsc && gulp build:icons`.)
- No automated test suite exists. Per-task verification = `npm run lint` (no new errors) **and** `npm run build` (compiles clean). Final verification is manual in a running n8n instance.
- `tsconfig.json` is `strict`. Shopify GraphQL responses stay typed as `any` (established style — do not add response types).
- Filters apply to **both** `Return All` (pagination) and limited (`limit`) modes.
- With `Filter by Updated Date` off and `Tags` empty, output must be identical to current behavior (empty `$query` string).
- Field/param names (verbatim): `filterByUpdatedDate`, `dateMode` (values `relative` / `specific`), `minutesLag`, `updatedAfter`, `tags`.
- Follow the existing `excludeTags` split idiom for parsing `tags`.
- Version bumps use a bare version-number commit message (repo convention) — done only in the final task.

---

### Task 1: Add the new Get Orders UI fields

**Files:**
- Modify: `nodes/ShopifyGraphQl/ShopifyGraphQl.node.ts` (the `description.properties[]` array — insert after the existing `Limit` property, which currently ends at the block shown/hidden for `['getProducts', 'getOrders']`, and before the `Status` property block for `getProducts`)

**Interfaces:**
- Produces (read later by Task 2 via `this.getNodeParameter`):
  - `filterByUpdatedDate` → boolean, default `false`
  - `dateMode` → string, one of `'relative'` | `'specific'`, default `'relative'`
  - `minutesLag` → number, default `5`
  - `updatedAfter` → string (n8n dateTime value / ISO string), default `''`
  - `tags` → string (comma-separated), default `''`

- [ ] **Step 1: Add the five property definitions**

Insert the following objects into `description.properties[]`, immediately after the `Limit` property object (the one with `name: 'limit'`) and before the `Status` property object (`name: 'status'`):

```typescript
			// Get Orders - date/tag filters
			{
				displayName: 'Filter by Updated Date',
				name: 'filterByUpdatedDate',
				type: 'boolean',
				displayOptions: {
					show: {
						operation: ['getOrders'],
					},
				},
				default: false,
				description: 'Whether to only return orders updated on or after a chosen point in time',
			},
			{
				displayName: 'Date Mode',
				name: 'dateMode',
				type: 'options',
				displayOptions: {
					show: {
						operation: ['getOrders'],
						filterByUpdatedDate: [true],
					},
				},
				options: [
					{
						name: 'Relative (Now Minus Lag)',
						value: 'relative',
						description: 'Return orders updated within the last N minutes (now minus lag)',
					},
					{
						name: 'Specific Date/Time',
						value: 'specific',
						description: 'Return orders updated on or after a specific date/time',
					},
				],
				default: 'relative',
				description: 'How the updated-date cutoff is determined',
			},
			{
				displayName: 'Minutes Lag',
				name: 'minutesLag',
				type: 'number',
				displayOptions: {
					show: {
						operation: ['getOrders'],
						filterByUpdatedDate: [true],
						dateMode: ['relative'],
					},
				},
				typeOptions: {
					minValue: 0,
				},
				default: 5,
				description: 'Look back this many minutes from now. This is the lookback window (e.g. 5 = orders updated in the last 5 minutes).',
			},
			{
				displayName: 'Updated After',
				name: 'updatedAfter',
				type: 'dateTime',
				displayOptions: {
					show: {
						operation: ['getOrders'],
						filterByUpdatedDate: [true],
						dateMode: ['specific'],
					},
				},
				default: '',
				description: 'Only return orders updated on or after this date/time',
			},
			{
				displayName: 'Tags',
				name: 'tags',
				type: 'string',
				displayOptions: {
					show: {
						operation: ['getOrders'],
					},
				},
				default: '',
				placeholder: 'vip, wholesale',
				description: 'Comma-separated list of tags. Only orders having ANY of these tags will be returned. Leave empty to not filter by tag.',
			},
```

- [ ] **Step 2: Lint**

Run: `npm run lint`
Expected: completes with no new errors for `ShopifyGraphQl.node.ts`. (The n8n eslint plugin enforces field conventions — `displayName` in Title Case, `description` sentences ending appropriately, alphabetized/cased option names. If it flags any of the new fields, fix per the message; the strings above already follow those rules.)

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: `tsc` compiles with no errors; gulp copies icons. `dist/nodes/ShopifyGraphQl/ShopifyGraphQl.node.js` is regenerated.

- [ ] **Step 4: Commit**

```bash
git add nodes/ShopifyGraphQl/ShopifyGraphQl.node.ts
git commit -m "Add Get Orders date/tag filter UI fields"
```

---

### Task 2: Build the query string and wire it into both order queries

**Files:**
- Modify: `nodes/ShopifyGraphQl/ShopifyGraphQl.node.ts` (the `else if (operation === 'getOrders')` branch of `execute()`, currently starting at the comment `// Get orders query`)

**Interfaces:**
- Consumes (from Task 1): `filterByUpdatedDate`, `dateMode`, `minutesLag`, `updatedAfter`, `tags` node parameters.
- Produces: no cross-task interface (final task). Both order GraphQL queries now accept `$query: String!` and pass `query: $query` to `orders(...)`.

- [ ] **Step 1: Read the new parameters and build `queryString` at the top of the getOrders branch**

Locate the getOrders branch. It currently begins:

```typescript
				} else if (operation === 'getOrders') {
					// Get orders query
					const returnAll = this.getNodeParameter('returnAll', i, false) as boolean;

					if (returnAll) {
```

Replace that opening (down to but NOT including `if (returnAll) {`) with:

```typescript
				} else if (operation === 'getOrders') {
					// Get orders query
					const returnAll = this.getNodeParameter('returnAll', i, false) as boolean;

					// Build the Shopify orders search query from optional filters
					const filterByUpdatedDate = this.getNodeParameter('filterByUpdatedDate', i, false) as boolean;
					const tagsString = this.getNodeParameter('tags', i, '') as string;

					const queryClauses: string[] = [];

					if (filterByUpdatedDate) {
						const dateMode = this.getNodeParameter('dateMode', i, 'relative') as string;
						let cutoff: string | null = null;

						if (dateMode === 'relative') {
							const minutesLag = this.getNodeParameter('minutesLag', i, 5) as number;
							cutoff = new Date(Date.now() - minutesLag * 60000).toISOString();
						} else {
							const updatedAfter = this.getNodeParameter('updatedAfter', i, '') as string;
							// Empty specific date -> no date clause (avoids Invalid Date)
							if (updatedAfter && updatedAfter.trim()) {
								cutoff = new Date(updatedAfter).toISOString();
							}
						}

						if (cutoff) {
							queryClauses.push(`updated_at:>=${cutoff}`);
						}
					}

					if (tagsString.trim()) {
						const tags = tagsString.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
						if (tags.length > 0) {
							const tagFilters = tags.map(tag => `tag:${tag}`).join(' OR ');
							queryClauses.push(`(${tagFilters})`);
						}
					}

					const ordersQueryString = queryClauses.join(' AND ');

					if (returnAll) {
```

- [ ] **Step 2: Add `$query` to the pagination query and its variables**

In the `if (returnAll)` block, the pagination GraphQL currently reads:

```typescript
							const paginationQuery = `
								query GetOrders($cursor: String) {
									orders(first: 250, after: $cursor) {
```

Change the operation signature and the `orders(...)` arguments to:

```typescript
							const paginationQuery = `
								query GetOrders($query: String!, $cursor: String) {
									orders(first: 250, query: $query, after: $cursor) {
```

Then update the pagination variables. Current:

```typescript
							const paginationVars = cursor ? { cursor } : {};
```

Replace with:

```typescript
							const paginationVars = cursor
								? { query: ordersQueryString, cursor }
								: { query: ordersQueryString };
```

- [ ] **Step 3: Add `$query` to the limited query and its variables**

In the `else` (limited) branch of getOrders, the GraphQL currently reads:

```typescript
						query = `
							query GetOrders($limit: Int!) {
								orders(first: $limit) {
```

Change to:

```typescript
						query = `
							query GetOrders($limit: Int!, $query: String!) {
								orders(first: $limit, query: $query) {
```

Then update the variables. Current:

```typescript
						variables = { limit };
```

Replace with:

```typescript
						variables = { limit, query: ordersQueryString };
```

- [ ] **Step 4: Lint**

Run: `npm run lint`
Expected: no new errors.

- [ ] **Step 5: Build**

Run: `npm run build`
Expected: `tsc` compiles clean; `dist/` regenerated.

- [ ] **Step 6: Commit**

```bash
git add nodes/ShopifyGraphQl/ShopifyGraphQl.node.ts
git commit -m "Filter Get Orders by updated date and tags"
```

---

### Task 3: Manual verification, README, and version bump

**Files:**
- Modify: `README.md` (the `Get Orders` operation description and, optionally, an example)
- Modify: `package.json` (`version`)

**Interfaces:** none (final task).

- [ ] **Step 1: Manual verification in n8n**

Build is already current from Task 2. Load the node into a running n8n instance (via `docker compose up` with this repo mounted at `/data/custom/shopify-node`, or `npm link`), restart n8n, then in a workflow:

Verify each case returns the expected set:
1. `Filter by Updated Date` OFF, `Tags` empty → same orders as before the change.
2. `Filter by Updated Date` ON, Date Mode = Relative, `Minutes Lag` = 5 → only orders with `updated_at` within the last 5 minutes.
3. Date Mode = Specific, `Updated After` = a known past datetime → only orders updated on/after it; clear the field → no date filtering.
4. `Tags` = `a, b` (use real tags in your store) → only orders tagged `a` or `b`; combine with a date filter → both hold.
5. Repeat 2–4 with `Return All` ON → same filtering across paginated results.

Expected: all five behave as described. If any fails, stop and debug before continuing.

- [ ] **Step 2: Update README**

In `README.md`, update the `Get Orders` bullet under `## Operations` to mention the new filters, e.g.:

```markdown
- **Get Orders**: Retrieve a list of orders from your store (with pagination, optional updated-date filtering — relative "now minus lag" or a specific date/time — and optional tag filtering)
```

- [ ] **Step 3: Bump version**

In `package.json`, bump `version` (e.g. `0.3.0` → `0.4.0`, a new minor for an added feature).

- [ ] **Step 4: Commit**

```bash
git add README.md package.json
git commit -m "0.4.0"
```

---

## Self-Review

- **Spec coverage:** Optional date filter (Task 1 `filterByUpdatedDate` + Task 2 clause); relative now−lag (Task 1 `minutesLag`, Task 2 relative branch); specific date/time (Task 1 `updatedAfter`, Task 2 specific branch + empty guard); multi-tag ANY-match (Task 1 `tags`, Task 2 tag clause); both retrieval modes (Task 2 Steps 2–3); behavior preserved when unset (empty `ordersQueryString`); manual verification (Task 3 Step 1). All spec sections mapped.
- **Placeholder scan:** No TBD/TODO; all code shown in full.
- **Type consistency:** Param names (`filterByUpdatedDate`, `dateMode`, `minutesLag`, `updatedAfter`, `tags`) and values (`relative`/`specific`) match between Task 1 definitions and Task 2 reads. `ordersQueryString` defined once (Task 2 Step 1) and consumed in Steps 2–3.
