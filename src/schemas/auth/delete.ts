export const deleteAccountFastifySchema = {
  description: 'Delete user account and all associated data',
  tags: ['profile'],
  security: [{ bearerAuth: [] }],
  body: {
    type: 'object',
    required: ['confirmation'],
    properties: {
      confirmation: { 
        type: 'string', 
        description: 'Must contain "DELETE" to confirm account deletion' 
      },
      password: { 
        type: 'string', 
        minLength: 6, 
        description: 'Password for verification (required for email/password users)' 
      },
      verification_method: {
        type: 'string',
        enum: ['password', 'reauthentication', 'trusted_session'],
        description: 'Method used to verify user identity'
      }
    },
  },
  response: {
    200: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
      },
      required: ['success', 'message'],
    },
  },
};