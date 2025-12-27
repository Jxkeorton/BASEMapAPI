import { Static, Type } from "@sinclair/typebox";

export const deleteAccountBodySchema = Type.Object({
  confirmation: Type.String(),
  password: Type.Optional(Type.String({ minLength: 6 })),
  verification_method: Type.Optional(
    Type.Union([
      Type.Literal("password"),
      Type.Literal("reauthentication"),
      Type.Literal("trusted_session"),
    ])
  ),
});

export const deleteAccountResponseSchema = Type.Object({
  success: Type.Literal(true),
  message: Type.String(),
});

export type DeleteAccountBody = Static<typeof deleteAccountBodySchema>;
export type DeleteAccountResponse = Static<typeof deleteAccountResponseSchema>;

export const deleteAccountFastifySchema = {
  description: "Delete user account and all associated data",
  tags: ["profile"],
  security: [{ bearerAuth: [] }],
  body: deleteAccountBodySchema,
  response: {
    200: deleteAccountResponseSchema,
  },
} as const;
