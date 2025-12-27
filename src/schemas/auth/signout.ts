export const signOutFastifySchema = {
  description: "Sign out current user",
  tags: ["auth"],
  security: [{ bearerAuth: [] }],
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
