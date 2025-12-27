import { Static, Type } from "@sinclair/typebox";

const signInBodySchema = Type.Object({
  email: Type.String({ format: "email" }),
  password: Type.String({ minLength: 6 }),
});

const signInResponseSchema = Type.Object({
  success: Type.Literal(true),
  data: Type.Object({
    user: Type.Object({
      id: Type.String({ format: "uuid" }),
      email: Type.String({ format: "email" }),
    }),
    session: Type.Object({
      access_token: Type.String(),
      refresh_token: Type.String(),
      expires_at: Type.Number(),
    }),
  }),
});

export const signInFastifySchema = {
  description: "Sign in with email and password",
  tags: ["auth"],
  body: signInBodySchema,
  response: {
    200: signInResponseSchema,
  },
} as const;

export type SignInBody = Static<typeof signInBodySchema>;
export type SignInResponse = Static<typeof signInResponseSchema>;
