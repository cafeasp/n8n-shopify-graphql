// Import types from n8n-workflow for building credential configuration
// ICredentialType: Base interface for defining credential structure
// INodeProperties: Defines input fields (shop name, access token, API version)
// IAuthenticateGeneric: Configures how credentials are sent in HTTP requests (headers)
// ICredentialTestRequest: Defines a test query to validate credentials work
import {
    IAuthenticateGeneric,
    ICredentialTestRequest,
    ICredentialType,
    INodeProperties,
} from 'n8n-workflow';

export class ShopifyGraphQlApi implements ICredentialType {
	name = 'shopifyGraphQlApi';
	displayName = 'Shopify GraphQL API';
	documentationUrl = 'https://shopify.dev/docs/api/admin-graphql';
	properties: INodeProperties[] = [
		{
			displayName: 'Shop Name',
			name: 'shopName',
			type: 'string',
			default: '',
			placeholder: 'your-store-name',
			description: 'The name of your Shopify store (the part before .myshopify.com)',
			required: true,
		},
		{
			displayName: 'Access Token',
			name: 'accessToken',
			type: 'string',
			typeOptions: {
				password: true,
			},
			default: '',
			description: 'Admin API access token for your Shopify store',
			required: true,
		},
		{
			displayName: 'API Version',
			name: 'apiVersion',
			type: 'string',
			default: '2024-10',
			description: 'Shopify API version (e.g., 2024-10)',
			required: true,
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				'X-Shopify-Access-Token': '={{$credentials.accessToken}}',
				'Content-Type': 'application/json',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: '=https://{{$credentials.shopName}}.myshopify.com/admin/api/{{$credentials.apiVersion}}/graphql.json',
			url: '',
			method: 'POST',
			body: {
				query: '{ shop { name } }',
			},
		},
	};
}
