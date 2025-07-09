import { FastifyRequest, FastifyReply } from 'fastify';
import { supabaseAdmin } from '../services/supabase';
import { AuthenticatedRequest } from './auth';

/**
 * Middleware to check if user has active subscription
 * Must be used AFTER authenticateUser middleware
 */
export const requireSubscription = async (
  request: FastifyRequest,
  reply: FastifyReply
) => {
  try {
    const authenticatedRequest = request as AuthenticatedRequest;
    
    if (!authenticatedRequest.user) {
      return reply.code(401).send({
        success: false,
        error: 'Authentication required'
      });
    }

    console.log('🔒 Checking subscription for user:', authenticatedRequest.user.id);

    // Get user's subscription status from profiles table
    const { data: profile, error } = await supabaseAdmin
      .from('profiles')
      .select('subscription_status, subscription_expires_at')
      .eq('id', authenticatedRequest.user.id)
      .single();

    if (error) {
      console.log('❌ Error checking subscription status:', error.message);
      return reply.code(500).send({
        success: false,
        error: 'Failed to check subscription status'
      });
    }

    if (!profile) {
      console.log('❌ No profile found for user');
      return reply.code(404).send({
        success: false,
        error: 'User profile not found'
      });
    }

    // Check if subscription is active
    const hasActiveSubscription = profile.subscription_status === 'active' || 
                                 profile.subscription_status === 'trial';
    
    // Check if subscription has expired
    const isNotExpired = !profile.subscription_expires_at || 
                        new Date(profile.subscription_expires_at) > new Date();

    console.log('📊 Subscription check:', {
      status: profile.subscription_status,
      expires_at: profile.subscription_expires_at,
      hasActiveSubscription,
      isNotExpired
    });

    if (!hasActiveSubscription || !isNotExpired) {
      console.log('❌ Access denied - subscription required');
      return reply.code(403).send({
        success: false,
        error: 'Active subscription required to access this feature',
        subscription_status: profile.subscription_status,
        subscription_expires_at: profile.subscription_expires_at
      });
    }

    console.log('✅ Subscription verified - access granted');

  } catch (error) {
    console.log('❌ Subscription middleware error:', error);
    request.log.error('Subscription check error:', error);
    return reply.code(500).send({
      success: false,
      error: 'Failed to verify subscription'
    });
  }
};

/**
 * Useful for routes that want to show different content based on subscription
 */
export const attachSubscriptionInfo = async (
  request: FastifyRequest,
  reply: FastifyReply
) => {
  try {
    const authenticatedRequest = request as AuthenticatedRequest;
    
    if (!authenticatedRequest.user) {
      return; // Not authenticated, continue without subscription info
    }

    console.log('📋 Attaching subscription info for user:', authenticatedRequest.user.id);

    // Get user's subscription status
    const { data: profile, error } = await supabaseAdmin
      .from('profiles')
      .select('subscription_status, subscription_expires_at, revenuecat_customer_id')
      .eq('id', authenticatedRequest.user.id)
      .single();

    if (!error && profile) {
      // Add subscription info to request
      (authenticatedRequest as any).subscription = {
        status: profile.subscription_status,
        expires_at: profile.subscription_expires_at,
        revenuecat_customer_id: profile.revenuecat_customer_id,
        is_premium: profile.subscription_status === 'active' || profile.subscription_status === 'trial'
      };
      
      console.log('✅ Subscription info attached:', {
        status: profile.subscription_status,
        is_premium: (authenticatedRequest as any).subscription.is_premium
      });
    }

  } catch (error) {
    console.log('⚠️ Error attaching subscription info (non-blocking):', error);
    // Don't fail the request, just continue without subscription info
  }
};