/**
 * Document Text Extraction Service
 * Unified extraction for PDF and DOCX files
 *
 * Extraction methods (in order of preference):
 * - PDF: pdf-parse (CPU-based, text extraction from text-based PDFs)
 * - DOCX: mammoth (reliable DOCX to text conversion)
 * - Fallback: Buffer-based extraction for text files
 *
 * Env flags:
 * - MARKER_ENABLED=true → swap pdf-parse for Marker API call (future GPU infra)
 * - MARKER_API_URL → endpoint for Marker service
 */

export interface ExtractedContent {
  text: string;
  pageCount?: number;
  wasSuccessful: boolean;
  errorReason?: string;
  extractionMethod: 'pdf-parse' | 'mammoth' | 'buffer' | 'marker' | 'none';
}

export interface PageContent {
  pageNumber: number;
  text: string;
  charCount: number;
}

// pdf-parse result interface
interface PdfParseResult {
  text: string;
  numpages: number;
  numrender: number;
  info: Record<string, unknown>;
  metadata: Record<string, unknown>;
  version: string;
  pageInfo?: Array<{
    text: string;
    [key: string]: unknown;
  }>;
}

// Supported MIME types
const PDF_MIME_TYPES = ['application/pdf'];
const DOCX_MIME_TYPES = [
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-word.document.ml',
];
const TEXT_MIME_TYPES = [
  'text/plain',
  'text/markdown',
  'text/csv',
  'text/html',
  'application/json',
  'application/msword',
];

// ========================
// TEXT EXTRACTION
// ========================

/**
 * Main extraction function — returns full document text
 */
