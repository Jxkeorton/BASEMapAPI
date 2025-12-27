import { Static, Type } from "@sinclair/typebox";

export const refreshBodySchema = Type.Object({
  refresh_token: Type.String({ minLength: 1 }),
});

export const refreshResponseSchema = Type.Object({
  success: Type.Literal(true),
  data: Type.Object({
    session: Type.Object({
      access_token: Type.String(),
      refresh_token: Type.String(),
      expires_at: Type.Number(),
    }),
  }),
});

export type RefreshBody = Static<typeof refreshBodySchema>;
export type RefreshResponse = Static<typeof refreshResponseSchema>;

export const refreshFastifySchema = {
  description: "Refresh access token using refresh token",
  tags: ["auth"],
  body: refreshBodySchema,
  response: {
    200: refreshResponseSchema,
  },
} as const;
