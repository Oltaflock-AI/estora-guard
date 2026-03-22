import Anthropic from '@anthropic-ai/sdk';

const CLAUDE_MODEL = 'claude-sonnet-4-20250514';
const MAX_TOKENS = 4_000;

export interface ExtractionField {
  fieldName: string;
  fieldValue: string | null;
  confidence: number;
  pageRef: number | null;
}

export interface RiskFlagResult {
  flagType: 'tight_deadline' | 'missing_clause' | 'unusual_condition' | 'unclear_language' | 'material_defect';
  severity: 'low' | 'medium' | 'high';
  title: string;
  explanation: string;
}

export interface ExtractionResult {
  rawText: string;
  summary: string;
  fields: ExtractionField[];
  riskFlags: RiskFlagResult[];
}

const EXTRACTION_PROMPT = `You are an expert real estate attorney analyzing a New York Residential Contract of Sale. Extract all structured data from the attached PDF document.

Return a JSON object with exactly two keys:

1. "fields": an array of objects, each with:
   - "fieldName": one of the field names listed below
   - "fieldValue": the extracted value as a string (dates as YYYY-MM-DD, currency as plain numbers without $ or commas, booleans as "true"/"false")
   - "confidence": a number 0.0-1.0 reflecting extraction certainty
   - "pageRef": page number if identifiable, otherwise null

2. "riskFlags": an array of objects, each with:
   - "flagType": one of "tight_deadline", "missing_clause", "unusual_condition", "unclear_language", "material_defect"
   - "severity": "low", "medium", or "high"
   - "title": short title (max 80 chars)
   - "explanation": 1-2 sentence explanation

**Field names to extract (include all that are present):**

Party fields: seller_first_name, seller_last_name, seller_email, seller_phone, seller_city, seller_masked_tax_id, purchaser_first_name, purchaser_last_name, purchaser_email, purchaser_phone, purchaser_city, purchaser_masked_tax_id, seller_attorney_name, purchaser_attorney_name

Property fields: street_1, street_2, city, county, postal_code, property_type, bedrooms, bathrooms, year_built, legal_description, has_public_road_access, delivered_vacant, as_is_sale

Financial fields: purchase_price, downpayment_amount, balance_due_at_closing, acceptable_funds

Mortgage fields: mortgage_type, lender_name, principal_amount, interest_rate, monthly_payment, escrow_required, commitment_received

Date fields: contract_date, closing_date, commitment_date

Condition fields: subject_to_mortgage_contingency, seller_has_right_to_sell, seller_not_foreign_person, no_undisclosed_abatements, title_insurable, premises_broom_clean, systems_in_working_order, smoke_detector_affidavit_required, certificate_of_occupancy_required, firpta_cert_required

Escrow fields: escrow_agent_name, bank_name, account_reference, amount_held, segregated_account

Title fields: title_company_name

Return ONLY valid JSON. No markdown fences, no commentary.`;

function validatePdfBytes(buffer: Buffer): void {
  if (buffer.length < 5) {
    throw new PdfValidationError('File is too small to be a valid PDF.');
  }
  const header = buffer.subarray(0, 5).toString('ascii');
  if (header !== '%PDF-') {
    throw new PdfValidationError('File does not have valid PDF magic bytes.');
  }
}

export class PdfValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PdfValidationError';
  }
}

export class ExtractionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ExtractionError';
  }
}

function stripMarkdownFences(raw: string): string {
  return raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();
}

export async function runExtraction(pdfBuffer: Buffer): Promise<ExtractionResult> {
  validatePdfBytes(pdfBuffer);

  const client = new Anthropic();
  const pdfBase64 = pdfBuffer.toString('base64');

  let responseText = '';
  let retries = 0;

  while (retries < 2) {
    const message = await client.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: MAX_TOKENS,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'document',
              source: {
                type: 'base64',
                media_type: 'application/pdf',
                data: pdfBase64,
              },
            },
            {
              type: 'text',
              text: EXTRACTION_PROMPT,
            },
          ],
        },
      ],
    });

    const block = message.content[0];
    if (block.type !== 'text') {
      throw new ExtractionError('Claude returned non-text content.');
    }
    responseText = stripMarkdownFences(block.text);

    try {
      const parsed = JSON.parse(responseText) as {
        fields: ExtractionField[];
        riskFlags: RiskFlagResult[];
      };

      const summary = buildSummary(parsed.fields);

      return {
        rawText: `[PDF document analyzed directly by Claude — ${pdfBuffer.length} bytes]`,
        summary,
        fields: parsed.fields ?? [],
        riskFlags: parsed.riskFlags ?? [],
      };
    } catch {
      retries++;
      if (retries >= 2) {
        throw new ExtractionError(
          `Claude returned malformed JSON after ${retries} attempts.`
        );
      }
    }
  }

  throw new ExtractionError('Extraction failed unexpectedly.');
}

function buildSummary(fields: ExtractionField[]): string {
  const get = (name: string) =>
    fields.find((f) => f.fieldName === name)?.fieldValue ?? null;

  const parts: string[] = [];

  const sellerFirst = get('seller_first_name');
  const sellerLast = get('seller_last_name');
  const buyerFirst = get('purchaser_first_name');
  const buyerLast = get('purchaser_last_name');
  if (sellerFirst && sellerLast && buyerFirst && buyerLast) {
    parts.push(`${sellerFirst} ${sellerLast} selling to ${buyerFirst} ${buyerLast}`);
  }

  const street = get('street_1');
  const city = get('city');
  if (street && city) {
    parts.push(`at ${street}, ${city}`);
  }

  const price = get('purchase_price');
  if (price) {
    const formatted = Number(price).toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    });
    parts.push(`for ${formatted}`);
  }

  const closeDate = get('closing_date');
  if (closeDate) {
    parts.push(`closing ${closeDate}`);
  }

  return parts.length > 0
    ? parts.join(' ') + '.'
    : 'Contract details extracted from uploaded document.';
}
