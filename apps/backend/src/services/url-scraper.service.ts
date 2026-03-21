/**
 * URL Scraper Service
 *
 * Scrapes web pages for text content, strips navigation/scripts,
 * and chunks the content for embedding.
 */

import axios from 'axios';

interface ScrapeResult {
  title: string;
  text: string;
  chunks: string[];
  url: string;
  scrapedAt: string;
}

/** Max content size: 1MB */
const MAX_CONTENT_SIZE = 1_000_000;
/** Max scraped text chars */
const MAX_TEXT_CHARS = 50_000;
/** HTTP timeout */
const HTTP_TIMEOUT_MS = 10_000;

/**
 * Validate URL format and block private/internal IPs
 */
function validateUrl(url: string): void {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error('Invalid URL format');
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error('Only HTTP/HTTPS URLs are supported');
  }

  const hostname = parsed.hostname;

  // Block private IP ranges
  const privatePatterns = [
    /^127\./,
    /^10\./,
    /^192\.168\./,
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
    /^0\./,
    /^169\.254\./,
    /^localhost$/i,
    /^::1$/,
    /^\[::1\]$/
  ];

  for (const pattern of privatePatterns) {
    if (pattern.test(hostname)) {
      throw new Error('URLs pointing to private/internal addresses are not allowed');
    }
  }
}

/**
 * Scrape a URL and extract text content
 */
export async function scrapeUrl(url: string): Promise<ScrapeResult> {
  validateUrl(url);

  const response = await axios.get(url, {
    timeout: HTTP_TIMEOUT_MS,
    maxContentLength: MAX_CONTENT_SIZE,
    maxRedirects: 3,
    headers: {
      'User-Agent': 'Aldeia-Bot/1.0 (Fire Recovery Assistant)',
      'Accept': 'text/html,application/xhtml+xml,text/plain'
    },
    responseType: 'text'
  });

  const contentType = response.headers['content-type'] || '';
  const html = typeof response.data === 'string' ? response.data : String(response.data);

  let title = '';
  let text = '';

  if (contentType.includes('text/html') || contentType.includes('application/xhtml')) {
    // Use cheerio for HTML parsing
    try {
      const cheerio = await import('cheerio');
      const $ = cheerio.load(html);

      // Extract title
      title = $('title').text().trim() || $('h1').first().text().trim() || '';

      // Remove unwanted elements
      $('script, style, nav, footer, header, aside, iframe, noscript, svg, .sidebar, .navigation, .nav, .footer, .header, .advertisement, .ads, .cookie-banner').remove();

      // Try to get main content area first
      let contentEl = $('article, main, [role="main"], .content, .main-content, #content, #main').first();
      if (!contentEl.length) {
        contentEl = $('body');
      }

      text = contentEl.text();
    } catch (cheerioErr) {
      // Fallback: simple regex-based extraction
      console.warn('Cheerio parsing failed, using fallback:', cheerioErr);
      text = html
        .replace(/<script[\s\S]*?<\/script>/gi, '')
        .replace(/<style[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&[a-z]+;/gi, ' ');
      const titleMatch = html.match(/<title[^>]*>(.*?)<\/title>/i);
      title = titleMatch ? titleMatch[1].trim() : '';
    }
  } else if (contentType.includes('text/plain')) {
    text = html;
    title = url;
  } else {
    throw new Error(`Unsupported content type: ${contentType}`);
  }

  // Clean up text
  text = text
    .replace(/\s+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, MAX_TEXT_CHARS);

  if (!text) {
    return { title, text: '', chunks: [], url, scrapedAt: new Date().toISOString() };
  }

  // Chunk by paragraphs/sentences
  const chunks = chunkText(text);

  return {
    title: title.slice(0, 200),
    text,
    chunks,
    url,
    scrapedAt: new Date().toISOString()
  };
}

/**
 * Split text into chunks for embedding
 */
function chunkText(text: string): string[] {
  const MAX_CHUNK = 1500;
  const MIN_CHUNK = 80;

  // Try paragraph splits first
  const paragraphs = text.split(/\n{2,}/).map(p => p.trim()).filter(p => p.length > 0);

  if (paragraphs.length === 0) {
    // Single block - split by sentences
    return splitBySentences(text, MAX_CHUNK, MIN_CHUNK);
  }

  const chunks: string[] = [];
  let current = '';

  for (const para of paragraphs) {
    if (current.length + para.length + 2 > MAX_CHUNK && current.length >= MIN_CHUNK) {
      chunks.push(current.trim());
      current = para;
    } else {
      current = current ? current + '\n\n' + para : para;
    }
  }

  if (current.trim().length >= MIN_CHUNK) {
    chunks.push(current.trim());
  } else if (chunks.length > 0 && current.trim().length > 0) {
    // Append short remainder to last chunk
    chunks[chunks.length - 1] += '\n\n' + current.trim();
  } else if (current.trim().length > 0) {
    chunks.push(current.trim());
  }

  return chunks;
}

function splitBySentences(text: string, maxChunk: number, minChunk: number): string[] {
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  const chunks: string[] = [];
  let current = '';

  for (const sentence of sentences) {
    if (current.length + sentence.length > maxChunk && current.length >= minChunk) {
      chunks.push(current.trim());
      current = sentence;
    } else {
      current += sentence;
    }
  }

  if (current.trim().length > 0) {
    chunks.push(current.trim());
  }

  return chunks;
}
