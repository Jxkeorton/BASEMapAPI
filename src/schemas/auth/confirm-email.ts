import { Static, Type } from "@sinclair/typebox";

export const confirmEmailBodySchema = Type.Object({
  token: Type.String(),
  type: Type.Union([
    Type.Literal("signup"),
    Type.Literal("recovery"),
    Type.Literal("email_change"),
  ]),
});

export const confirmEmailResponseSchema = Type.Object({
  success: Type.Literal(true),
  data: Type.Object({
    user: Type.Object({
      id: Type.String(),
      email: Type.String({ format: "email" }),
      email_confirmed_at: Type.Union([Type.String(), Type.Null()]),
    }),
    session: Type.Object({
      access_token: Type.String(),
      refresh_token: Type.String(),
      expires_at: Type.Number(),
    }),
    message: Type.String(),
  }),
});

export type ConfirmEmailBody = Static<typeof confirmEmailBodySchema>;
export type ConfirmEmailResponse = Static<typeof confirmEmailResponseSchema>;

export const confirmEmailFastifySchema = {
  description: "Confirm email address",
  tags: ["auth"],
  body: confirmEmailBodySchema,
  response: {
    200: confirmEmailResponseSchema,
  },
} as const;
