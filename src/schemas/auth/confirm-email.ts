export const confirmEmailFastifySchema = {
  description: 'Confirm email address',
  tags: ['auth'],
  body: {
    type: 'object',
    required: ['token', 'type'],
    properties: {
      token: { type: 'string', description: 'Confirmation token from email' },
      type: { 
        type: 'string', 
        enum: ['signup', 'recovery', 'email_change'],
        description: 'Type of confirmation'
      },
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
                email_confirmed_at: { type: 'string', nullable: true },
              },
              required: ['id', 'email'],
            },
            session: {
              type: 'object',
              properties: {
                access_token: { type: 'string' },
                refresh_token: { type: 'string' },
                expires_at: { type: 'number' },
              },
              required: ['access_token', 'refresh_token', 'expires_at'],
            },
            message: { type: 'string' },
          },
          required: ['user', 'session', 'message'],
        },
      },
      required: ['success', 'data'],
    },
    400: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        error: { type: 'string' },
      },
      required: ['success', 'error'],
    },
    500: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        error: { type: 'string' },
      },
      required: ['success', 'error'],
    },
  },
};