export const refreshFastifySchema = {
  description: 'Refresh access token using refresh token',
  tags: ['auth'],
  body: {
    type: 'object',
    required: ['refresh_token'],
    properties: {
      refresh_token: { type: 'string', description: 'Refresh token from signin' },
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
            session: {
              type: 'object',
              properties: {
                access_token: { type: 'string' },
                refresh_token: { type: 'string' },
                expires_at: { type: 'number' },
              },
              required: ['access_token', 'refresh_token', 'expires_at'],
            },
          },
          required: ['session'],
        },
      },
      required: ['success', 'data'],
    },
    400: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        error: { type: 'string' },
        details: { type: 'array', items: { type: 'object' }, nullable: true },
      },
      required: ['success', 'error'],
    },
    401: {
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