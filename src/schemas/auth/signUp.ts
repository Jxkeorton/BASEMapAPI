export const signUpFastifySchema = {
	description: 'Sign up with email and password',
	tags: ['auth'],
	body: {
		type: 'object',
		required: ['email', 'password'],
		properties: {
			email: { type: 'string', format: 'email', description: 'User email' },
			password: { type: 'string', minLength: 6, description: 'User password' },
			name: { type: 'string', minLength: 1, description: 'User display name' },
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
								email_confirmed_at: { type: ['string', 'null'], description: 'Email confirmation timestamp or null' },
							},
						},
						session: { type: ['object', 'null'], description: 'Session object or null' },
						requiresEmailConfirmation: { type: 'boolean' },
						message: { type: 'string' },
					},
				},
			},
		}
	},
};
