"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authenticate_middleware_1 = require("../middleware/auth/authenticate.middleware");
const stripe_service_1 = __importStar(require("../services/billing/stripe.service"));
const logger_1 = require("../utils/logger");
const router = (0, express_1.Router)();
/**
 * GET /api/billing/plans
 * Get available subscription plans
 */
router.get('/plans', (req, res) => {
    try {
        res.json({
            plans: Object.values(stripe_service_1.SUBSCRIPTION_PLANS),
        });
    }
    catch (error) {
        logger_1.logger.error('Error getting plans:', error);
        res.status(500).json({ error: 'Failed to retrieve plans' });
    }
});
/**
 * GET /api/billing/subscription
 * Get user's current subscription details
 */
router.get('/subscription', authenticate_middleware_1.authenticate, async (req, res) => {
    try {
        const userId = parseInt(req.user.userId);
        const subscription = await stripe_service_1.default.getUserSubscription(userId);
        if (!subscription) {
            return res.status(404).json({ error: 'Subscription not found' });
        }
        res.json({ subscription });
    }
    catch (error) {
        logger_1.logger.error('Error getting subscription:', error);
        res.status(500).json({ error: 'Failed to retrieve subscription' });
    }
});
/**
 * POST /api/billing/checkout
 * Create a checkout session for subscription upgrade
 */
router.post('/checkout', authenticate_middleware_1.authenticate, async (req, res) => {
    try {
        const userId = parseInt(req.user.userId);
        const { tier } = req.body;
        if (!tier || !Object.values(stripe_service_1.SubscriptionTier).includes(tier)) {
            return res.status(400).json({ error: 'Invalid subscription tier' });
        }
        if (tier === stripe_service_1.SubscriptionTier.FREE) {
            return res.status(400).json({ error: 'Cannot checkout for free tier' });
        }
        const successUrl = `${process.env.FRONTEND_URL}/billing/success?session_id={CHECKOUT_SESSION_ID}`;
        const cancelUrl = `${process.env.FRONTEND_URL}/billing/canceled`;
        const session = await stripe_service_1.default.createCheckoutSession(userId, tier, successUrl, cancelUrl);
        res.json({
            sessionId: session.id,
            url: session.url,
        });
    }
    catch (error) {
        logger_1.logger.error('Error creating checkout session:', error);
        res.status(500).json({ error: error.message || 'Failed to create checkout session' });
    }
});
/**
 * POST /api/billing/portal
 * Create a billing portal session for managing subscription
 */
router.post('/portal', authenticate_middleware_1.authenticate, async (req, res) => {
    try {
        const userId = parseInt(req.user.userId);
        const returnUrl = `${process.env.FRONTEND_URL}/billing`;
        const session = await stripe_service_1.default.createPortalSession(userId, returnUrl);
        res.json({
            url: session.url,
        });
    }
    catch (error) {
        logger_1.logger.error('Error creating portal session:', error);
        res.status(500).json({ error: error.message || 'Failed to create portal session' });
    }
});
/**
 * POST /api/billing/webhook
 * Stripe webhook endpoint for handling events
 */
router.post('/webhook', async (req, res) => {
    const signature = req.headers['stripe-signature'];
    if (!signature) {
        return res.status(400).json({ error: 'Missing stripe-signature header' });
    }
    try {
        // Get raw body (must be configured in express to keep raw body for webhooks)
        const event = stripe_service_1.default.constructWebhookEvent(req.body, signature);
        // Handle the event
        await stripe_service_1.default.handleWebhookEvent(event);
        res.json({ received: true });
    }
    catch (error) {
        logger_1.logger.error('Webhook error:', error);
        res.status(400).json({ error: `Webhook Error: ${error.message}` });
    }
});
/**
 * GET /api/billing/usage
 * Get user's usage statistics
 */
router.get('/usage', authenticate_middleware_1.authenticate, async (req, res) => {
    try {
        const userId = parseInt(req.user.userId);
        const subscription = await stripe_service_1.default.getUserSubscription(userId);
        if (!subscription) {
            return res.status(404).json({ error: 'Subscription not found' });
        }
        const usagePercentage = subscription.messagesLimit === -1
            ? 0
            : (subscription.messagesUsed / subscription.messagesLimit) * 100;
        res.json({
            usage: {
                messagesUsed: subscription.messagesUsed,
                messagesLimit: subscription.messagesLimit,
                usagePercentage: Math.round(usagePercentage),
                unlimited: subscription.messagesLimit === -1,
            },
        });
    }
    catch (error) {
        logger_1.logger.error('Error getting usage:', error);
        res.status(500).json({ error: 'Failed to retrieve usage' });
    }
});
/**
 * GET /api/billing/can-send-message
 * Check if user can send a message (within quota)
 */
router.get('/can-send-message', authenticate_middleware_1.authenticate, async (req, res) => {
    try {
        const userId = parseInt(req.user.userId);
        const canSend = await stripe_service_1.default.canUserSendMessage(userId);
        res.json({
            canSend,
            message: canSend ? 'You can send a message' : 'Message limit reached for your plan',
        });
    }
    catch (error) {
        logger_1.logger.error('Error checking message quota:', error);
        res.status(500).json({ error: 'Failed to check message quota' });
    }
});
exports.default = router;
