import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { supabaseClient } from '../../services/supabase';
import { refreshFastifySchema } from '../../schemas/auth/refresh';

const refreshBodySchema = z.object({
  refresh_token: z.string().min(1, 'Refresh token is required'),
});

type RefreshBody = z.infer<typeof refreshBodySchema>;

async function prod(request: FastifyRequest<{ Body: RefreshBody }>, reply: FastifyReply) {
  try {
    // Validate request body
    const body = refreshBodySchema.parse(request.body);
    
    // Refresh session with Supabase
    const { data, error } = await supabaseClient.auth.refreshSession({
      refresh_token: body.refresh_token,
    });

    if (error) {
      request.log.error('Error refreshing token:', error);
      return reply.code(401).send({ 
        success: false, 
        error: 'Invalid or expired refresh token' 
      });
    }

    if (!data.session) {
      return reply.code(401).send({
        success: false,
        error: 'Failed to refresh session',
      });
    }

    return reply.send({
      success: true,
      data: {
        session: {
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
          expires_at: data.session.expires_at,
        },
      },
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return reply.code(400).send({ 
        success: false, 
        error: 'Invalid request data', 
        details: error.errors 
      });
    }
    
    request.log.error('Error in refresh endpoint:', error);
    return reply.code(500).send({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
}

export default async function RefreshPost(fastify: FastifyInstance) {
  fastify.post<{
    Body: RefreshBody;
  }>('/refresh', {
    schema: refreshFastifySchema,
    handler: prod
  });
}