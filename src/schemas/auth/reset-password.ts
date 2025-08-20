export const resetPasswordFastifySchema = {
  description: 'Send password reset email to user',
  tags: ['auth'],
  body: {
    type: 'object',
    required: ['email'],
    properties: {
      email: { type: 'string', format: 'email', description: 'User email address' },
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
    }
  },
};

export const resetPasswordConfirmFastifySchema = {
  description: 'Confirm password reset with new password',
  tags: ['auth'],
  body: {
    type: 'object',
    required: ['access_token', 'refresh_token', 'new_password'],
    properties: {
      access_token: { type: 'string', description: 'Access token from reset email' },
      refresh_token: { type: 'string', description: 'Refresh token from reset email' },
      new_password: { type: 'string', minLength: 6, description: 'New password' },
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
    }
  },
};