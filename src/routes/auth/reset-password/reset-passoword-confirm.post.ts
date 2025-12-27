import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import {
  ResetPasswordConfirmBody,
  resetPasswordConfirmFastifySchema,
} from "../../../schemas/auth/reset-password";
import { supabaseClient } from "../../../services/supabase";

async function prod(
  request: FastifyRequest<{ Body: ResetPasswordConfirmBody }>,
  reply: FastifyReply
) {
  try {
    const { access_token, refresh_token, new_password } = request.body;

    // Set the session with the tokens from the reset email
    const { data: sessionData, error: sessionError } =
      await supabaseClient.auth.setSession({
        access_token,
        refresh_token,
      });

    if (sessionError || !sessionData.user) {
      throw sessionError;
    }

    // Update the user's password
    const { error: updateError } = await supabaseClient.auth.updateUser({
      password: new_password,
    });

    if (updateError) {
      throw updateError;
    }

    // Return success response
    return reply.send({
      success: true,
      message: "Password reset successfully",
    });
  } catch (error) {
    request.log.error("Error in reset-password-confirm endpoint:", error);
    throw error;
  }
}

export default async function ResetPasswordConfirmPost(
  fastify: FastifyInstance
) {
  fastify.post("/reset-password/confirm", {
    schema: resetPasswordConfirmFastifySchema,
    handler: prod,
  });
}
