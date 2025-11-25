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
git clone https://github.com/vpach/n8n-shopify-graphql.git
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
- **Get Products**: Retrieve a list of products from your store
- **Get Orders**: Retrieve a list of orders from your store

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

### Example 2: Get Products

1. Add the **Shopify GraphQL** node
2. Select **Get Products** operation
3. Set the limit (default: 10)
4. The node will return product details including variants

### Example 3: Custom Query with Variables

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
