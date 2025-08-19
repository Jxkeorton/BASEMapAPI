export const signInFastifySchema = {
	description: 'Sign in with email and password',
	tags: ['auth'],
	body: {
		type: 'object',
		required: ['email', 'password'],
		properties: {
			email: { type: 'string', format: 'email', description: 'User email' },
			password: { type: 'string', minLength: 6, description: 'User password' },
		},
	},
	response: {
		200: {
			type: 'object',
			properties: {
				success: { type: 'boolean' },
				data: {
					type: 'object',
					properties: {
						user: {
							type: 'object',
							properties: {
								id: { type: 'string' },
								email: { type: 'string', format: 'email' },
							},
						},
						session: {
							type: 'object',
							properties: {
								access_token: { type: 'string' },
								refresh_token: { type: 'string' },
								expires_at: { type: 'number' },
							},
						},
					},
				},
			},
		},
	},
};