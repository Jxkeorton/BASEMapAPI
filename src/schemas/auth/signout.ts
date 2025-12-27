import { Static, Type } from "@sinclair/typebox";

export const signOutResponseSchema = Type.Object({
  success: Type.Literal(true),
  message: Type.String(),
});

export type SignOutResponse = Static<typeof signOutResponseSchema>;

export const signOutFastifySchema = {
  description: "Sign out current user",
  tags: ["auth"],
  security: [{ bearerAuth: [] }],
  response: {
    200: signOutResponseSchema,
  },
} as const;
