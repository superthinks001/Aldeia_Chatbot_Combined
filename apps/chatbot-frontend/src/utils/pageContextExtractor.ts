/**
 * Page Context Extraction Utility
 * Extracts semantic information from the current webpage for context-aware chat responses
 *
 * Features:
 * - Real-time page scraping
 * - Location detection from URL and content
 * - Topic classification
 * - Semantic element extraction
 */

export interface PageContext {
  // Basic page information
  url: string;
  title: string;
  description: string;

  // Semantic elements
  headings: {
    h1: string[];
    h2: string[];
    h3: string[];
  };

  // Location context
  location: {
    detected: boolean;
    city?: string;
    county?: string;
    state?: string;
    jurisdiction?: string;
  };

  // Topic classification
  topics: string[];
  primaryTopic?: string;

  // Content analysis
  contentBlocks: string[];
  keywords: string[];

  // User interaction context
  formElements: string[];
  activeSection?: string;

  // Temporal context
  lastUpdated?: string;
  timestamp: Date;
}

// Known fire recovery locations
const FIRE_LOCATIONS = {
  cities: ['altadena', 'pasadena', 'la canada flintridge', 'glendale', 'burbank', 'los angeles'],
  counties: ['los angeles', 'la county', 'pasadena county'],
  keywords: ['fire', 'recovery', 'rebuild', 'debris', 'eaton', 'wildfire']
};

// Topic categories for fire recovery
const TOPIC_CATEGORIES = {
  'debris-removal': ['debris', 'removal', 'cleanup', 'waste', 'hazard', 'demolition'],
  'permits': ['permit', 'permission', 'approval', 'authorization', 'building', 'construction'],
  'insurance': ['insurance', 'claim', 'coverage', 'policy', 'adjuster', 'settlement'],
  'financial-assistance': ['financial', 'assistance', 'grant', 'fund', 'aid', 'loan', 'fema'],
  'housing': ['housing', 'shelter', 'temporary', 'relocation', 'rental', 'accommodation'],
  'legal': ['legal', 'law', 'attorney', 'rights', 'regulation', 'compliance'],
  'rebuilding': ['rebuild', 'reconstruction', 'design', 'contractor', 'architect', 'renovation'],
  'safety': ['safety', 'hazard', 'toxic', 'air quality', 'health', 'danger'],
  'timeline': ['timeline', 'deadline', 'schedule', 'phase', 'when', 'date'],
  'contact': ['contact', 'phone', 'email', 'office', 'helpline', 'support'],
  'location-confirmation': ['location', 'address', 'property', 'confirm', 'parcel', 'apn'],
  'style-selection': ['style', 'architecture', 'design', 'original', 'new', 'upload', 'photos'],
  'needs-selection': ['bedrooms', 'bathrooms', 'stories', 'features', 'patio', 'pool', 'basement'],
  'inspiration': ['inspiration', 'ideas', 'images', 'gallery', 'upload', 'select'],
  'budget': ['budget', 'insurance', 'coverage', 'cost', 'electric', 'savings'],
  'design-matches': ['matches', 'designs', 'pre-approved', 'architect', 'match percentage'],
  'design-details': ['details', 'floor plan', 'video', 'cost', 'architect', 'download']
};

/**
 * Extract comprehensive context from current page
 */
export function extractPageContext(): PageContext {
  const url = window.location.href;
  const title = document.title;
  const description = getMetaDescription();
  const headings = extractHeadings();
  const location = detectLocation(url, title, headings);
  const contentBlocks = extractContentBlocks();
  const keywords = extractKeywords(title, description, contentBlocks);
  const topics = classifyTopics(keywords, contentBlocks);
  const formElements = extractFormElements();
  const lastUpdated = getLastUpdated();

  return {
    url,
    title,
    description,
    headings,
    location,
    topics,
    primaryTopic: topics[0],
    contentBlocks,
    keywords,
    formElements,
    activeSection: detectActiveSection(),
    lastUpdated,
    timestamp: new Date()
  };
}

/**
 * Get meta description from page
 */
function getMetaDescription(): string {
  const meta = document.querySelector('meta[name="description"]');
  return meta?.getAttribute('content') || '';
}

/**
 * Extract all headings from page
 */
function extractHeadings(): { h1: string[]; h2: string[]; h3: string[] } {
  const h1Elements = Array.from(document.querySelectorAll('h1'));
  const h2Elements = Array.from(document.querySelectorAll('h2'));
  const h3Elements = Array.from(document.querySelectorAll('h3'));

  return {
    h1: h1Elements.map(el => el.textContent?.trim() || '').filter(text => text.length > 0),
    h2: h2Elements.map(el => el.textContent?.trim() || '').filter(text => text.length > 0),
    h3: h3Elements.map(el => el.textContent?.trim() || '').filter(text => text.length > 0)
  };
}

/**
 * Detect location from URL, title, and content
 */
function detectLocation(
  url: string,
  title: string,
  headings: { h1: string[]; h2: string[]; h3: string[] }
): PageContext['location'] {
  const urlLower = url.toLowerCase();
  const titleLower = title.toLowerCase();
  const allText = [titleLower, ...headings.h1.map(h => h.toLowerCase()), ...headings.h2.map(h => h.toLowerCase())].join(' ');

  // Check URL patterns
  let city: string | undefined;
  let county: string | undefined;
  let state: string = 'California';

  // Detect city from URL or content
  for (const cityName of FIRE_LOCATIONS.cities) {
    if (urlLower.includes(cityName.toLowerCase()) || allText.includes(cityName.toLowerCase())) {
      city = cityName.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
      break;
    }
  }

  // Detect county
  for (const countyName of FIRE_LOCATIONS.counties) {
    if (urlLower.includes(countyName.toLowerCase()) || allText.includes(countyName.toLowerCase())) {
      county = countyName.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
      break;
    }
  }

  // Determine jurisdiction
  let jurisdiction: string | undefined;
  if (city && city.toLowerCase() === 'pasadena') {
    jurisdiction = 'Pasadena County';
  } else if (county) {
    jurisdiction = county;
  }

  const detected = Boolean(city || county);

  return {
    detected,
    city,
    county,
    state: detected ? state : undefined,
    jurisdiction
  };
}

