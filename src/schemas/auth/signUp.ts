import { Static, Type } from "@sinclair/typebox";

export const signUpBodySchema = Type.Object({
  email: Type.String({ format: "email" }),
  password: Type.String({ minLength: 6 }),
  name: Type.Optional(Type.String({ minLength: 1 })),
});

export const signUpResponseSchema = Type.Object({
  success: Type.Literal(true),
  data: Type.Object({
    user: Type.Object({
      id: Type.String(),
      email: Type.String({ format: "email" }),
      email_confirmed_at: Type.Optional(
        Type.Union([Type.String(), Type.Null()])
      ),
    }),
    session: Type.Optional(
      Type.Union([
        Type.Object({
          access_token: Type.String(),
          refresh_token: Type.String(),
          expires_at: Type.Optional(Type.Number()),
        }),
        Type.Null(),
      ])
    ),
    requiresEmailConfirmation: Type.Boolean(),
    message: Type.String(),
  }),
});

export type SignUpBody = Static<typeof signUpBodySchema>;
export type SignUpResponse = Static<typeof signUpResponseSchema>;

export const signUpFastifySchema = {
  description: "Sign up with email and password",
  tags: ["auth"],
  body: signUpBodySchema,
  response: {
    200: signUpResponseSchema,
  },
} as const;
