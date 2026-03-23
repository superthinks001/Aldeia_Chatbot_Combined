/**
 * Document Parser Service
 *
 * Parses PDF, DOCX, and TXT files into text chunks
 * for embedding and search.
 */

import pdfParse from 'pdf-parse';

interface ParseResult {
  text: string;
  chunks: string[];
  metadata: {
    filename: string;
    mimeType: string;
    pageCount?: number;
    wordCount: number;
  };
}

/**
 * Parse a document buffer into text and chunks
 */
export async function parseDocument(
  buffer: Buffer,
  filename: string,
  mimeType: string
): Promise<ParseResult> {
  let text = '';

  if (mimeType === 'application/pdf' || filename.toLowerCase().endsWith('.pdf')) {
    text = await parsePDF(buffer);
  } else if (
    mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    filename.toLowerCase().endsWith('.docx')
  ) {
    text = await parseDOCX(buffer);
  } else if (mimeType === 'text/plain' || filename.toLowerCase().endsWith('.txt')) {
    text = buffer.toString('utf-8');
  } else {
    throw new Error(`Unsupported file type: ${mimeType}`);
  }

  // Clean text
  text = text.replace(/\r\n/g, '\n').trim();

  if (!text) {
    return { text: '', chunks: [], metadata: { filename, mimeType, wordCount: 0 } };
  }

  // Chunk by paragraphs (same pattern as document_ingest.ts)
  const chunks = chunkByParagraph(text);
  const wordCount = text.split(/\s+/).length;

  return {
    text,
    chunks,
    metadata: {
      filename,
      mimeType,
      wordCount
    }
  };
}

async function parsePDF(buffer: Buffer): Promise<string> {
  const data = await pdfParse(buffer);
  return data.text || '';
}

async function parseDOCX(buffer: Buffer): Promise<string> {
  try {
    const mammoth = await import('mammoth');
    const result = await mammoth.extractRawText({ buffer });
    return result.value || '';
  } catch (err) {
    console.error('DOCX parsing failed:', err);
    throw new Error('Failed to parse DOCX file. Ensure mammoth is installed.');
  }
}

/**
 * Split text into paragraph-based chunks.
 * Each chunk is at least 100 chars and at most ~2000 chars.
 */
function chunkByParagraph(text: string): string[] {
  const MIN_CHUNK_LENGTH = 100;
  const MAX_CHUNK_LENGTH = 2000;

  // Split by double newline (paragraphs)
  const paragraphs = text.split(/\n{2,}/).map(p => p.trim()).filter(p => p.length > 0);

  const chunks: string[] = [];
  let currentChunk = '';

  for (const para of paragraphs) {
    if (currentChunk.length + para.length + 2 > MAX_CHUNK_LENGTH && currentChunk.length >= MIN_CHUNK_LENGTH) {
      chunks.push(currentChunk.trim());
      currentChunk = para;
    } else {
      currentChunk = currentChunk ? currentChunk + '\n\n' + para : para;
    }
  }

  if (currentChunk.trim().length > 0) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}
