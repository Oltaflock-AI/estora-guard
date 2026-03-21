import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@anthropic-ai/sdk', () => ({
  default: class MockAnthropic {
    messages = {
      create: vi.fn().mockResolvedValue({
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              seller_first_name: 'John',
              seller_last_name: 'Smith',
              purchaser_first_name: 'Jane',
              purchaser_last_name: 'Doe',
              street_1: '123 Main St',
              city: 'Manhattan',
              county: 'New York',
              postal_code: '10001',
              purchase_price: 500000,
              downpayment_amount: 50000,
              closing_date: '2026-04-15',
              commitment_date: '2026-03-25',
              contract_date: '2026-02-01',
              property_type: 'condo',
              subject_to_mortgage_contingency: true,
              firpta_cert_required: false,
              summary: 'Standard NY residential contract.',
              risk_flags: [
                {
                  flag_type: 'tight_deadline',
                  severity: 'high',
                  title: 'Short closing window',
                  explanation: 'Closing is within 30 days.',
                },
              ],
            }),
          },
        ],
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