export async function extractDocumentText(
  buffer: Buffer,
  mimeType: string,
  fileName: string
): Promise<ExtractedContent> {
  const normalizedMime = mimeType.toLowerCase();

  try {
    // PDF extraction
    if (PDF_MIME_TYPES.includes(normalizedMime)) {
      // Check for Marker API first (future GPU infrastructure)
      if (process.env.MARKER_ENABLED === 'true' && process.env.MARKER_API_URL) {
        try {
          const result = await extractWithMarker(buffer, fileName);
          return {
            text: result.text,
            pageCount: result.pageCount,
            wasSuccessful: true,
            extractionMethod: 'marker',
          };
        } catch (markerError) {
          console.warn('Marker extraction failed, falling back to pdf-parse:', markerError);
          // Fall through to pdf-parse
        }
      }

      const result = await extractPdfText(buffer);
      return {
        text: result.text,
        pageCount: result.pageCount,
        wasSuccessful: result.text.length > 0,
        errorReason: result.text.length === 0 ? 'No text extracted (possibly scanned PDF)' : undefined,
        extractionMethod: 'pdf-parse',
      };
    }

    // DOCX extraction
    if (DOCX_MIME_TYPES.includes(normalizedMime)) {
      const text = await extractDocxText(buffer);
      return {
        text,
        wasSuccessful: text.length > 0,
        errorReason: text.length === 0 ? 'No text extracted from DOCX' : undefined,
        extractionMethod: 'mammoth',
      };
    }

    // Text-based file types
    if (TEXT_MIME_TYPES.includes(normalizedMime)) {
      const text = extractTextFromBuffer(buffer);
      return {
        text,
        wasSuccessful: text.length > 0,
        extractionMethod: 'buffer',
      };
    }

    // Unknown type - try buffer extraction anyway
    const text = extractTextFromBuffer(buffer);
    return {
      text,
      wasSuccessful: text.length > 0,
      extractionMethod: text.length > 0 ? 'buffer' : 'none',
      errorReason: text.length === 0 ? `Unsupported MIME type: ${mimeType}` : undefined,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Document extraction failed:', { fileName, mimeType, error: errorMessage });

    return {
      text: '',
      wasSuccessful: false,
      errorReason: errorMessage,
      extractionMethod: 'none',
    };
  }
}

/**
 * Extract text from PDF using pdf-parse
 */
async function extractPdfText(buffer: Buffer): Promise<{ text: string; pageCount: number }> {
  try {
    const pdfParse = await import('pdf-parse');
    const data = await pdfParse.default(buffer) as PdfParseResult;

    return {
      text: data.text || '',
      pageCount: data.numpages || 0,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('pdf-parse extraction failed:', errorMessage);

    return {
      text: '',
      pageCount: 0,
    };
  }
}

/**
 * Extract text from DOCX using mammoth
 */
async function extractDocxText(buffer: Buffer): Promise<string> {
  try {
    const mammoth = await import('mammoth');
    const result = await mammoth.extractRawText({ buffer });

    // Normalize whitespace and clean up the text
    return result.value
      .replace(/\r\n/g, '\n') // Normalize line endings
      .replace(/\n{3,}/g, '\n\n') // Remove excessive newlines
      .replace(/[ \t]{2,}/g, ' ') // Remove excessive spaces
      .trim();
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('mammoth extraction failed:', errorMessage);

    // Fallback to adm-zip for basic extraction
    return await extractDocxTextFallback(buffer);
  }
}

/**
 * Fallback DOCX extraction using adm-zip (basic XML parsing)
 */
async function extractDocxTextFallback(buffer: Buffer): Promise<string> {
  try {
    const { default: AdmZip } = await import('adm-zip');
    const zip = new AdmZip(buffer);
    const documentXml = zip.readAsText('word/document.xml');

    if (!documentXml) {
      return '';
    }

    // Simple XML text extraction
    return documentXml
      .replace(/<[^>]+>/g, ' ') // Strip XML tags
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&nbsp;/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  } catch {
    return '';
  }
}

/**
 * Fallback buffer extraction for plain text files
 */
function extractTextFromBuffer(buffer: Buffer): string {
  try {
    // Try UTF-8 first
    let text = buffer.toString('utf-8');

    // Check for binary content in first 512 bytes
    const sample = buffer.slice(0, 512);
    const hasBinary = /[\x00-\x08\x0B\x0C\x0E-\x1F]/.test(sample.toString('binary'));

    if (hasBinary) {
      // Try latin1 as a fallback for some encoded documents
      text = buffer.toString('latin1');
      const latin1HasBinary = /[\x00-\x08\x0B\x0C\x0E-\x1F]/.test(text.slice(0, 512));

      if (latin1HasBinary) {
        console.warn('Buffer appears to be binary, not a text file');
        return '';
      }
    }

    return text.trim();
  } catch {
    return '';
  }
}

/**
 * Marker API extraction (future GPU infrastructure)
 * Only used when MARKER_ENABLED=true and MARKER_API_URL is set
 */
async function extractWithMarker(
  buffer: Buffer,
  fileName: string
): Promise<{ text: string; pageCount: number }> {
  const apiUrl = process.env.MARKER_API_URL;
  if (!apiUrl) {
    throw new Error('MARKER_API_URL not configured');
  }

  try {
    // Convert buffer to base64 for transmission
    const base64Content = buffer.toString('base64');

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Add API key header if configured
        ...(process.env.MARKER_API_KEY && {
          Authorization: `Bearer ${process.env.MARKER_API_KEY}`,
        }),
      },
      body: JSON.stringify({
        fileName,
        content: base64Content,
        contentType: 'application/pdf',
      }),
    });

    if (!response.ok) {
      throw new Error(`Marker API returned ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();

    return {
      text: result.text || result.content || '',
      pageCount: result.pageCount || result.pages?.length || 0,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Marker extraction failed: ${errorMessage}`);
  }
}

// ========================
// PAGE-LEVEL EXTRACTION
// ========================

/**
 * Extract text organized by pages (for better chunking)
 * Returns array of { pageNumber, text, charCount } for each page
 */
export async function extractDocumentPages(
  buffer: Buffer,
  mimeType: string,
  fileName: string
): Promise<PageContent[]> {
  const normalizedMime = mimeType.toLowerCase();

  try {
    if (PDF_MIME_TYPES.includes(normalizedMime)) {
      return extractPdfPages(buffer);
    }

    if (DOCX_MIME_TYPES.includes(normalizedMime)) {
      return extractDocxPages(buffer);
    }

    // For text files, return single "page" with entire content
    const text = extractTextFromBuffer(buffer);
    return [
      {
        pageNumber: 1,
        text,
        charCount: text.length,
      },
    ];
  } catch (error) {
    console.error('Page extraction failed:', { fileName, mimeType, error });
    return [];
  }
}

