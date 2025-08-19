import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { supabaseAdmin } from '../../services/supabase';
import { authenticateUser, AuthenticatedRequest } from '../../middleware/auth';
import { User } from '@supabase/supabase-js';
import { deleteAccountFastifySchema } from '../../schemas/auth/delete';

/**
 * Verify user identity based on their authentication method
 */
async function verifyUserIdentity(
  user: User, 
  password?: string, 
  method?: string
): Promise<{ success: boolean; error?: string; method?: string }> {
  
  try {
    // Get user's authentication identities
    const { data: identities, error: identitiesError } = await supabaseAdmin.auth.admin.getUserById(user.id);
    
    if (identitiesError || !identities.user) {
      return { success: false, error: 'Unable to fetch user authentication details' };
    }

    const userIdentities = identities.user.identities || [];
    const hasEmailPassword = userIdentities.some(identity => identity.provider === 'email');
    const hasOAuthOnly = userIdentities.length > 0 && !hasEmailPassword;

    console.log('🔍 User identity analysis:', {
      userId: user.id,
      totalIdentities: userIdentities.length,
      hasEmailPassword,
      hasOAuthOnly,
      providers: userIdentities.map(i => i.provider)
    });

    // Method 1: Password verification (for email/password users)
    if (hasEmailPassword && password) {
      const { error: passwordError } = await supabaseAdmin.auth.signInWithPassword({
        email: user.email!,
        password: password,
      });

      if (!passwordError) {
        return { success: true, method: 'password' };
      } else {
        return { success: false, error: 'Invalid password. Account deletion cancelled.' };
      }
    }

    // Method 2: Trusted session verification (for OAuth users)
    if (hasOAuthOnly && !password) {
      // For OAuth users, we rely on the fact that they have a valid, recent session
      console.log('⚠️ OAuth user - using trusted session verification');
      return { success: true, method: 'trusted_session' };
    }

    // Method 3: Handle mixed cases
    if (hasEmailPassword && !password) {
      return { 
        success: false, 
        error: 'Password required for account deletion. This account uses email/password authentication.' 
      };
    }

    if (hasOAuthOnly && password) {
      return { 
        success: false, 
        error: 'This account uses OAuth authentication (Google/Apple). Password not required.' 
      };
    }

    // Fallback
    return { success: false, error: 'Unable to verify user identity' };

  } catch (error) {
    console.error('Error in verifyUserIdentity:', error);
    return { success: false, error: 'Identity verification failed' };
  }
}

const deleteAccountBodySchema = z.object({
  confirmation: z.string().min(1, 'Confirmation is required'),
  password: z.string().min(6, 'Password is required for account deletion').optional(),
  verification_method: z.enum(['password', 'reauthentication', 'trusted_session']).optional()
});

type DeleteAccountBody = z.infer<typeof deleteAccountBodySchema>;

async function deleteAccount(
  request: FastifyRequest<{ Body: DeleteAccountBody }>, 
  reply: FastifyReply
) {
  try {
    const authenticatedRequest = request as AuthenticatedRequest;
    const userId = authenticatedRequest.user.id;
    
    console.log('🗑️ Account deletion request for user:', userId);

    // Validate request body
    const body = deleteAccountBodySchema.parse(request.body);

    // Check confirmation text
    if (body.confirmation.toUpperCase() !== 'DELETE') {
      console.log('❌ Invalid confirmation text:', body.confirmation);
      return reply.code(400).send({
        success: false,
        error: 'Confirmation must be "DELETE" to proceed with account deletion',
      });
    }

    // Verify user identity based on their authentication method
    const identityVerified = await verifyUserIdentity(authenticatedRequest.user, body.password, body.verification_method);
    
    if (!identityVerified.success) {
      console.log('❌ Identity verification failed:', identityVerified.error);
      return reply.code(401).send({
        success: false,
        error: identityVerified.error,
      });
    }

    console.log('✅ Identity verified via:', identityVerified.method);

    // Get user profile for logging purposes
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('username, email, name')
      .eq('id', userId)
      .single();

    console.log('👤 Deleting account for:', profile?.username || profile?.email);

    // Delete user profile (this will cascade to related data due to foreign keys)
    // Service role bypasses RLS policies automatically
    console.log('🗑️ Deleting profile and cascading related data...');
    const { error: profileDeleteError } = await supabaseAdmin
      .from('profiles')
      .delete()
      .eq('id', userId);

    if (profileDeleteError) {
      console.log('❌ Error deleting profile:', profileDeleteError.message);
      return reply.code(500).send({
        success: false,
        error: 'Failed to delete account data. Please try again or contact support.',
      });
    }

    console.log('✅ Profile deleted, related data cascaded via foreign keys');

    // Delete from Supabase Auth (final step)
    console.log('🗑️ Deleting user from Supabase Auth...');
    const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (authDeleteError) {
      console.log('❌ Error deleting auth user:', authDeleteError.message);
      return reply.code(500).send({
        success: false,
        error: 'Account data deleted but authentication cleanup failed. Please contact support.',
      });
    }

    console.log('✅ Account fully deleted:', profile?.username || profile?.email);

    return reply.send({
      success: true,
      message: 'Account has been permanently deleted. All your data has been removed.',
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return reply.code(400).send({
        success: false,
        error: 'Invalid request data',
        details: error.errors,
      });
    }

    console.log('❌ Unexpected error during account deletion:', error);
    request.log.error('Error in account deletion endpoint:', error);
    return reply.code(500).send({
      success: false,
      error: 'An unexpected error occurred during account deletion. Please try again or contact support.',
    });
  }
}

export default async function ProfileDelete(fastify: FastifyInstance) {
  fastify.delete('/delete-account', {
    schema: deleteAccountFastifySchema,
    preHandler: authenticateUser,
    handler: deleteAccount
  });
}