import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { supabaseClient } from '../../../services/supabase';

const resendConfirmationBodySchema = z.object({
  email: z.string().email('Invalid email format'),
});

type ResendConfirmationBody = z.infer<typeof resendConfirmationBodySchema>;

const resendConfirmationFastifySchema = {
  description: 'Resend email confirmation',
  tags: ['auth'],
  body: {
    type: 'object',
    required: ['email'],
    properties: {
      email: { type: 'string', format: 'email', description: 'User email' },
    },
  }
};

async function resendConfirmation(
  request: FastifyRequest<{ Body: ResendConfirmationBody }>, 
  reply: FastifyReply
) {
  try {
    console.log('📧 Resend confirmation request for:', request.body.email);

    // Validate request body
    const body = resendConfirmationBodySchema.parse(request.body);
    
    const { error } = await supabaseClient.auth.resend({
      type: 'signup',
      email: body.email,
      options: {
        emailRedirectTo: 'basemapapp://auth/EmailConfirmation'
      }
    });

    if (error) {
      console.log('❌ Resend error:', error.message);
      
      // Handle specific error cases
      if (error.message.includes('Email not confirmed')) {
        return reply.code(400).send({
          success: false,
          error: 'Email address not found or already confirmed',
        });
      }
      
      if (error.message.includes('Email rate limit exceeded')) {
        return reply.code(429).send({
          success: false,
          error: 'Too many requests. Please wait before requesting another confirmation email.',
        });
      }
      
      return reply.code(400).send({
        success: false,
        error: error.message,
      });
    }

    console.log('✅ Confirmation email resent successfully');

    return reply.send({
      success: true,
      message: 'Confirmation email has been resent. Please check your inbox.',
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return reply.code(400).send({
        success: false,
        error: 'Invalid request data',
        details: error.errors,
      });
    }

    request.log.error('Error in resend-confirmation endpoint:', error);
    return reply.code(500).send({
      success: false,
      error: 'Internal server error',
    });
  }
}

export default async function ResendConfirmationPost(fastify: FastifyInstance) {
  fastify.post<{
    Body: ResendConfirmationBody;
  }>('/resend-confirmation', {
    schema: resendConfirmationFastifySchema,
    handler: resendConfirmation,
  });
}