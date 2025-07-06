// src/middleware/auth.ts
import { FastifyRequest, FastifyReply } from 'fastify';
import { User } from '@supabase/supabase-js';
import { supabaseClient } from '../services/supabase';

export interface AuthenticatedRequest extends FastifyRequest {
  user: User;
}

/**
 * Middleware to verify JWT token and attach user to request
 */
export const authenticateUser = async (
  request: FastifyRequest,
  reply: FastifyReply
) => {
  try {
    console.log('🔐 Authenticating request...');

    // Get token from Authorization header
    const authHeader = request.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('❌ Missing or invalid authorization header');
      return reply.code(401).send({
        success: false,
        error: 'Missing or invalid authorization header'
      });
    }

    const token = authHeader.split(' ')[1];
    console.log('🔍 Token found, verifying with Supabase...');
    
    // Verify token with Supabase
    const { data: { user }, error } = await supabaseClient.auth.getUser(token);
    
    console.log('📊 Supabase verification response:', { user: !!user, error });
    
    if (error || !user) {
      console.log('❌ Token verification failed:', error?.message);
      return reply.code(401).send({
        success: false,
        error: 'Invalid or expired token'
      });
    }

    console.log('✅ User authenticated:', user.id);

    // Attach user to request
    (request as AuthenticatedRequest).user = user;
    
  } catch (error) {
    console.log('❌ Authentication error:', error);
    request.log.error('Authentication error:', error);
    return reply.code(500).send({
      success: false,
      error: 'Authentication failed'
    });
  }
};