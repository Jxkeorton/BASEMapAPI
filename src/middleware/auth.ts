import { FastifyRequest, FastifyReply } from 'fastify';
import { User } from '@supabase/supabase-js';
import { supabaseClient, supabaseAdmin } from '../services/supabase';

export type UserRole = 'USER' | 'ADMIN' | 'SUPERUSER';

export interface AuthenticatedRequest extends FastifyRequest {
  user: User;
  userRole?: UserRole;
  profile?: any;
}

/**
 * Enhanced middleware to verify JWT token and attach user + role to request
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

    // Get user profile and role
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.log('⚠️ Warning: Could not fetch user profile:', profileError.message);
      // Still allow authentication, but without role info
      (request as AuthenticatedRequest).user = user;
      return;
    }

    console.log('👤 User role:', profile.role);

    // Attach user, profile, and role to request
    const authenticatedRequest = request as AuthenticatedRequest;
    authenticatedRequest.user = user;
    authenticatedRequest.profile = profile;
    authenticatedRequest.userRole = profile.role;
    
  } catch (error) {
    console.log('❌ Authentication error:', error);
    request.log.error('Authentication error:', error);
    return reply.code(500).send({
      success: false,
      error: 'Authentication failed'
    });
  }
};

/**
 * Middleware to require specific role or higher
 */
export const requireRole = (requiredRole: UserRole) => {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const authenticatedRequest = request as AuthenticatedRequest;
    
    if (!authenticatedRequest.user) {
      return reply.code(401).send({
        success: false,
        error: 'Authentication required'
      });
    }

    if (!authenticatedRequest.userRole) {
      return reply.code(403).send({
        success: false,
        error: 'User role not found'
      });
    }

    if (!hasRequiredRole(authenticatedRequest.userRole, requiredRole)) {
      return reply.code(403).send({
        success: false,
        error: `Access denied. ${requiredRole} role required.`,
        userRole: authenticatedRequest.userRole,
        requiredRole: requiredRole
      });
    }

    console.log(`✅ Role check passed: ${authenticatedRequest.userRole} >= ${requiredRole}`);
  };
};

/**
 * Helper function to check role hierarchy
 */
function hasRequiredRole(userRole: UserRole, requiredRole: UserRole): boolean {
  const roleHierarchy: Record<UserRole, number> = {
    'USER': 1,
    'ADMIN': 2,
    'SUPERUSER': 3
  };

  return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
}

/**
 * Convenience middlewares
 */
export const requireAdmin = requireRole('ADMIN');
export const requireSuperuser = requireRole('SUPERUSER');