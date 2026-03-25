import { Static, Type } from "@sinclair/typebox";

export const resetPasswordBodySchema = Type.Object({
  email: Type.String({ format: "email" }),
});

export const resetPasswordResponseSchema = Type.Object({
  success: Type.Literal(true),
  message: Type.String(),
});

export const resetPasswordConfirmBodySchema = Type.Object({
  token_hash: Type.String({ minLength: 1 }),
  type: Type.Optional(Type.Literal("recovery")),
  new_password: Type.String({ minLength: 6 }),
});

export const resetPasswordConfirmResponseSchema = Type.Object({
  success: Type.Literal(true),
  message: Type.String(),
});

export type ResetPasswordBody = Static<typeof resetPasswordBodySchema>;
export type ResetPasswordResponse = Static<typeof resetPasswordResponseSchema>;
export type ResetPasswordConfirmBody = Static<
  typeof resetPasswordConfirmBodySchema
>;
export type ResetPasswordConfirmResponse = Static<
  typeof resetPasswordConfirmResponseSchema
>;

export const resetPasswordFastifySchema = {
  description: "Send password reset email to user",
  tags: ["auth"],
  body: resetPasswordBodySchema,
  response: {
    200: resetPasswordResponseSchema,
  },
} as const;

export const resetPasswordConfirmFastifySchema = {
  description: "Confirm password reset with new password",
  tags: ["auth"],
  body: resetPasswordConfirmBodySchema,
  response: {
    200: resetPasswordConfirmResponseSchema,
  },
} as const;
