import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import {
  ResendConfirmationBody,
  resendConfirmationFastifySchema,
} from "../../../schemas/auth/resend-confirmation";
import { supabaseClient } from "../../../services/supabase";

async function resendConfirmation(
  request: FastifyRequest<{ Body: ResendConfirmationBody }>,
  reply: FastifyReply
) {
  try {
    const { email } = request.body;

    const { error } = await supabaseClient.auth.resend({
      type: "signup",
      email,
      options: {
        emailRedirectTo: "base.map://",
      },
    });

    if (error) {
      // Handle specific error cases
      if (error.message.includes("Email not confirmed")) {
        throw error;
      }

      if (error.message.includes("Email rate limit exceeded")) {
        throw error;
      }

      throw error;
    }

    return reply.send({
      success: true,
      message: "Confirmation email has been resent. Please check your inbox.",
    });
  } catch (error) {
    request.log.error("Error in resend-confirmation endpoint:", error);
    throw error;
  }
}

export default async function ResendConfirmationPost(fastify: FastifyInstance) {
  fastify.post<{
    Body: ResendConfirmationBody;
  }>("/resend-confirmation", {
    schema: resendConfirmationFastifySchema,
    handler: resendConfirmation,
  });
}