/**
 * Extract pages from PDF with page metadata
 * pdf-parse returns page-level text via the text property (already page-separated)
 */
async function extractPdfPages(buffer: Buffer): Promise<PageContent[]> {
  try {
    const pdfParse = await import('pdf-parse');

    // pdf-parse provides page-level text access
    const data = await pdfParse.default(buffer) as PdfParseResult;

    // The text property contains full document text
    // We need to split it into pages based on page boundaries
    // pdf-parse doesn't directly give us per-page text, so we use the raw text
    // and attempt to infer page breaks or use page metadata

    const pages: PageContent[] = [];
    const fullText = data.text || '';

    // If we have page info from pdf-parse, use it
    if (data.pageInfo && Array.isArray(data.pageInfo)) {
      // Page info contains metadata for each page
      for (let i = 0; i < data.pageInfo.length; i++) {
        const pageInfo = data.pageInfo[i];
        const pageText = pageInfo.text || '';
        pages.push({
          pageNumber: i + 1,
          text: pageText.trim(),
          charCount: pageText.trim().length,
        });
      }
    } else {
      // Fallback: split by double newlines (common page separator in pdf-parse output)
      // This is imperfect but works for most text-based PDFs
      const pageTexts = fullText.split(/\n\n(?=Page|\d+\s)/i).filter(p => p.trim());

      if (pageTexts.length > 0 && pageTexts.length === data.numpages) {
        // Found matching page count, use it
        pageTexts.forEach((text, i) => {
          pages.push({
            pageNumber: i + 1,
            text: text.trim(),
            charCount: text.trim().length,
          });
        });
      } else {
        // Create synthetic pages based on document structure
        // Use existing pages array if available
        const textByPage = ((data as unknown) as Record<string, unknown>).pages as string[] | undefined;
        if (textByPage && Array.isArray(textByPage)) {
          textByPage.forEach((pageText, i) => {
            pages.push({
              pageNumber: i + 1,
              text: pageText.trim(),
              charCount: pageText.trim().length,
            });
          });
        } else {
          // Last resort: single page for entire content
          pages.push({
            pageNumber: 1,
            text: fullText.trim(),
            charCount: fullText.trim().length,
          });
        }
      }
    }

    // If no pages were extracted, create a single page
    if (pages.length === 0 && fullText.trim()) {
      pages.push({
        pageNumber: 1,
        text: fullText.trim(),
        charCount: fullText.trim().length,
      });
    }

    return pages;
  } catch (error) {
    console.error('PDF page extraction failed:', error);
    return [];
  }
}

/**
 * Extract pages from DOCX — DOCX doesn't have pages, so simulate by sections
 * We use paragraph groupings to create logical page divisions
 */
async function extractDocxPages(buffer: Buffer): Promise<PageContent[]> {
  try {
    const mammoth = await import('mammoth');

    // Extract with paragraph info for better sectioning
    const result = await mammoth.extractRawText({ buffer });

    // Mammoth doesn't provide page structure since DOCX doesn't have fixed pages
    // We simulate pages by splitting on section breaks and headings

    const fullText = result.value;
    const paragraphs = fullText.split(/\n\n+/);

    // Group paragraphs into "pages" of roughly 3000 chars (typical page)
    const TARGET_PAGE_SIZE = 3000;
    const pages: PageContent[] = [];
    let currentPage = '';
    let pageNumber = 1;

    for (const paragraph of paragraphs) {
      if (currentPage.length + paragraph.length > TARGET_PAGE_SIZE && currentPage.length > 0) {
        // Finish current page
        pages.push({
          pageNumber,
          text: currentPage.trim(),
          charCount: currentPage.trim().length,
        });
        currentPage = paragraph;
        pageNumber++;
      } else {
        currentPage += (currentPage.length > 0 ? '\n\n' : '') + paragraph;
      }
    }

    // Don't forget the last page
    if (currentPage.trim()) {
      pages.push({
        pageNumber,
        text: currentPage.trim(),
        charCount: currentPage.trim().length,
      });
    }

    // If no pages created, return entire document as single page
    if (pages.length === 0) {
      pages.push({
        pageNumber: 1,
        text: fullText.trim(),
        charCount: fullText.trim().length,
      });
    }

    return pages;
  } catch (error) {
    console.error('DOCX page extraction failed:', error);

    // Fallback to simple single-page extraction
    const text = await extractDocxTextFallback(buffer);
    return [
      {
        pageNumber: 1,
        text,
        charCount: text.length,
      },
    ];
  }
}

