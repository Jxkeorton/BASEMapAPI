import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { supabaseClient } from '../../../services/supabase';
import { resetPasswordConfirmFastifySchema } from '../../../schemas/auth/reset-password';

const resetPasswordConfirmBodySchema = z.object({
  access_token: z.string(),
  refresh_token: z.string(),
  new_password: z.string().min(6, 'Password must be at least 6 characters'),
});

type ResetPasswordConfirmBody = z.infer<typeof resetPasswordConfirmBodySchema>;

async function prod(request: FastifyRequest<{ Body: ResetPasswordConfirmBody }>, reply: FastifyReply) {
  try {
    console.log('🔑 Password reset confirmation request');

    // Validate request body
    const body = resetPasswordConfirmBodySchema.parse(request.body);

    // Set the session with the tokens from the reset email
    const { data: sessionData, error: sessionError } = await supabaseClient.auth.setSession({
      access_token: body.access_token,
      refresh_token: body.refresh_token,
    });

    if (sessionError || !sessionData.user) {
      console.log('❌ Invalid or expired reset tokens:', sessionError?.message);
      return reply.code(400).send({
        success: false,
        error: 'Invalid or expired reset tokens',
      });
    }

    console.log('✅ Reset tokens validated for user:', sessionData.user.id);

    // Update the user's password
    const { error: updateError } = await supabaseClient.auth.updateUser({
      password: body.new_password
    });

    if (updateError) {
      console.log('❌ Error updating password:', updateError.message);
      return reply.code(400).send({
        success: false,
        error: updateError.message,
      });
    }

    console.log('✅ Password updated successfully for user:', sessionData.user.id);

    // Return success response
    return reply.send({
      success: true,
      message: 'Password reset successfully',
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return reply.code(400).send({
        success: false,
        error: 'Invalid request data',
        details: error.errors,
      });
    }

    request.log.error('Error in reset-password-confirm endpoint:', error);
    return reply.code(500).send({
      success: false,
      error: 'Internal server error',
    });
  }
}

export default async function ResetPasswordConfirmPost(fastify: FastifyInstance) {
  fastify.post<{
    Body: ResetPasswordConfirmBody;
  }>('/reset-password-confirm', {
    schema: resetPasswordConfirmFastifySchema,
    handler: prod
  });
}