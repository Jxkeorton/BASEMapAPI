import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import {
  ResetPasswordConfirmBody,
  resetPasswordConfirmFastifySchema,
} from "../../../../schemas/auth/reset-password";
import { supabaseAdmin, supabaseClient } from "../../../../services/supabase";

async function prod(
  request: FastifyRequest<{ Body: ResetPasswordConfirmBody }>,
  reply: FastifyReply,
) {
  try {
    const { token_hash, type, new_password } = request.body;

    if (!token_hash) {
      return reply.code(400).send({
        success: false,
        error: "Missing token_hash",
      });
    }

    const otpType = type ?? "recovery";

    if (otpType !== "recovery") {
      return reply.code(400).send({
        success: false,
        error: "Invalid OTP type",
      });
    }

    const { data: verifyData, error: verifyError } =
      await supabaseClient.auth.verifyOtp({
        token_hash,
        type: "recovery",
      });

    if (verifyError || !verifyData.user) {
      throw verifyError ?? new Error("Invalid or expired reset link");
    }

    const user = verifyData.user;

    const { error: updateError } =
      await supabaseAdmin.auth.admin.updateUserById(user.id, {
        password: new_password,
        app_metadata: {
          ...(user.app_metadata ?? {}),
          force_password_reset: false,
        },
      });

    if (updateError) {
      throw updateError;
    }

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
  fastify: FastifyInstance,
) {
  fastify.post("/reset-password/confirm", {
    schema: resetPasswordConfirmFastifySchema,
    handler: prod,
  });
}
