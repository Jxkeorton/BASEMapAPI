import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { supabaseClient } from '../../services/supabase';

const confirmEmailBodySchema = z.object({
  token: z.string(),
  type: z.enum(['signup', 'recovery', 'email_change']),
});

type ConfirmEmailBody = z.infer<typeof confirmEmailBodySchema>;

async function confirmEmail(
  request: FastifyRequest<{ Body: ConfirmEmailBody }>, 
  reply: FastifyReply
) {
  try {
    const { token, type } = confirmEmailBodySchema.parse(request.body);

    const { data, error } = await supabaseClient.auth.verifyOtp({
      token_hash: token,
      type: type,
    });

    if (error) {
      console.log('❌ Email confirmation error:', error.message);
      return reply.code(400).send({
        success: false,
        error: 'Invalid or expired confirmation token',
      });
    }

    if (!data.user || !data.session) {
      return reply.code(400).send({
        success: false,
        error: 'Confirmation failed',
      });
    }

    console.log('✅ Email confirmed for user:', data.user.id);

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
        message: 'Email confirmed successfully! You are now logged in.',
      },
    });

  } catch (error) {
    request.log.error('Error in confirm-email endpoint:', error);
    return reply.code(500).send({
      success: false,
      error: 'Internal server error',
    });
  }
}

export default async function ConfirmEmailPost(fastify: FastifyInstance) {
  fastify.post('/confirm-email', {
    schema: {
      description: 'Confirm email address',
      tags: ['auth'],
      body: {
        type: 'object',
        required: ['token', 'type'],
        properties: {
          token: { type: 'string' },
          type: { type: 'string', enum: ['signup', 'recovery', 'email_change'] },
        },
      },
    },
    handler: confirmEmail,
  });
}