# n8n-nodes-shopify-graphql

[![npm version](https://badge.fury.io/js/%40cafeasp%2Fn8n-nodes-shopify-graphql.svg)](https://badge.fury.io/js/%40cafeasp%2Fn8n-nodes-shopify-graphql)

This is an n8n community node that lets you interact with Shopify's GraphQL Admin API in your n8n workflows.

Use this node to execute custom GraphQL queries against your Shopify store, retrieve products, orders, and access the full power of Shopify's Admin API. Perfect for building custom e-commerce automation workflows.

[n8n](https://n8n.io/) is a [fair-code licensed](https://docs.n8n.io/reference/license/) workflow automation platform.

[Installation](#installation)  
[Operations](#operations)  
[Credentials](#credentials)  
[Compatibility](#compatibility)  
[Usage](#usage)  
[Troubleshooting](#troubleshooting)  
[Resources](#resources)  

## Installation

Follow the [installation guide](https://docs.n8n.io/integrations/community-nodes/installation/) in the n8n community nodes documentation.

### npm installation

1. Go to **Settings > Community Nodes**
2. Select **Install**
3. Enter `@cafeasp/n8n-nodes-shopify-graphql` in **Enter npm package name**
4. Agree to the [risks](https://docs.n8n.io/integrations/community-nodes/risks/) of using community nodes
5. Select **Install**

### Manual installation (for local development)

**For local n8n installation:**

```bash
# Clone or download this repository
git clone https://github.com/cafeasp/n8n-shopify-graphql.git
cd n8n-shopify-graphql

# Install dependencies
npm install

# Build the node
npm run build

# Link to n8n (Unix/Mac)
npm link
cd ~/.n8n/nodes
npm link @cafeasp/n8n-nodes-shopify-graphql

# Link to n8n (Windows)
npm link
cd %USERPROFILE%\.n8n\nodes
npm link @cafeasp/n8n-nodes-shopify-graphql
```

**For Docker installations**, see the included `docker-compose.yml` file.

## Compatibility

- **n8n version**: 1.0.0 or higher
- **Shopify API**: Admin API 2024-10 or higher
- **Node.js**: 18.x or higher (for development)

## Operations

This node supports the following operations:

- **Execute Query**: Execute a custom GraphQL query
- **Get Collection by Name**: Retrieve a collection by name and get all product SKUs in that collection
- **Get Product by SKU**: Retrieve a product by its variant SKU
- **Get Products**: Retrieve a list of products from your store (with status filtering, image inclusion, and pagination support)
- **Get Orders**: Retrieve a list of orders from your store (with pagination, optional updated-date filtering — relative "now minus lag" or a specific date/time — and optional tag filtering)
- **Update Inventory**: Update inventory quantities for multiple items in a single API call (max 250 items)

## Credentials

You'll need to create a Shopify Admin API access token:

1. Log into your Shopify admin panel
2. Go to **Settings > Apps and sales channels**
3. Click **Develop apps** (you may need to enable this first)
4. Click **Create an app**
5. Give your app a name and click **Create app**
6. Go to **Configuration** and configure your Admin API scopes
7. Click **Install app**
8. Reveal your **Admin API access token** and save it

In n8n, configure the credentials with:
- **Shop Name**: Your store name (the part before `.myshopify.com`)
- **Access Token**: The Admin API access token you just created
- **API Version**: The API version to use (e.g., `2024-10`)

## Usage

### Example 1: Get Shop Information

1. Add the **Shopify GraphQL** node
2. Select **Execute Query** operation
3. Enter this query:
```graphql
{
  shop {
    name
    email
    currencyCode
    primaryDomain {
      url
    }
  }
}
```

### Example 2: Get Collection by Name

1. Add the **Shopify GraphQL** node
2. Select **Get Collection by Name** operation
3. Enter the exact collection name as it appears in Shopify (e.g., `Shop All name of your collection`)
4. The node will return the collection details with all products and their variant SKUs (up to 250 products)

**Use case:** Perfect for exporting all SKUs in a specific collection, syncing inventory, or analyzing collection contents.

**Note:** Use the exact collection title as shown in your Shopify admin under Products > Collections.

### Example 3: Get Product by SKU

1. Add the **Shopify GraphQL** node
2. Select **Get Product by SKU** operation
3. Enter the SKU (e.g., `ABC-123`)
4. The node will return the product with all its variants, pricing, inventory, and images

**Returned data includes:**
- Product details (title, description, status, handle)
- Variant details (id, title, price, SKU)
- Inventory item IDs for each variant (useful for inventory management APIs)
- Product images

### Example 4: Get Products with Status Filter

1. Add the **Shopify GraphQL** node
2. Select **Get Products** operation
3. Choose status filters: Active, Archived, or Draft (can select multiple)
4. (Optional) Enter **Exclude Tags** to filter out products with specific tags (e.g., `skip, discontinued`)
5. (Optional) Enable **Include Images** to return up to 5 images per product (disabled by default to keep responses lightweight)
6. Choose retrieval mode:
   - **Return All = OFF**: Set a limit (default: 10) to get a specific number of products
   - **Return All = ON**: Automatically fetch all products using pagination (no limit needed)
7. The node will return filtered product details including variants

**Returned data includes:**
- Product details (title, description, handle, status, dates)
- Up to 10 variants per product (id, title, price, SKU)
- Inventory item IDs for each variant (for inventory management integrations)
- Product images (id, url, altText) — up to 5 per product, when **Include Images** is enabled

**Filtering options:**
- **Status**: Filter by product status (Active, Archived, Draft)
- **Exclude Tags**: Comma-separated list of tags to exclude. Products with ANY of these tags will be filtered out. For example, entering `skip, test` will exclude all products tagged with either "skip" or "test".
- **Include Images**: Toggle to include product images in the response. Disabled by default for faster, smaller responses.

**Note:** All product operations (Get Products, Get Product by SKU) return the `inventoryItem.id` field for each variant, which is required for Shopify's Inventory API operations.

### Example 5: Get All Products with Pagination

1. Add the **Shopify GraphQL** node
2. Select **Get Products** operation
3. Enable **Return All** toggle
4. Optionally filter by status (Active, Archived, Draft)
5. Optionally add **Exclude Tags** to skip products with specific tags
5. The node will automatically paginate through all results and return ALL products matching your filters

**Note:** When "Return All" is enabled, the node makes multiple API requests (250 products per request) until all products are retrieved. This is useful for bulk operations or data exports.

### Example 6: Custom Query with Variables

1. Add the **Shopify GraphQL** node
2. Select **Execute Query** operation
3. Enter a query with variables:
```graphql
query GetProduct($id: ID!) {
  product(id: $id) {
    id
    title
    description
  }
}
```
4. Add variables in JSON format:
```json
{
  "id": "gid://shopify/Product/1234567890"
}
```

### Example 7: Update Inventory for Multiple Items

1. Add the **Shopify GraphQL** node
2. Select **Update Inventory** operation
3. Enter your **Location ID** (e.g., `gid://shopify/Location/59462222017`)
4. Select a **Reason** for the adjustment (correction, restock, etc.)
5. Enter **Inventory Items** as a JSON array:
```json
[
  {
    "inventoryItemId": "gid://shopify/InventoryItem/123456",
    "quantity": 100
  },
  {
    "inventoryItemId": "gid://shopify/InventoryItem/789012",
    "quantity": 50
  },
  {
    "inventoryItemId": "gid://shopify/InventoryItem/345678",
    "quantity": 75
  }
]
```

**Use case:** Perfect for batch inventory updates from external systems, syncing stock levels, or applying bulk adjustments after physical counts.

**Key points:**
- Updates up to 250 items in a single API call
- Sets absolute quantity values (not deltas)
- Returns the adjustment group with delta changes and final quantities
- Returns both `available` and `on_hand` inventory changes
- Each change includes the inventory item ID and SKU for easy identification
- Inventory item IDs can be obtained from any "Get Products" or "Get Product by SKU" operation

**Response structure:**
The operation returns detailed information about what was updated:
- `inventoryAdjustmentGroup.id` - Unique ID for this adjustment batch
- `changes[]` - Array of all inventory changes made
  - `name` - Type of inventory (`available` or `on_hand`)
  - `delta` - How much the inventory changed (e.g., +50, -10)
  - `quantityAfterChange` - Final quantity (may be null with `ignoreCompareQuantity`)
  - `item.id` - Inventory item ID that was updated
  - `item.sku` - SKU of the variant (for easy identification)

### Example 8: Get Orders Filtered by Updated Date and Tags

1. Add the **Shopify GraphQL** node
2. Select **Get Orders** operation
3. Choose retrieval mode (**Return All** on/off, same as before)
4. (Optional) Enable **Filter by Updated Date**, then pick a **Date Mode**:
   - **Relative (Now Minus Lag)**: set **Minutes Lag** to a lookback window. For example, `5` returns only orders updated in the last 5 minutes — ideal for a workflow scheduled to poll every few minutes.
   - **Specific Date/Time**: set **Updated After** to return only orders updated on or after that moment. Leave it empty to apply no date filter.
5. (Optional) Enter **Tags** as a comma-separated list (e.g. `vip, wholesale`) to return only orders that have ANY of those tags. Tags with spaces (e.g. `New Arrivals`) are supported.

**Filtering options:**
- **Filter by Updated Date**: Off by default. When off, Get Orders behaves exactly as before (no date filter).
- **Date Mode → Relative**: Cutoff is computed at run time as `now − Minutes Lag`, so the lag doubles as the lookback window. Uses server time in UTC.
- **Date Mode → Specific**: Uses the **Updated After** value as-is (lag is not applied).
- **Tags**: Comma-separated. Orders matching ANY listed tag are returned. Combined with the date filter using AND. Empty = no tag filtering.

**Use case:** Perfect for incremental order syncs — schedule the workflow, enable Relative mode with a small lag, and each run picks up only the orders changed since the previous run (the lag provides an overlap window so nothing is missed).

## Troubleshooting

### Node doesn't appear in n8n

1. Make sure you've run `npm run build` before linking or installing
2. Restart n8n after installation
3. Check that the `dist` folder exists in the package directory
4. For Docker: Verify the volume mount and `N8N_CUSTOM_EXTENSIONS` environment variable

### Authentication errors

1. Verify your Shop Name doesn't include `.myshopify.com` (just the store name)
2. Ensure your access token has the required API scopes
3. Check that your API version is correct (format: `YYYY-MM`)
4. Test your credentials using the "Test" button in n8n

### GraphQL errors

1. Verify your query syntax using [Shopify's GraphQL Explorer](https://shopify.dev/docs/apps/tools/graphiql-admin-api)
2. Check that you have the required scopes for the data you're querying
3. Ensure variables are valid JSON format
4. Review Shopify's [rate limits](https://shopify.dev/docs/api/usage/rate-limits)

### Common issues

- **"Cannot find module 'n8n-workflow'"**: Run `npm install` in the package directory
- **Empty results**: Check your store has data and your API version supports the query
- **Timeout errors**: Reduce the limit parameter or optimize your query

## Development

```bash
# Install dependencies
npm install

# Build and watch for changes
npm run dev

# Format code
npm run format

# Lint code
npm run lint

# Fix linting issues
npm run lintfix
```

## Resources

* [n8n community nodes documentation](https://docs.n8n.io/integrations/community-nodes/)
* [Shopify GraphQL Admin API](https://shopify.dev/docs/api/admin-graphql)
* [Shopify GraphQL Explorer](https://shopify.dev/docs/apps/tools/graphiql-admin-api)

## License

[MIT](LICENSE)
