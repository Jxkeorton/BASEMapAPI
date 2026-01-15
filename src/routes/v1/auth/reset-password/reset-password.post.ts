import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import {
  ResetPasswordBody,
  resetPasswordFastifySchema,
} from "../../../../schemas/auth/reset-password";
import { supabaseClient } from "../../../../services/supabase";

async function prod(
  request: FastifyRequest<{ Body: ResetPasswordBody }>,
  reply: FastifyReply
) {
  try {
    const { email } = request.body;

    const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
      redirectTo: "base.map://reset-password-confirm",
    });

    if (error) {
      throw error;
    }

    // Always return success (don't reveal if email exists or not)
    return reply.send({
      success: true,
      message:
        "If an account with that email exists, a password reset link has been sent.",
    });
  } catch (error) {
    request.log.error("Error in reset-password endpoint:", error);
    throw error;
  }
}

export default async function ResetPasswordPost(fastify: FastifyInstance) {
  fastify.post("/reset-password", {
    schema: resetPasswordFastifySchema,
    handler: prod,
  });
}
