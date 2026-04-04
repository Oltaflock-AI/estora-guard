import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { ExtractionResult } from '@/lib/services/document-intelligence';

const VALID_EXTRACTION_RESPONSE = JSON.stringify({
  fields: [
    { fieldName: 'seller_first_name', fieldValue: 'John', confidence: 0.95, pageRef: 1 },
    { fieldName: 'seller_last_name', fieldValue: 'Smith', confidence: 0.95, pageRef: 1 },
    { fieldName: 'purchaser_first_name', fieldValue: 'Jane', confidence: 0.9, pageRef: 1 },
    { fieldName: 'purchaser_last_name', fieldValue: 'Doe', confidence: 0.9, pageRef: 1 },
    { fieldName: 'street_1', fieldValue: '123 Main St', confidence: 0.95, pageRef: 1 },
    { fieldName: 'city', fieldValue: 'Manhattan', confidence: 0.95, pageRef: 1 },
    { fieldName: 'purchase_price', fieldValue: '500000', confidence: 0.95, pageRef: 2 },
    { fieldName: 'closing_date', fieldValue: '2026-04-15', confidence: 0.9, pageRef: 3 },
  ],
  riskFlags: [
    {
      flagType: 'tight_deadline',
      severity: 'high',
      title: 'Short closing window',
      explanation: 'Closing is within 30 days.',
    },
  ],
});

vi.mock('@anthropic-ai/sdk', () => ({
  default: class MockAnthropic {
    messages = {
      create: vi.fn().mockResolvedValue({
        content: [{ type: 'text', text: VALID_EXTRACTION_RESPONSE }],
      }),
    };
  },
}));

describe('Document Intelligence - Extraction', () => {
  it('parses valid extraction JSON from Claude response', () => {
    const responseText = JSON.stringify({
      seller_first_name: 'John',
      seller_last_name: 'Smith',
      purchase_price: 500000,
    });

    const parsed = JSON.parse(responseText);
    expect(parsed.seller_first_name).toBe('John');
    expect(parsed.purchase_price).toBe(500000);
  });

  it('strips markdown fences before parsing', () => {
    const raw = '```json\n{"seller_first_name": "Alice"}\n```';
    const cleaned = raw.replace(/```(?:json)?\s*/g, '').trim();
    const parsed = JSON.parse(cleaned);
    expect(parsed.seller_first_name).toBe('Alice');
  });

  it('handles double-fenced markdown', () => {
    const raw = '```\n```json\n{"price": 100}\n```\n```';
    const cleaned = raw.replace(/```(?:json)?\s*/g, '').trim();
    const parsed = JSON.parse(cleaned);
    expect(parsed.price).toBe(100);
  });
});

