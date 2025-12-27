import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import {
  ConfirmEmailBody,
  confirmEmailFastifySchema,
} from "../../../schemas/auth/confirm-email";
import { supabaseClient } from "../../../services/supabase";

async function confirmEmail(
  request: FastifyRequest<{ Body: ConfirmEmailBody }>,
  reply: FastifyReply
) {
  try {
    const { token, type } = request.body;

    const { data, error } = await supabaseClient.auth.verifyOtp({
      token_hash: token,
      type: type,
    });

    if (error) {
      throw error;
    }

    if (!data.user || !data.session) {
      throw new Error("Invalid user or session data");
    }

    return reply.send({
      success: true,
      data: {
        user: {
          id: data.user.id,
          email: data.user.email,
          email_confirmed_at: data.user.email_confirmed_at,
        },
        session: {
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
          expires_at: data.session.expires_at,
        },
        message: "Email confirmed successfully! You are now logged in.",
      },
    });
  } catch (error) {
    request.log.error("Error in confirm-email endpoint:", error);
    throw error;
  }
}

export default async function ConfirmEmailPost(fastify: FastifyInstance) {
  fastify.post("/confirm-email", {
    schema: confirmEmailFastifySchema,
    handler: confirmEmail,
  });
}
