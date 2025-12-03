// Import types from n8n-workflow for building the node logic
// INodeType: Base interface that defines the node structure
// INodeTypeDescription: Describes the node's UI (name, icon, input fields, operations)
// IExecuteFunctions: Provides helper methods to access parameters, credentials, and make HTTP requests
// INodeExecutionData: Defines the structure of data passed between nodes
// NodeOperationError: Used to throw user-friendly errors when operations fail
import {
    IExecuteFunctions,
    INodeExecutionData,
    INodeType,
    INodeTypeDescription,
    NodeOperationError,
} from 'n8n-workflow';

export class ShopifyGraphQl implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Shopify GraphQL',
		name: 'shopifyGraphQl',
		icon: 'file:shopify.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"]}}',
		description: 'Execute GraphQL queries against Shopify Admin API',
		defaults: {
			name: 'Shopify GraphQL',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'shopifyGraphQlApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Execute Query',
						value: 'query',
						description: 'Execute a GraphQL query',
						action: 'Execute a GraphQL query',
					},
					{
						name: 'Get Product by SKU',
						value: 'getProductBySku',
						description: 'Get a product by variant SKU',
						action: 'Get a product by variant SKU',
					},
					{
						name: 'Get Products',
						value: 'getProducts',
						description: 'Get a list of products',
						action: 'Get a list of products',
					},
					{
						name: 'Get Orders',
						value: 'getOrders',
						description: 'Get a list of orders',
						action: 'Get a list of orders',
					},
				],
				default: 'query',
			},
			// Custom Query
			{
				displayName: 'GraphQL Query',
				name: 'query',
				type: 'string',
				typeOptions: {
					rows: 10,
				},
				displayOptions: {
					show: {
						operation: ['query'],
					},
				},
				default: '{\n  shop {\n    name\n    email\n  }\n}',
				description: 'The GraphQL query to execute',
				required: true,
			},
			{
				displayName: 'Variables',
				name: 'variables',
				type: 'json',
				displayOptions: {
					show: {
						operation: ['query'],
					},
				},
				default: '{}',
				description: 'GraphQL query variables (as JSON)',
			},
			// Get Product by SKU
			{
				displayName: 'SKU',
				name: 'sku',
				type: 'string',
				displayOptions: {
					show: {
						operation: ['getProductBySku'],
					},
				},
				default: '',
				placeholder: 'ABC-123',
				description: 'The SKU of the product variant to search for',
				required: true,
			},
			// Get Products Options
			{
				displayName: 'Return All',
				name: 'returnAll',
				type: 'boolean',
				displayOptions: {
					show: {
						operation: ['getProducts', 'getOrders'],
					},
				},
				default: false,
				description: 'Whether to return all results or only up to a given limit',
			},
			{
				displayName: 'Limit',
				name: 'limit',
				type: 'number',
				displayOptions: {
					show: {
						operation: ['getProducts', 'getOrders'],
						returnAll: [false],
					},
				},
				typeOptions: {
					minValue: 1,
					maxValue: 250,
				},
				default: 10,
				description: 'Max number of results to return',
			},
			{
				displayName: 'Status',
				name: 'status',
				type: 'multiOptions',
				displayOptions: {
					show: {
						operation: ['getProducts'],
					},
				},
				options: [
					{
						name: 'Active',
						value: 'ACTIVE',
						description: 'Products visible in online stores and sales channels',
					},
					{
						name: 'Archived',
						value: 'ARCHIVED',
						description: 'Products no longer available for sale',
					},
					{
						name: 'Draft',
						value: 'DRAFT',
						description: 'Products not yet published',
					},
				],
				default: ['ACTIVE'],
				description: 'Filter products by status. You can select multiple statuses.',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];
		const operation = this.getNodeParameter('operation', 0) as string;

		// Get credentials
		const credentials = await this.getCredentials('shopifyGraphQlApi');
		const shopName = credentials.shopName as string;
		const accessToken = credentials.accessToken as string;
		const apiVersion = credentials.apiVersion as string;

		const baseUrl = `https://${shopName}.myshopify.com/admin/api/${apiVersion}/graphql.json`;

		for (let i = 0; i < items.length; i++) {
			try {
				let query = '';
				let variables: any = {};

				if (operation === 'query') {
					// Custom query
					query = this.getNodeParameter('query', i) as string;
					const variablesString = this.getNodeParameter('variables', i, '{}') as string;
					try {
						variables = JSON.parse(variablesString);
					} catch (error) {
						throw new NodeOperationError(
							this.getNode(),
							'Variables must be valid JSON',
							{ itemIndex: i },
						);
					}
				} else if (operation === 'getProductBySku') {
					// Get product by SKU
					const sku = this.getNodeParameter('sku', i) as string;
					query = `
						query GetProductBySku($query: String!) {
							products(first: 1, query: $query) {
								edges {
									node {
										id
										title
										description
										handle
										status
										createdAt
										updatedAt
										variants(first: 100) {
											edges {
												node {
													id
													title
													price
													sku
													inventoryQuantity
													compareAtPrice
													barcode
													inventoryItem {
														id
													}
												}
											}
										}
										images(first: 5) {
											edges {
												node {
													id
													url
													altText
												}
											}
										}
									}
								}
							}
						}
					`;
					variables = { query: `sku:${sku}` };
				} else if (operation === 'getProducts') {
					// Get products query
					const returnAll = this.getNodeParameter('returnAll', i, false) as boolean;
					const statusFilter = this.getNodeParameter('status', i, ['ACTIVE']) as string[];
					
					// Build query string for status filter
					const queryString = `status:${statusFilter.join(',')}`;
					
					if (returnAll) {
						// Fetch all products using pagination
						let hasNextPage = true;
						let cursor: string | null = null;
						const allProducts: any[] = [];
						
						while (hasNextPage) {
							const paginationQuery = `
								query GetProducts($query: String!, $cursor: String) {
									products(first: 250, query: $query, after: $cursor) {
										edges {
											cursor
											node {
												id
												title
												description
												handle
												status
												createdAt
												updatedAt
												variants(first: 10) {
													edges {
														node {
															id
															title
															price
															sku
														}
													}
												}
											}
										}
										pageInfo {
											hasNextPage
											endCursor
										}
									}
								}
							`;
							
							const paginationVars = cursor 
								? { query: queryString, cursor }
								: { query: queryString };
							
							const response = await this.helpers.httpRequest({
								method: 'POST',
								url: baseUrl,
								headers: {
									'X-Shopify-Access-Token': accessToken,
									'Content-Type': 'application/json',
								},
								body: {
									query: paginationQuery,
									variables: paginationVars,
								},
								json: true,
							});
							
							if (response.errors) {
								throw new NodeOperationError(
									this.getNode(),
									`GraphQL Error: ${JSON.stringify(response.errors)}`,
									{ itemIndex: i },
								);
							}
							
							const products = response.data.products.edges.map((edge: any) => edge.node);
							allProducts.push(...products);
							
							hasNextPage = response.data.products.pageInfo.hasNextPage;
							cursor = response.data.products.pageInfo.endCursor;
						}
						
						returnData.push({
							json: { products: allProducts },
							pairedItem: { item: i },
						});
						continue;
					} else {
						// Fetch limited products
						const limit = this.getNodeParameter('limit', i) as number;
						query = `
							query GetProducts($limit: Int!, $query: String!) {
								products(first: $limit, query: $query) {
									edges {
										node {
											id
											title
											description
											handle
											status
											createdAt
											updatedAt
											variants(first: 10) {
												edges {
													node {
														id
														title
														price
														sku
														inventoryItem {
															id
														}
													}
												}
											}
										}
									}
								}
							}
						`;
						variables = { limit, query: queryString };
					}
				} else if (operation === 'getOrders') {
					// Get orders query
					const returnAll = this.getNodeParameter('returnAll', i, false) as boolean;
					
					if (returnAll) {
						// Fetch all orders using pagination
						let hasNextPage = true;
						let cursor: string | null = null;
						const allOrders: any[] = [];
						
						while (hasNextPage) {
							const paginationQuery = `
								query GetOrders($cursor: String) {
									orders(first: 250, after: $cursor) {
										edges {
											cursor
											node {
												id
												name
												email
												createdAt
												totalPriceSet {
													shopMoney {
														amount
														currencyCode
													}
												}
												lineItems(first: 10) {
													edges {
														node {
															id
															title
															quantity
														}
													}
												}
											}
										}
										pageInfo {
											hasNextPage
											endCursor
										}
									}
								}
							`;
							
							const paginationVars = cursor ? { cursor } : {};
							
							const response = await this.helpers.httpRequest({
								method: 'POST',
								url: baseUrl,
								headers: {
									'X-Shopify-Access-Token': accessToken,
									'Content-Type': 'application/json',
								},
								body: {
									query: paginationQuery,
									variables: paginationVars,
								},
								json: true,
							});
							
							if (response.errors) {
								throw new NodeOperationError(
									this.getNode(),
									`GraphQL Error: ${JSON.stringify(response.errors)}`,
									{ itemIndex: i },
								);
							}
							
							const orders = response.data.orders.edges.map((edge: any) => edge.node);
							allOrders.push(...orders);
							
							hasNextPage = response.data.orders.pageInfo.hasNextPage;
							cursor = response.data.orders.pageInfo.endCursor;
						}
						
						returnData.push({
							json: { orders: allOrders },
							pairedItem: { item: i },
						});
						continue;
					} else {
						// Fetch limited orders
						const limit = this.getNodeParameter('limit', i) as number;
						query = `
							query GetOrders($limit: Int!) {
								orders(first: $limit) {
									edges {
										node {
											id
											name
											email
											createdAt
											totalPriceSet {
												shopMoney {
													amount
													currencyCode
												}
											}
											lineItems(first: 10) {
												edges {
													node {
														id
														title
														quantity
													}
												}
											}
										}
									}
								}
							}
						`;
						variables = { limit };
					}
				}

				// Make the GraphQL request
				const response = await this.helpers.httpRequest({
					method: 'POST',
					url: baseUrl,
					headers: {
						'X-Shopify-Access-Token': accessToken,
						'Content-Type': 'application/json',
					},
					body: {
						query,
						variables,
					},
					json: true,
				});

				// Check for GraphQL errors
				if (response.errors) {
					throw new NodeOperationError(
						this.getNode(),
						`GraphQL Error: ${JSON.stringify(response.errors)}`,
						{ itemIndex: i },
					);
				}

				returnData.push({
					json: response.data,
					pairedItem: { item: i },
				});
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: {
							error: (error as Error).message,
						},
						pairedItem: { item: i },
					});
					continue;
				}
				throw error;
			}
		}

		return [returnData];
	}
}
