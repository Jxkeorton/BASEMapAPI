import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import {
  SignInBody,
  SignInInvalidCredentialsResponse,
  SignInResponse,
  signInFastifySchema,
} from "../../../schemas/auth/signIn";
import { logger } from "../../../services/logger";
import { supabaseAdmin, supabaseClient } from "../../../services/supabase";

async function getForcePasswordResetFlagByEmail(
  email: string,
): Promise<boolean> {
  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  if (profileError || !profile?.id) {
    return false;
  }

  const { data: userResult, error: userError } =
    await supabaseAdmin.auth.admin.getUserById(profile.id);

  if (userError || !userResult.user) {
    return false;
  }

  return Boolean(userResult.user.app_metadata?.force_password_reset);
}

async function prod(
  request: FastifyRequest<{ Body: SignInBody }>,
  reply: FastifyReply,
) {
  const { email, password } = request.body;

  logger.info("User signin attempt", { email });

  const { data, error } = await supabaseClient.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    if (error.message === "Invalid login credentials") {
      const forcePasswordReset = await getForcePasswordResetFlagByEmail(email);
      const response: SignInInvalidCredentialsResponse = {
        success: false,
        message: "Invalid login credentials",
        force_password_reset: forcePasswordReset,
      };

      return reply.code(401).send(response);
    }

    throw error;
  }

  logger.info("User signin successful", {
    userId: data.user.id,
    email: data.user.email,
  });

  const response: SignInResponse = {
    success: true,
    data: {
      user: {
        id: data.user.id,
        email: data.user.email!,
        force_password_reset: Boolean(
          data.user.app_metadata?.force_password_reset,
        ),
      },
      session: {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_at: data.session.expires_at!,
      },
    },
  };

  return reply.send(response);
}

export default async function SignInPost(fastify: FastifyInstance) {
  fastify.post("/signin", {
    schema: signInFastifySchema,
    handler: prod,
  });
}
