/**
 * Push Notification Routes
 * 
 * Handles push subscription management and sending notifications
 */

import { Router, Request, Response } from 'express';
import { supabase } from '../config/database';
// @ts-ignore - web-push types may not be available
import * as webpush from 'web-push';
import { optionalAuthenticate } from '../middleware/auth/authenticate.middleware';

const router = Router();

// VAPID keys (should be in environment variables)
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || '';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || '';
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:admin@aldeia.com';

// Configure web-push
if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

/**
 * Subscribe to push notifications
 */
router.post('/subscribe', optionalAuthenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { subscription } = req.body;

    if (!subscription || !subscription.endpoint) {
      return res.status(400).json({ error: 'Invalid subscription data' });
    }

    // Store subscription in database
    const { error } = await supabase
      .from('push_subscriptions')
      .upsert({
        user_id: userId || null,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'endpoint'
      });

    if (error) {
      console.error('Failed to store push subscription:', error);
      return res.status(500).json({ error: 'Failed to store subscription' });
    }

    res.json({ success: true, message: 'Subscribed to push notifications' });
  } catch (error) {
    console.error('Subscribe endpoint error:', error);
    res.status(500).json({ error: 'Failed to subscribe' });
  }
});

/**
 * Unsubscribe from push notifications
 */
router.post('/unsubscribe', optionalAuthenticate, async (req: Request, res: Response) => {
  try {
    const { endpoint } = req.body;

    if (!endpoint) {
      return res.status(400).json({ error: 'Endpoint required' });
    }

    const { error } = await supabase
      .from('push_subscriptions')
      .delete()
      .eq('endpoint', endpoint);

    if (error) {
      console.error('Failed to remove push subscription:', error);
      return res.status(500).json({ error: 'Failed to unsubscribe' });
    }

    res.json({ success: true, message: 'Unsubscribed from push notifications' });
  } catch (error) {
    console.error('Unsubscribe endpoint error:', error);
    res.status(500).json({ error: 'Failed to unsubscribe' });
  }
});

/**
 * Send push notification (admin/internal use)
 */
router.post('/send', optionalAuthenticate, async (req: Request, res: Response) => {
  try {
    const { userId, title, message, url, priority } = req.body;

    if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
      return res.status(500).json({ error: 'Push notifications not configured' });
    }

    // Get user's push subscription
    let query = supabase
      .from('push_subscriptions')
      .select('*');

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data: subscriptions, error } = await query;

    if (error || !subscriptions || subscriptions.length === 0) {
      return res.status(404).json({ error: 'No subscriptions found' });
    }

    // Send notification to all subscriptions
    const payload = JSON.stringify({
      title: title || 'Aldeia Assistant',
      message: message || 'You have a new notification',
      url: url || '/',
      priority: priority || 'medium'
    });

    const results = await Promise.allSettled(
      subscriptions.map((sub: any) => {
        const pushSubscription = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth
          }
        };

        return webpush.sendNotification(pushSubscription, payload);
      })
    );

    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    res.json({
      success: true,
      sent: successful,
      failed,
      total: subscriptions.length
    });
  } catch (error) {
    console.error('Send notification error:', error);
    res.status(500).json({ error: 'Failed to send notification' });
  }
});

/**
 * Get VAPID public key (for client-side subscription)
 */
router.get('/vapid-key', (req: Request, res: Response) => {
  res.json({ publicKey: VAPID_PUBLIC_KEY });
});

export default router;