// ========================
// UTILITIES
// ========================

/**
 * Detect if a file appears to be a scanned/image-based PDF (low text ratio)
 *
 * Scanned PDFs have:
 * - Low text ratio (text chars / total buffer size < 0.05)
 * - No readable ASCII patterns
 * - Many binary/unusual characters
 */
export function detectScannedPdf(text: string, totalChars: number): boolean {
  if (totalChars === 0) {
    return true; // Empty buffer = likely scanned
  }

  // Calculate text ratio
  const textRatio = text.length / totalChars;

  // If text is less than 5% of buffer, likely scanned
  if (textRatio < 0.05) {
    return true;
  }

  // Check for readable ASCII content
  const printableChars = text.replace(/[^\x20-\x7E\n\r\t]/g, '');
  const printableRatio = printableChars.length / text.length;

  // If less than 60% printable, likely scanned/image-based
  if (printableRatio < 0.6) {
    return true;
  }

  // Check for common PDF binary markers
  const hasImageMarkers =
    text.includes(' JFIF') || // JPEG
    text.includes('/Filter /DCTDecode') || // JPEG compression
    text.includes('/CCITT') || // Fax compression
    text.includes('/JBIG2'); // JBIG2 compression

  if (hasImageMarkers) {
    return true;
  }

  return false;
}

/**
 * Get extraction method recommendations based on file characteristics
 */
export function getExtractionRecommendation(
  mimeType: string,
  fileSizeBytes: number,
  suggestedMethod: 'pdf-parse' | 'mammoth' | 'marker'
): { method: string; reason: string } {
  const fileSizeMB = fileSizeBytes / (1024 * 1024);

  switch (suggestedMethod) {
    case 'pdf-parse':
      if (fileSizeMB > 50) {
        return {
          method: 'marker',
          reason: `Large PDF (${fileSizeMB.toFixed(1)}MB). Marker GPU extraction recommended for speed.`,
        };
      }
      return {
        method: 'pdf-parse',
        reason: 'Standard text-based PDF. pdf-parse handles this efficiently (~50ms/page).',
      };

    case 'mammoth':
      if (fileSizeMB > 20) {
        return {
          method: 'mammoth',
          reason: `Large DOCX (${fileSizeMB.toFixed(1)}MB). Mammoth should handle it, but may be slow.`,
        };
      }
      return {
        method: 'mammoth',
        reason: 'DOCX file. Mammoth provides reliable text extraction via XML parsing.',
      };

    case 'marker':
      return {
        method: 'marker',
        reason: 'Image-based PDF suspected. Marker GPU extraction needed for OCR.',
      };

    default:
      return {
        method: 'none',
        reason: 'Unknown file type. Manual review may be required.',
      };
  }
}

/**
 * Check if a MIME type is supported for extraction
 */
export function isSupportedMimeType(mimeType: string): boolean {
  const normalized = mimeType.toLowerCase();
  return (
    PDF_MIME_TYPES.includes(normalized) ||
    DOCX_MIME_TYPES.includes(normalized) ||
    TEXT_MIME_TYPES.includes(normalized)
  );
}

/**
 * Get a human-readable description of supported types
 */
export function getSupportedTypesDescription(): string {
  return `
Supported file types for text extraction:
- PDF: application/pdf
- DOCX: application/vnd.openxmlformats-officedocument.wordprocessingml.document
- Text: text/plain, text/markdown, text/csv, text/html, application/json, application/msword
  `.trim();
}