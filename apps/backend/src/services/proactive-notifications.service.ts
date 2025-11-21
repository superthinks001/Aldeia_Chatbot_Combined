/**
 * Proactive Notification Service
 *
 * Location-based alerts, deadline reminders, and resource notifications
 */

export interface ProactiveNotification {
  id: string;
  type: 'deadline' | 'update' | 'resource' | 'weather' | 'safety';
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  location?: string;
  expiresAt?: Date;
  actionUrl?: string;
  actionText?: string;
}

// Notification rules based on location and context
const NOTIFICATION_RULES = {
  'altadena_debris_deadline': {
    location: 'altadena',
    topic: 'debris-removal',
    notification: {
      type: 'deadline' as const,
      title: 'Debris Removal Deadline Approaching',
      message: 'The deadline for debris removal opt-out in Altadena is April 30, 2025. Make sure to submit your application if you haven\'t already.',
      priority: 'high' as const,
      actionText: 'Learn More',
      actionUrl: '/debris-removal'
    }
  },
  'la_county_debris_deadline': {
    location: 'los angeles',
    topic: 'debris-removal',
    notification: {
      type: 'deadline' as const,
      title: 'LA County Debris Removal Deadline',
      message: 'Opt-out applications for debris removal close May 15, 2025. Act now to preserve your options.',
      priority: 'high' as const,
      actionText: 'Apply Now',
      actionUrl: '/apply-debris'
    }
  },
  'permits_reminder': {
    topic: 'rebuilding',
    notification: {
      type: 'update' as const,
      title: 'Building Permits Required',
      message: 'Reminder: All reconstruction work requires building permits. Start your permit application early to avoid delays.',
      priority: 'medium' as const,
      actionText: 'Get Permits',
      actionUrl: '/permits'
    }
  },
  'financial_assistance_update': {
    topic: 'financial',
    notification: {
      type: 'resource' as const,
      title: 'New Financial Assistance Available',
      message: 'FEMA Individual Assistance and California Disaster Assistance programs are now accepting applications.',
      priority: 'high' as const,
      actionText: 'Apply',
      actionUrl: '/financial-assistance'
    }
  }
};

/**
 * Get proactive notifications based on context
 */
export function getProactiveNotifications(context: {
  location?: string;
  topic?: string;
  userHistory?: string[];
}): ProactiveNotification[] {
  const notifications: ProactiveNotification[] = [];
  const now = new Date();

  for (const [ruleId, rule] of Object.entries(NOTIFICATION_RULES)) {
    // Type assertion for proper access to optional location property
    const ruleLocation = 'location' in rule ? rule.location : undefined;
    const ruleTopic = 'topic' in rule ? rule.topic : undefined;

    // Check location match
    if (ruleLocation && context.location) {
      const locationMatch = context.location.toLowerCase().includes(ruleLocation.toLowerCase());
      if (!locationMatch) continue;
    }

    // Check topic match
    if (ruleTopic && context.topic) {
      const topicMatch = context.topic.toLowerCase().includes(ruleTopic.toLowerCase());
      if (!topicMatch) continue;
    }

    // Create notification
    notifications.push({
      id: ruleId,
      ...rule.notification,
      ...(ruleLocation ? { location: ruleLocation } : {})
    });
  }

  // Sort by priority
  return notifications.sort((a, b) => {
    const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
    return priorityOrder[b.priority] - priorityOrder[a.priority];
  });
}

/**
 * Check if notification should be shown
 */
export function shouldShowNotification(
  notification: ProactiveNotification,
  userSeenIds: string[]
): boolean {
  // Don't show if already seen
  if (userSeenIds.includes(notification.id)) return false;

  // Don't show if expired
  if (notification.expiresAt && notification.expiresAt < new Date()) return false;

  return true;
}