/**
 * Extract main content blocks
 */
function extractContentBlocks(): string[] {
  const selectors = ['main', 'article', '.content', '#content', '[role="main"]'];
  const blocks: string[] = [];

  for (const selector of selectors) {
    const element = document.querySelector(selector);
    if (element) {
      const paragraphs = element.querySelectorAll('p');
      paragraphs.forEach(p => {
        const text = p.textContent?.trim();
        if (text && text.length > 50) { // Only meaningful paragraphs
          blocks.push(text.substring(0, 500)); // Limit to 500 chars
        }
      });
      if (blocks.length > 0) break; // Found content, stop searching
    }
  }

  // Limit to 5 most relevant blocks
  return blocks.slice(0, 5);
}

/**
 * Extract keywords from text
 */
function extractKeywords(title: string, description: string, contentBlocks: string[]): string[] {
  const allText = [title, description, ...contentBlocks].join(' ').toLowerCase();
  const words = allText.split(/\s+/);

  // Count word frequency
  const frequency: { [word: string]: number } = {};
  words.forEach(word => {
    // Clean word
    word = word.replace(/[^a-z0-9-]/g, '');
    if (word.length > 3) { // Ignore short words
      frequency[word] = (frequency[word] || 0) + 1;
    }
  });

  // Sort by frequency and get top keywords
  const sorted = Object.entries(frequency)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([word]) => word);

  return sorted;
}

/**
 * Classify page topics based on keywords and content
 */
function classifyTopics(keywords: string[], contentBlocks: string[]): string[] {
  const allText = [...keywords, ...contentBlocks.map(b => b.toLowerCase())].join(' ');
  const topics: string[] = [];

  for (const [topic, topicKeywords] of Object.entries(TOPIC_CATEGORIES)) {
    const matches = topicKeywords.filter(keyword => allText.includes(keyword));
    if (matches.length >= 2) { // Require at least 2 keyword matches
      topics.push(topic);
    }
  }

  return topics;
}

/**
 * Extract form elements (indicates user intent)
 */
function extractFormElements(): string[] {
  const forms = document.querySelectorAll('form');
  const elements: string[] = [];

  forms.forEach(form => {
    const inputs = form.querySelectorAll('input[name], select[name], textarea[name]');
    inputs.forEach(input => {
      const name = input.getAttribute('name');
      const label = input.getAttribute('aria-label') || input.getAttribute('placeholder');
      if (name) elements.push(name);
      if (label) elements.push(label);
    });
  });

  return [...new Set(elements)]; // Deduplicate
}

/**
 * Detect which section of the page is currently active (scroll position)
 */
function detectActiveSection(): string | undefined {
  const sections = document.querySelectorAll('section[id], div[id]');
  const scrollPosition = window.scrollY + window.innerHeight / 2;

  for (const section of Array.from(sections)) {
    const rect = section.getBoundingClientRect();
    const absoluteTop = rect.top + window.scrollY;
    const absoluteBottom = absoluteTop + rect.height;

    if (scrollPosition >= absoluteTop && scrollPosition <= absoluteBottom) {
      return section.id || section.className;
    }
  }

  return undefined;
}

/**
 * Get last updated date from page metadata
 */
function getLastUpdated(): string | undefined {
  // Check meta tags
  const metaModified = document.querySelector('meta[property="article:modified_time"]');
  if (metaModified) return metaModified.getAttribute('content') || undefined;

  const metaPublished = document.querySelector('meta[property="article:published_time"]');
  if (metaPublished) return metaPublished.getAttribute('content') || undefined;

  // Check common date patterns in content
  const dateElements = document.querySelectorAll('.last-updated, .modified-date, time[datetime]');
  if (dateElements.length > 0) {
    const timeElement = dateElements[0] as HTMLTimeElement;
    return timeElement.dateTime || timeElement.textContent?.trim();
  }

  return undefined;
}

/**
 * Monitor page context changes and trigger callback
 */
export function monitorPageContext(callback: (context: PageContext) => void, intervalMs: number = 5000) {
  let lastUrl = window.location.href;

  const check = () => {
    const currentUrl = window.location.href;
    if (currentUrl !== lastUrl) {
      lastUrl = currentUrl;
      const context = extractPageContext();
      callback(context);
    }
  };

  // Check on scroll (debounced)
  let scrollTimeout: NodeJS.Timeout;
  window.addEventListener('scroll', () => {
    clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(check, 1000);
  });

  // Check periodically
  const intervalId = setInterval(check, intervalMs);

  // Return cleanup function
  return () => {
    clearInterval(intervalId);
    window.removeEventListener('scroll', check);
  };
}

/**
 * Get simplified context for chat API
 */
export function getSimplifiedContext(): {
  url: string;
  title: string;
  location: string;
  topic: string;
} {
  const context = extractPageContext();

  return {
    url: context.url,
    title: context.title,
    location: context.location.detected
      ? `${context.location.city || ''} ${context.location.county || ''}`.trim()
      : 'Unknown',
    topic: context.primaryTopic || 'general'
  };
}
