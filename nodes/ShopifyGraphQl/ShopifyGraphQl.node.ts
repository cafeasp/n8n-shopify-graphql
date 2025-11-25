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
			// Get Products Options
			{
				displayName: 'Limit',
				name: 'limit',
				type: 'number',
				displayOptions: {
					show: {
						operation: ['getProducts', 'getOrders'],
					},
				},
				typeOptions: {
					minValue: 1,
					maxValue: 250,
				},
				default: 10,
				description: 'Max number of results to return',
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
				} else if (operation === 'getProducts') {
					// Get products query
					const limit = this.getNodeParameter('limit', i) as number;
					query = `
						query GetProducts($limit: Int!) {
							products(first: $limit) {
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
												}
											}
										}
									}
								}
							}
						}
					`;
					variables = { limit };
				} else if (operation === 'getOrders') {
					// Get orders query
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
