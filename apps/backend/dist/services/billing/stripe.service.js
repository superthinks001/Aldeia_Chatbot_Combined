"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StripeService = exports.SUBSCRIPTION_PLANS = exports.SubscriptionTier = void 0;
const stripe_1 = __importDefault(require("stripe"));
const database_1 = require("../../config/database");
const logger_1 = require("../../utils/logger");
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || '';
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || '';
// Initialize Stripe
const stripe = new stripe_1.default(STRIPE_SECRET_KEY, {
    apiVersion: '2025-10-29.clover',
});
var SubscriptionTier;
(function (SubscriptionTier) {
    SubscriptionTier["FREE"] = "free";
    SubscriptionTier["PRO"] = "pro";
    SubscriptionTier["ENTERPRISE"] = "enterprise";
})(SubscriptionTier || (exports.SubscriptionTier = SubscriptionTier = {}));
// Subscription plans
exports.SUBSCRIPTION_PLANS = {
    [SubscriptionTier.FREE]: {
        tier: SubscriptionTier.FREE,
        name: 'Free Tier',
        price: 0,
        messagesLimit: 10,
        features: [
            '10 messages per day',
            'Basic fire recovery information',
            'Community support',
        ],
    },
    [SubscriptionTier.PRO]: {
        tier: SubscriptionTier.PRO,
        name: 'Pro Tier',
        price: 9999, // $99.99
        messagesLimit: 100,
        features: [
            '100 messages per day',
            'Voice input/output',
            'Multilingual support',
            'Priority support',
            'Conversation history',
        ],
    },
    [SubscriptionTier.ENTERPRISE]: {
        tier: SubscriptionTier.ENTERPRISE,
        name: 'Enterprise Tier',
        price: 49999, // $499.99
        messagesLimit: -1, // unlimited
        features: [
            'Unlimited messages',
            'All Pro features',
            'Custom integrations',
            'Dedicated support',
            'API access',
            'Multi-user organization',
        ],
    },
};
class StripeService {
    /**
     * Create a new Stripe customer
     */
    static async createCustomer(userId, email, name) {
        try {
            const customer = await stripe.customers.create({
                email,
                name,
                metadata: {
                    userId: userId.toString(),
                },
            });
            // Save customer ID to database
            await database_1.supabase
                .from('users')
                .update({ stripe_customer_id: customer.id })
                .eq('id', userId);
            logger_1.logger.info(`Created Stripe customer ${customer.id} for user ${userId}`);
            return customer.id;
        }
        catch (error) {
            logger_1.logger.error('Error creating Stripe customer:', error);
            throw error;
        }
    }
    /**
     * Get or create Stripe customer ID for a user
     */
    static async getOrCreateCustomer(userId, email, name) {
        // Check if user already has a customer ID
        const { data: user } = await database_1.supabase
            .from('users')
            .select('stripe_customer_id')
            .eq('id', userId)
            .single();
        if (user?.stripe_customer_id) {
            return user.stripe_customer_id;
        }
        // Create new customer
        return await this.createCustomer(userId, email, name);
    }
    /**
     * Create a checkout session for subscription
     */
    static async createCheckoutSession(userId, tier, successUrl, cancelUrl) {
        try {
            const plan = exports.SUBSCRIPTION_PLANS[tier];
            if (!plan.stripePriceId) {
                throw new Error(`No Stripe price ID configured for ${tier} tier`);
            }
            // Get user info
            const { data: user } = await database_1.supabase
                .from('users')
                .select('email, name, stripe_customer_id')
                .eq('id', userId)
                .single();
            if (!user) {
                throw new Error('User not found');
            }
            // Get or create customer
            const customerId = await this.getOrCreateCustomer(userId, user.email, user.name);
            // Create checkout session
            const session = await stripe.checkout.sessions.create({
                customer: customerId,
                mode: 'subscription',
                payment_method_types: ['card'],
                line_items: [
                    {
                        price: plan.stripePriceId,
                        quantity: 1,
                    },
                ],
                success_url: successUrl,
                cancel_url: cancelUrl,
                metadata: {
                    userId: userId.toString(),
                    tier,
                },
            });
            logger_1.logger.info(`Created checkout session ${session.id} for user ${userId}`);
            return session;
        }
        catch (error) {
            logger_1.logger.error('Error creating checkout session:', error);
            throw error;
        }
    }
    /**
     * Create a billing portal session
     */
    static async createPortalSession(userId, returnUrl) {
        try {
            const { data: user } = await database_1.supabase
                .from('users')
                .select('stripe_customer_id')
                .eq('id', userId)
                .single();
            if (!user?.stripe_customer_id) {
                throw new Error('No Stripe customer found for user');
            }
            const session = await stripe.billingPortal.sessions.create({
                customer: user.stripe_customer_id,
                return_url: returnUrl,
            });
            return session;
        }
        catch (error) {
            logger_1.logger.error('Error creating portal session:', error);
            throw error;
        }
    }
    /**
     * Handle Stripe webhook events
     */
    static async handleWebhookEvent(event) {
        try {
            switch (event.type) {
                case 'customer.subscription.created':
                case 'customer.subscription.updated':
                    await this.handleSubscriptionUpdate(event.data.object);
                    break;
                case 'customer.subscription.deleted':
                    await this.handleSubscriptionDeleted(event.data.object);
                    break;
                case 'invoice.payment_succeeded':
                    await this.handlePaymentSucceeded(event.data.object);
                    break;
                case 'invoice.payment_failed':
                    await this.handlePaymentFailed(event.data.object);
                    break;
                default:
                    logger_1.logger.info(`Unhandled webhook event type: ${event.type}`);
            }
        }
        catch (error) {
            logger_1.logger.error(`Error handling webhook event ${event.type}:`, error);
            throw error;
        }
    }
    /**
     * Handle subscription created/updated
     */
    static async handleSubscriptionUpdate(subscription) {
        const userId = parseInt(subscription.metadata.userId);
        const tier = subscription.metadata.tier;
        await database_1.supabase
            .from('subscriptions')
            .upsert({
            user_id: userId,
            stripe_subscription_id: subscription.id,
            tier,
            status: subscription.status,
            current_period_start: new Date(subscription.current_period_start * 1000),
            current_period_end: new Date(subscription.current_period_end * 1000),
        });
        logger_1.logger.info(`Updated subscription for user ${userId} to ${tier}`);
    }
    /**
     * Handle subscription deleted
     */
    static async handleSubscriptionDeleted(subscription) {
        const userId = parseInt(subscription.metadata.userId);
        // Downgrade to free tier
        await database_1.supabase
            .from('subscriptions')
            .update({
            tier: SubscriptionTier.FREE,
            status: 'canceled',
        })
            .eq('stripe_subscription_id', subscription.id);
        logger_1.logger.info(`Subscription canceled for user ${userId}, downgraded to free tier`);
    }
    /**
     * Handle payment succeeded
     */
    static async handlePaymentSucceeded(invoice) {
        logger_1.logger.info(`Payment succeeded for invoice ${invoice.id}`);
        // Additional logic for successful payments (e.g., send receipt email)
    }
    /**
     * Handle payment failed
     */
    static async handlePaymentFailed(invoice) {
        logger_1.logger.warn(`Payment failed for invoice ${invoice.id}`);
        // Additional logic for failed payments (e.g., send notification)
    }
    /**
     * Get user's current subscription
     */
    static async getUserSubscription(userId) {
        try {
            const { data: subscription } = await database_1.supabase
                .from('subscriptions')
                .select('*')
                .eq('user_id', userId)
                .single();
            if (!subscription) {
                // Return free tier by default
                return {
                    tier: SubscriptionTier.FREE,
                    status: 'active',
                    messagesUsed: 0,
                    messagesLimit: exports.SUBSCRIPTION_PLANS[SubscriptionTier.FREE].messagesLimit,
                };
            }
            // Get usage quota
            const { data: quota } = await database_1.supabase
                .from('usage_quotas')
                .select('messages_used, messages_limit')
                .eq('user_id', userId)
                .gte('period_end', new Date().toISOString())
                .single();
            return {
                tier: subscription.tier,
                status: subscription.status,
                messagesUsed: quota?.messages_used || 0,
                messagesLimit: quota?.messages_limit || exports.SUBSCRIPTION_PLANS[subscription.tier].messagesLimit,
                currentPeriodEnd: subscription.current_period_end,
            };
        }
        catch (error) {
            logger_1.logger.error('Error getting user subscription:', error);
            return null;
        }
    }
    /**
     * Check if user can send a message (within quota)
     */
    static async canUserSendMessage(userId) {
        const subscription = await this.getUserSubscription(userId);
        if (!subscription) {
            return false;
        }
        // Unlimited for enterprise
        if (subscription.messagesLimit === -1) {
            return true;
        }
        return subscription.messagesUsed < subscription.messagesLimit;
    }
    /**
     * Increment user's message usage
     */
    static async incrementMessageUsage(userId) {
        const now = new Date();
        const periodStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const periodEnd = new Date(periodStart);
        periodEnd.setDate(periodEnd.getDate() + 1);
        // Get subscription tier
        const subscription = await this.getUserSubscription(userId);
        const messagesLimit = subscription?.messagesLimit || exports.SUBSCRIPTION_PLANS[SubscriptionTier.FREE].messagesLimit;
        // Upsert usage quota
        await database_1.supabase.rpc('increment_message_usage', {
            p_user_id: userId,
            p_period_start: periodStart.toISOString(),
            p_period_end: periodEnd.toISOString(),
            p_messages_limit: messagesLimit,
        });
    }
    /**
     * Construct webhook event from request
     */
    static constructWebhookEvent(payload, signature) {
        return stripe.webhooks.constructEvent(payload, signature, STRIPE_WEBHOOK_SECRET);
    }
}
exports.StripeService = StripeService;
exports.default = StripeService;
