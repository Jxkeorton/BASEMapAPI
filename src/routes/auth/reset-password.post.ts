import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { supabaseClient } from '../../services/supabase';

const resetPasswordBodySchema = z.object({
  email: z.string().email('Invalid email format'),
});

type ResetPasswordBody = z.infer<typeof resetPasswordBodySchema>;

const resetPasswordFastifySchema = {
  description: 'Send password reset email to user',
  tags: ['auth'],
  body: {
    type: 'object',
    required: ['email'],
    properties: {
      email: { type: 'string', format: 'email', description: 'User email address' },
    },
  }
};

async function prod(request: FastifyRequest<{ Body: ResetPasswordBody }>, reply: FastifyReply) {
  try {
    console.log('🔑 Password reset request for:', request.body.email);

    // Validate request body
    const body = resetPasswordBodySchema.parse(request.body);

    console.log(supabaseClient);
    
    const { error } = await supabaseClient.auth.resetPasswordForEmail(
      body.email,
      {
        redirectTo: 'basemapapp://auth/ResetPasswordConfirm'
      }
    );

    console.log('📊 Supabase reset password response:', { error });

    if (error) {
      console.log('❌ Full error details:', JSON.stringify(error, null, 2));
      request.log.error('Error sending reset email:', error);
      return reply.code(400).send({ 
        success: false, 
        error: error.message 
      });
    }

    console.log('📊 Supabase reset password response:', { error });

    if (error) {
      console.log('❌ Full error details:', JSON.stringify(error, null, 2));
      request.log.error('Error sending reset email:', error);
      return reply.code(400).send({ 
        success: false, 
        error: error 
      });
    }

    console.log('✅ Password reset email sent successfully');

    // Always return success (don't reveal if email exists or not)
    return reply.send({
      success: true,
      message: 'If an account with that email exists, a password reset link has been sent.',
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return reply.code(400).send({ 
        success: false, 
        error: 'Invalid request data', 
        details: error.errors 
      });
    }
    
    request.log.error('Error in reset-password endpoint:', error);
    return reply.code(500).send({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
}

export default async function ResetPasswordPost(fastify: FastifyInstance) {
  fastify.post<{
    Body: ResetPasswordBody;
  }>('/reset-password', {
    schema: resetPasswordFastifySchema,
    handler: prod
  });
}