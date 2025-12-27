export const resendConfirmationFastifySchema = {
  description: "Resend email confirmation",
  tags: ["auth"],
  body: {
    type: "object",
    required: ["email"],
    properties: {
      email: { type: "string", format: "email", description: "User email" },
    },
  },
  response: {
    200: {
      type: "object",
      properties: {
        success: { type: "boolean" },
        message: { type: "string" },
      },
      required: ["success", "message"],
    },
  },
};
