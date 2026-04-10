import { createClient } from "@supabase/supabase-js";
import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import {
  ResetPasswordConfirmBody,
  resetPasswordConfirmFastifySchema,
} from "../../../../schemas/auth/reset-password";
import { supabaseAdmin } from "../../../../services/supabase";

function getRequestScopedAnonClient() {
  // Request-scoped client avoids shared auth state between requests.
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    },
  );
}

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

    const supabase = getRequestScopedAnonClient();

    // 1) Verify reset token
    const { data: verifyData, error: verifyError } =
      await supabase.auth.verifyOtp({
        token_hash,
        type: "recovery",
      });

    if (verifyError || !verifyData?.user) {
      return reply.code(400).send({
        success: false,
        error: verifyError?.message ?? "Invalid or expired reset link",
      });
    }

    const user = verifyData.user;
    if (!user.email) {
      return reply.code(400).send({
        success: false,
        error: "User email missing",
      });
    }

    // 2) Update password and clear force reset flag
    const { error: updateError } =
      await supabaseAdmin.auth.admin.updateUserById(user.id, {
        password: new_password,
        app_metadata: {
          ...(user.app_metadata ?? {}),
          force_password_reset: false,
        },
      });

    if (updateError) {
      return reply.code(500).send({
        success: false,
        error: updateError.message,
      });
    }

    // 3) fresh session after password update
    const { data: signInData, error: signInError } =
      await supabase.auth.signInWithPassword({
        email: user.email,
        password: new_password,
      });

    if (signInError || !signInData?.session) {
      return reply.code(401).send({
        success: false,
        error: signInError?.message ?? "Could not create session after reset",
      });
    }

    return reply.send({
      success: true,
      message: "Password reset successfully",
      data: {
        user: {
          id: signInData.user.id,
          email: signInData.user.email!,
          force_password_reset: false,
        },
        session: {
          access_token: signInData.session.access_token,
          refresh_token: signInData.session.refresh_token,
          expires_at: signInData.session.expires_at,
        },
      },
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
