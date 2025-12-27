import { Static, Type } from "@sinclair/typebox";

export const resendConfirmationBodySchema = Type.Object({
  email: Type.String({ format: "email" }),
});

export const resendConfirmationResponseSchema = Type.Object({
  success: Type.Literal(true),
  message: Type.String(),
});

export type ResendConfirmationBody = Static<
  typeof resendConfirmationBodySchema
>;
export type ResendConfirmationResponse = Static<
  typeof resendConfirmationResponseSchema
>;

export const resendConfirmationFastifySchema = {
  description: "Resend email confirmation",
  tags: ["auth"],
  body: resendConfirmationBodySchema,
  response: {
    200: resendConfirmationResponseSchema,
  },
} as const;
