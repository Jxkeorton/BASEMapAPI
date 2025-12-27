import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { resetPasswordConfirmFastifySchema } from "../../../schemas/auth/reset-password";
import { supabaseClient } from "../../../services/supabase";

const resetPasswordConfirmBodySchema = z.object({
  access_token: z.string(),
  refresh_token: z.string(),
  new_password: z.string().min(6, "Password must be at least 6 characters"),
});

type ResetPasswordConfirmBody = z.infer<typeof resetPasswordConfirmBodySchema>;

async function prod(
  request: FastifyRequest<{ Body: ResetPasswordConfirmBody }>,
  reply: FastifyReply
) {
  try {
    // Validate request body
    const body = resetPasswordConfirmBodySchema.parse(request.body);

    // Set the session with the tokens from the reset email
    const { data: sessionData, error: sessionError } =
      await supabaseClient.auth.setSession({
        access_token: body.access_token,
        refresh_token: body.refresh_token,
      });

    if (sessionError || !sessionData.user) {
      throw sessionError;
    }

    // Update the user's password
    const { error: updateError } = await supabaseClient.auth.updateUser({
      password: body.new_password,
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
  fastify.post<{
    Body: ResetPasswordConfirmBody;
  }>("/reset-password-confirm", {
    schema: resetPasswordConfirmFastifySchema,
    handler: prod,
  });
}
