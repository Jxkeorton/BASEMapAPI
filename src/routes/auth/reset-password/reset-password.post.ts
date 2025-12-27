import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { resetPasswordFastifySchema } from "../../../schemas/auth/reset-password";
import { supabaseClient } from "../../../services/supabase";

const resetPasswordBodySchema = z.object({
  email: z.string().email("Invalid email format"),
});

type ResetPasswordBody = z.infer<typeof resetPasswordBodySchema>;

async function prod(
  request: FastifyRequest<{ Body: ResetPasswordBody }>,
  reply: FastifyReply
) {
  try {
    // Validate request body
    const body = resetPasswordBodySchema.parse(request.body);

    const { error } = await supabaseClient.auth.resetPasswordForEmail(
      body.email
    );

    if (error) {
      request.log.error("Error sending reset email:", error);
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
  fastify.post<{
    Body: ResetPasswordBody;
  }>("/reset-password", {
    schema: resetPasswordFastifySchema,
    handler: prod,
  });
}
