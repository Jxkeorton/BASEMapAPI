// src/routes/subscriptions/webhook.post.ts
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { supabaseAdmin } from '../../services/supabase';

// RevenueCat webhook validation schema
const revenueCatWebhookSchema = z.object({
  api_version: z.string(),
  event: z.object({
    type: z.string(),
    app_user_id: z.string(),
    product_id: z.string().optional(),
    period_type: z.string().optional(),
    purchased_at_ms: z.number().optional(),
    expiration_at_ms: z.number().optional(),
    is_trial_period: z.boolean().optional(),
    price: z.number().optional(),
    currency: z.string().optional(),
  }),
});

type RevenueCatWebhookBody = z.infer<typeof revenueCatWebhookSchema>;

const webhookFastifySchema = {
  description: 'RevenueCat webhook for subscription updates',
  tags: ['subscriptions'],
  body: {
    type: 'object',
    required: ['api_version', 'event'],
    properties: {
      api_version: { type: 'string' },
      event: {
        type: 'object',
        required: ['type', 'app_user_id'],
        properties: {
          type: { type: 'string', description: 'Event type from RevenueCat' },
          app_user_id: { type: 'string', description: 'User ID from your app' },
          product_id: { type: 'string' },
          period_type: { type: 'string' },
          purchased_at_ms: { type: 'number' },
          expiration_at_ms: { type: 'number' },
          is_trial_period: { type: 'boolean' },
          price: { type: 'number' },
          currency: { type: 'string' },
        },
      },
    },
  }
};

async function prod(request: FastifyRequest<{ Body: RevenueCatWebhookBody }>, reply: FastifyReply) {
  try {
    console.log('🎣 RevenueCat webhook received:', request.body.event.type);

    // Validate request body
    const body = revenueCatWebhookSchema.parse(request.body);
    const { event } = body;
    
    // Map RevenueCat event types to subscription statuses
    let subscriptionStatus: 'free' | 'trial' | 'active' | 'expired' = 'free';
    let expirationDate: string | null = null;

    switch (event.type) {
      case 'INITIAL_PURCHASE':
      case 'RENEWAL':
      case 'PRODUCT_CHANGE':
        subscriptionStatus = event.is_trial_period ? 'trial' : 'active';
        if (event.expiration_at_ms) {
          expirationDate = new Date(event.expiration_at_ms).toISOString();
        }
        console.log(`✅ Subscription activated: ${subscriptionStatus}`);
        break;

      case 'CANCELLATION':
        // User cancelled but still has access until expiration
        subscriptionStatus = 'active';
        if (event.expiration_at_ms) {
          expirationDate = new Date(event.expiration_at_ms).toISOString();
        }
        console.log('⚠️ Subscription cancelled (still active until expiry)');
        break;

      case 'EXPIRATION':
        subscriptionStatus = 'expired';
        if (event.expiration_at_ms) {
          expirationDate = new Date(event.expiration_at_ms).toISOString();
        }
        console.log('❌ Subscription expired');
        break;

      case 'UNCANCELLATION':
        subscriptionStatus = 'active';
        if (event.expiration_at_ms) {
          expirationDate = new Date(event.expiration_at_ms).toISOString();
        }
        console.log('🔄 Subscription reactivated');
        break;

      default:
        console.log(`📝 Unhandled webhook event type: ${event.type}`);
        return reply.send({
          success: true,
          message: 'Event type not processed',
        });
    }

    // Update user subscription in database using admin client
    const { data: updatedProfile, error } = await supabaseAdmin
      .from('profiles')
      .update({
        revenuecat_customer_id: event.app_user_id,
        subscription_status: subscriptionStatus,
        subscription_expires_at: expirationDate,
        subscription_updated_at: new Date().toISOString(),
      })
      .eq('id', event.app_user_id) // app_user_id should be the user's UUID
      .select('id, email')
      .single();

    console.log('📊 Supabase profile update response:', { data: !!updatedProfile, error });

    if (error) {
      console.log('❌ Full error details:', JSON.stringify(error, null, 2));
      request.log.error('Error updating subscription from webhook:', error);
      return reply.code(500).send({
        success: false,
        error: 'Failed to update subscription',
      });
    }

    console.log('✅ Subscription updated from webhook for user:', updatedProfile?.id);

    // Return simple response
    return reply.send({
      success: true,
      message: 'Subscription updated successfully',
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return reply.code(400).send({
        success: false,
        error: 'Invalid webhook data',
        details: error.errors,
      });
    }

    request.log.error('RevenueCat webhook error:', error);
    return reply.code(500).send({
      success: false,
      error: 'Webhook processing failed',
    });
  }
}

export default async function RevenueCatWebhookPost(fastify: FastifyInstance) {
  fastify.post<{
    Body: RevenueCatWebhookBody;
  }>('/subscriptions/webhook', {
    schema: webhookFastifySchema,
    handler: prod
  });
}