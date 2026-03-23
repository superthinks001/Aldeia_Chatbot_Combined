/**
 * Site Actions Service
 *
 * Detects and executes site-navigation / site-control intents from
 * user chat messages so the chatbot can navigate pages, trigger
 * uploads, update preferences, and open modals on the parent site.
 */

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export type FrontendActionType = 'navigate' | 'upload_prompt' | 'update_state' | 'open_modal';

export interface FrontendAction {
  type: FrontendActionType;
  payload: Record<string, any>;
}

export interface SiteActionResult {
  detected: boolean;
  actionType?: string;
  message?: string;
  frontendAction?: FrontendAction;
}

/* ------------------------------------------------------------------ */
/* Page name → path mapping                                            */
/* ------------------------------------------------------------------ */

const PAGE_MAP: Record<string, string> = {
  'home': '/',
  'landing': '/',
  'location': '/rebuild/location',
  'location confirmation': '/rebuild/location',
  'style selection': '/rebuild/preferences-style',
  'style': '/rebuild/preferences-style',
  'preferences': '/rebuild/preferences-needs',
  'needs': '/rebuild/preferences-needs',
  'needs selection': '/rebuild/preferences-needs',
  'inspiration': '/rebuild/inspiration',
  'budget': '/rebuild/budget',
  'insurance': '/rebuild/budget',
  'matches': '/rebuild/matches',
  'design matches': '/rebuild/matches',
  'details': '/rebuild/details',
  'design details': '/rebuild/details',
  'profile': '/profile',
  'settings': '/settings',
  'support': '/support',
  'contact': '/support',
  'help': '/support'
};

/* ------------------------------------------------------------------ */
/* Detection patterns                                                  */
/* ------------------------------------------------------------------ */

const NAVIGATE_PATTERNS = [
  /(?:go\s+to|take\s+me\s+to|navigate\s+to|open|show\s+me|visit)\s+(?:the\s+)?(.+?)(?:\s+page)?$/i,
  /(?:i\s+want\s+to\s+(?:go|see|visit))\s+(?:the\s+)?(.+?)(?:\s+page)?$/i
];

const UPLOAD_PATTERNS = [
  /(?:upload|add|attach)\s+(?:a\s+)?(?:document|file|photo|image|design|picture)\s+(?:to\s+)?(.+)?/i,
  /(?:upload|add)\s+(?:to\s+)?(.+)/i
];

const PREFERENCE_PATTERNS = [
  /(?:change|update|set)\s+(?:my\s+)?(.+?)\s+to\s+(.+)/i,
  /(?:update|change)\s+(?:my\s+)?(?:preferences?|settings?)\s+(?:for\s+)?(.+)/i
];

const SUPPORT_PATTERNS = [
  /(?:contact|reach|call|email)\s+(?:support|help|customer\s+service|an?\s+agent)/i,
  /(?:speak|talk)\s+(?:to|with)\s+(?:a\s+)?(?:human|person|agent|representative)/i
];

/* ------------------------------------------------------------------ */
/* Detection                                                           */
/* ------------------------------------------------------------------ */

/**
 * Detect if the user's message implies a site action.
 */
export function detectSiteAction(
  message: string,
  entities: Record<string, any>
): SiteActionResult {
  const msg = message.trim();

  // 1. Navigation
  for (const pattern of NAVIGATE_PATTERNS) {
    const match = msg.match(pattern);
    if (match) {
      const target = match[1].trim().toLowerCase();
      return executeSiteAction('navigate_to_page', { pageName: target });
    }
  }

  // 2. Upload
  for (const pattern of UPLOAD_PATTERNS) {
    const match = msg.match(pattern);
    if (match) {
      const destination = match[1]?.trim().toLowerCase() || 'style selection';
      return executeSiteAction('upload_to_style_selection', { destination });
    }
  }

  // 3. Preference updates
  for (const pattern of PREFERENCE_PATTERNS) {
    const match = msg.match(pattern);
    if (match) {
      const field = match[1]?.trim();
      const value = match[2]?.trim();
      return executeSiteAction('update_preferences', { field, value });
    }
  }

  // 4. Contact support
  for (const pattern of SUPPORT_PATTERNS) {
    if (pattern.test(msg)) {
      return executeSiteAction('contact_support', {});
    }
  }

  // 5. Entity-based: location update
  if (entities.location && /(?:change|update|set)\s+(?:my\s+)?(?:location|address)/i.test(msg)) {
    return executeSiteAction('update_location', { location: entities.location });
  }

  return { detected: false };
}

/* ------------------------------------------------------------------ */
/* Execution                                                           */
/* ------------------------------------------------------------------ */

/**
 * Build the frontend action payload for a detected site action.
 */
export function executeSiteAction(
  actionType: string,
  params: Record<string, any>
): SiteActionResult {
  switch (actionType) {
    case 'navigate_to_page': {
      const pageName = params.pageName as string;
      const pagePath = PAGE_MAP[pageName];
      if (pagePath) {
        return {
          detected: true,
          actionType,
          message: `Navigating you to the ${pageName} page.`,
          frontendAction: { type: 'navigate', payload: { path: pagePath, pageName } }
        };
      }
      // Fuzzy match: check if any key contains the target
      const fuzzyKey = Object.keys(PAGE_MAP).find(k => k.includes(pageName) || pageName.includes(k));
      if (fuzzyKey) {
        return {
          detected: true,
          actionType,
          message: `Navigating you to the ${fuzzyKey} page.`,
          frontendAction: { type: 'navigate', payload: { path: PAGE_MAP[fuzzyKey], pageName: fuzzyKey } }
        };
      }
      return {
        detected: true,
        actionType,
        message: `I couldn't find a page called "${pageName}". Available pages include: ${Object.keys(PAGE_MAP).slice(0, 8).join(', ')}.`
      };
    }

    case 'upload_to_style_selection':
      return {
        detected: true,
        actionType,
        message: 'Opening the upload dialog so you can add your design inspiration.',
        frontendAction: {
          type: 'upload_prompt',
          payload: { destination: params.destination || 'style selection', context: 'design_inspiration' }
        }
      };

    case 'update_preferences':
      return {
        detected: true,
        actionType,
        message: `Updating your ${params.field} preference${params.value ? ' to ' + params.value : ''}.`,
        frontendAction: {
          type: 'update_state',
          payload: { field: params.field, value: params.value }
        }
      };

    case 'update_location':
      return {
        detected: true,
        actionType,
        message: `Updating your location to ${params.location}.`,
        frontendAction: {
          type: 'update_state',
          payload: { field: 'location', value: params.location }
        }
      };

    case 'contact_support':
      return {
        detected: true,
        actionType,
        message: 'Opening the support contact form for you.',
        frontendAction: {
          type: 'open_modal',
          payload: { modal: 'contact_support' }
        }
      };

    default:
      return { detected: false };
  }
}