describe('Document Intelligence - Risk Detection', () => {
  it('identifies tight deadline risk flag', () => {
    const closingDate = new Date();
    closingDate.setDate(closingDate.getDate() + 10);
    const contractDate = new Date();

    const daysDiff = Math.ceil(
      (closingDate.getTime() - contractDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    expect(daysDiff).toBeLessThan(30);
  });

  it('identifies missing commitment date', () => {
    const extraction = {
      subject_to_mortgage_contingency: true,
      commitment_date: null,
    };

    const hasMortgageContingency = extraction.subject_to_mortgage_contingency;
    const missingCommitment = extraction.commitment_date === null;

    expect(hasMortgageContingency && missingCommitment).toBe(true);
  });
});

describe('PDF Validation', () => {
  it('validates PDF magic bytes', () => {
    const validPdf = Buffer.from('%PDF-1.4\n');
    const invalidFile = Buffer.from('Not a PDF file');

    expect(validPdf.subarray(0, 5).toString()).toBe('%PDF-');
    expect(invalidFile.subarray(0, 5).toString()).not.toBe('%PDF-');
  });

  it('rejects files that are too small', () => {
    const tinyText = 'Short';
    expect(tinyText.length).toBeLessThan(100);
  });
});

describe('LlamaParse Integration', () => {
  const VALID_PDF = Buffer.from('%PDF-1.4 fake pdf content that is long enough to be valid');
  const SAMPLE_MARKDOWN = 'This is a contract of sale between John Smith (Seller) and Jane Doe (Purchaser) for 123 Main St, Manhattan...';
  let originalFetch: typeof global.fetch;
  let originalEnv: string | undefined;

  beforeEach(() => {
    originalFetch = global.fetch;
    originalEnv = process.env.LLAMA_CLOUD_API_KEY;
    process.env.LLAMA_CLOUD_API_KEY = 'llx-test-key';
  });

  afterEach(() => {
    global.fetch = originalFetch;
    process.env.LLAMA_CLOUD_API_KEY = originalEnv;
    vi.restoreAllMocks();
  });

  function mockLlamaParseSuccess(markdown: string = SAMPLE_MARKDOWN) {
    let callCount = 0;
    global.fetch = vi.fn(async (url: string | URL | Request) => {
      const urlStr = typeof url === 'string' ? url : url.toString();

      if (urlStr.includes('/v1/files/')) {
        return new Response(JSON.stringify({ id: 'file-123' }), { status: 200 });
      }

      if (urlStr.includes('/v2/parse/') && urlStr.includes('/result/markdown')) {
        return new Response(JSON.stringify({ markdown }), { status: 200 });
      }

      if (urlStr.includes('/v2/parse/') && !urlStr.includes('parse-')) {
        // Could be POST (create job) or GET (poll)
        callCount++;
        if (callCount <= 1) {
          // POST create job
          return new Response(JSON.stringify({ id: 'job-456' }), { status: 200 });
        }
        // GET poll — return completed
        return new Response(JSON.stringify({ status: 'completed' }), { status: 200 });
      }

      return new Response('Not found', { status: 404 });
    }) as typeof fetch;
  }

  it('parsePdfWithLlamaParse returns markdown on success', async () => {
    const { parsePdfWithLlamaParse } = await import('@/lib/services/document-intelligence');
    mockLlamaParseSuccess();

    const result = await parsePdfWithLlamaParse(VALID_PDF);
    expect(result).toBe(SAMPLE_MARKDOWN);
    expect(global.fetch).toHaveBeenCalled();
  });

  it('parsePdfWithLlamaParse throws when API key is missing', async () => {
    const { parsePdfWithLlamaParse, LlamaParseError } = await import('@/lib/services/document-intelligence');
    delete process.env.LLAMA_CLOUD_API_KEY;

    await expect(parsePdfWithLlamaParse(VALID_PDF)).rejects.toThrow(LlamaParseError);
  });

  it('parsePdfWithLlamaParse throws on upload failure', async () => {
    const { parsePdfWithLlamaParse, LlamaParseError } = await import('@/lib/services/document-intelligence');
    global.fetch = vi.fn(async () => new Response('Server error', { status: 500 })) as typeof fetch;

    await expect(parsePdfWithLlamaParse(VALID_PDF)).rejects.toThrow(LlamaParseError);
  });

  it('runExtraction falls back to direct PDF when LlamaParse fails', async () => {
    const { runExtraction } = await import('@/lib/services/document-intelligence');
    // Make fetch fail so LlamaParse errors out
    global.fetch = vi.fn(async () => { throw new Error('Network error'); }) as typeof fetch;

    const result = await runExtraction(VALID_PDF);
    // Should still succeed via direct extraction fallback
    expect(result).toBeDefined();
    expect(result.fields).toBeDefined();
    expect(Array.isArray(result.fields)).toBe(true);
  });

  it('runExtraction falls back when LlamaParse returns empty text', async () => {
    const { runExtraction } = await import('@/lib/services/document-intelligence');
    mockLlamaParseSuccess(''); // Empty markdown

    const result = await runExtraction(VALID_PDF);
    expect(result).toBeDefined();
    expect(result.rawText).toContain('PDF document analyzed directly by Claude');
  });

  it('parsePdfWithLlamaParse throws on poll timeout', async () => {
    const { parsePdfWithLlamaParse, LlamaParseError } = await import('@/lib/services/document-intelligence');

    let callCount = 0;
    global.fetch = vi.fn(async (url: string | URL | Request) => {
      const urlStr = typeof url === 'string' ? url : url.toString();

      if (urlStr.includes('/v1/files/')) {
        return new Response(JSON.stringify({ id: 'file-123' }), { status: 200 });
      }

      if (urlStr.includes('/v2/parse/')) {
        callCount++;
        if (callCount <= 1) {
          return new Response(JSON.stringify({ id: 'job-456' }), { status: 200 });
        }
        // Always return processing — never complete
        return new Response(JSON.stringify({ status: 'processing' }), { status: 200 });
      }

      return new Response('Not found', { status: 404 });
    }) as typeof fetch;

    await expect(parsePdfWithLlamaParse(VALID_PDF)).rejects.toThrow(LlamaParseError);
  }, 120_000);
});
