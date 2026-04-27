import Anthropic from '@anthropic-ai/sdk';

const CLAUDE_MODEL = 'claude-sonnet-4-20250514';
const MAX_TOKENS = 4_000;

const LLAMAPARSE_BASE_URL = 'https://api.cloud.llamaindex.ai/api';
const LLAMAPARSE_POLL_INTERVAL_MS = 2_000;
const LLAMAPARSE_MAX_POLLS = 20;

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
  /** Which side of the deal this risk threatens. Defaults to 'both' when Claude omits the field. */
  audience: 'buyer' | 'seller' | 'both';
}

export interface ExtractionResult {
  rawText: string;
  summary: string;
  fields: ExtractionField[];
  riskFlags: RiskFlagResult[];
}

const FIELD_LIST = `**Field names to extract (include all that are present):**

Document classification (always include): document_kind — exactly one of "agreement_of_sale", "sellers_property_disclosure", "lead_based_paint_disclosure", "addendum", "other". Pick the value that best describes what the document IS, based on its title, structure, and content (not by guessing). PAR Form ASR → "agreement_of_sale". PAR Form SPD → "sellers_property_disclosure". HUD/EPA Lead-Based Paint Disclosure → "lead_based_paint_disclosure". A short rider, amendment, or supplement to an existing AOS → "addendum". Anything else → "other".

Party fields: seller_first_name, seller_last_name, seller_email, seller_phone, seller_city, seller_state, seller_masked_tax_id, purchaser_first_name, purchaser_last_name, purchaser_email, purchaser_phone, purchaser_city, purchaser_state, purchaser_masked_tax_id, seller_attorney_name, purchaser_attorney_name, seller_broker_name, buyer_broker_name, brokerage_name

Property fields: street_1, street_2, city, state, county, municipality, postal_code, school_district, tax_parcel_id, mls_number, zoning, property_type, bedrooms, bathrooms, year_built, legal_description, has_public_road_access, delivered_vacant, as_is_sale

Financial fields: purchase_price, downpayment_amount, balance_due_at_closing, acceptable_funds, initial_deposit_amount, additional_deposit_amount, seller_assist_amount, pa_realty_transfer_tax_seller, pa_realty_transfer_tax_buyer, local_transfer_tax

Mortgage fields: mortgage_type, lender_name, principal_amount, interest_rate, monthly_payment, mortgage_term_years, pre_approval_letter_date, escrow_required, commitment_received

Date fields: contract_date, closing_date, settlement_date, commitment_date, inspection_deadline, inspection_contingency_days, attorney_review_deadline, mortgage_application_deadline, appraisal_deadline, title_search_deadline, certificate_of_occupancy_deadline

Settlement fields: settlement_location, settlement_time

Condition fields: subject_to_mortgage_contingency, seller_has_right_to_sell, seller_not_foreign_person, no_undisclosed_abatements, title_insurable, premises_broom_clean, systems_in_working_order, smoke_detector_affidavit_required, certificate_of_occupancy_required, firpta_cert_required

Inspection election fields (PA): home_inspection_elected, wood_destroying_insect_inspection_elected, radon_inspection_elected, mold_inspection_elected, water_quality_inspection_elected, septic_inspection_elected, lead_based_paint_inspection_elected, boundary_survey_elected

Disclosure / utility fields (PA): water_source, sewage_disposal, seller_disclosure_attached, lead_based_paint_disclosure_attached, radon_mitigation_present, radon_test_value_pci_l, basement_waterproofed, basement_wall_cracks_disclosed, roof_warranty_transferable, deck_permit_number, megan_law_notice_acknowledged, governing_law_state

Escrow fields: escrow_agent_name, bank_name, account_reference, amount_held, segregated_account

Title fields: title_company_name

**State-code rule:** \`state\`, \`seller_state\`, \`purchaser_state\`, and \`governing_law_state\` MUST be the two-letter USPS code (e.g., "PA", "NY", "NJ"). Never spell out the state name. If the document repeatedly references "Pennsylvania" or "Commonwealth of Pennsylvania", the value is "PA".`;

const PROMPT_PREAMBLE = `You are an expert real estate attorney analyzing a residential real estate document. The document may be a Pennsylvania Standard Agreement for the Sale of Real Estate (PAR Form ASR), a New York Residential Contract of Sale, a Seller's Property Disclosure, a Lead-Based Paint Disclosure, or a related addendum. Identify the document type from its contents and extract every field that is present.

Return a JSON object with exactly two keys:

1. "fields": an array of objects, each with:
   - "fieldName": one of the field names listed below
   - "fieldValue": the extracted value as a string (dates as YYYY-MM-DD, currency as plain numbers without $ or commas, booleans as "true"/"false", state as two-letter USPS code)
   - "confidence": a number 0.0-1.0 reflecting extraction certainty
   - "pageRef": page number if identifiable, otherwise null

2. "riskFlags": an array of objects, each with:
   - "flagType": one of "tight_deadline", "missing_clause", "unusual_condition", "unclear_language", "material_defect"
   - "severity": "low", "medium", or "high"
   - "title": short title (max 80 chars)
   - "explanation": 1-2 sentence explanation
   - "audience": which side of the deal this risk threatens — one of "buyer", "seller", or "both". Pick "buyer" when the risk hurts the purchaser (e.g., tight financing window, hidden defect they'll inherit, wire fraud on deposit). Pick "seller" when the risk hurts the seller (e.g., disclosure-law liability, FIRPTA exposure, buyer default, broker commission dispute). Pick "both" only when the consequence falls on both parties roughly equally. Default to "both" if uncertain.`;

const TEXT_EXTRACTION_PROMPT = `${PROMPT_PREAMBLE}

${FIELD_LIST}

Return ONLY valid JSON. No markdown fences, no commentary.`;

const EXTRACTION_PROMPT = `${PROMPT_PREAMBLE}

The document is provided as a PDF attachment.

${FIELD_LIST}

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

export class LlamaParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LlamaParseError';
  }
}

function stripMarkdownFences(raw: string): string {
  return raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function parsePdfWithLlamaParse(pdfBuffer: Buffer): Promise<string> {
  const apiKey = process.env.LLAMA_CLOUD_API_KEY;
  if (!apiKey) {
    throw new LlamaParseError('LLAMA_CLOUD_API_KEY is not set.');
  }

  const headers = { Authorization: `Bearer ${apiKey}` };

  // Step 1: Upload file + create parse job in a single call
  const formData = new FormData();
  const blob = new Blob([new Uint8Array(pdfBuffer)], { type: 'application/pdf' });
  formData.append('file', blob, 'contract.pdf');
  formData.append('result_type', 'markdown');

  const uploadRes = await fetch(`${LLAMAPARSE_BASE_URL}/v1/parsing/upload`, {
    method: 'POST',
    headers,
    body: formData,
  });

  if (!uploadRes.ok) {
    const body = await uploadRes.text().catch(() => '');
    throw new LlamaParseError(`Parse upload failed (${uploadRes.status}): ${body}`);
  }

  const uploadData = (await uploadRes.json()) as { id: string };
  const jobId = uploadData.id;
  if (!jobId) {
    throw new LlamaParseError('LlamaParse upload did not return a job_id.');
  }

  // Step 2: Poll for completion
  for (let poll = 0; poll < LLAMAPARSE_MAX_POLLS; poll++) {
    await sleep(LLAMAPARSE_POLL_INTERVAL_MS);

    const statusRes = await fetch(`${LLAMAPARSE_BASE_URL}/v1/parsing/job/${jobId}`, {
      headers,
    });

    if (!statusRes.ok) {
      throw new LlamaParseError(`Poll request failed (${statusRes.status}).`);
    }

    const statusData = (await statusRes.json()) as { status: string };
    const status = statusData.status?.toUpperCase();

    if (status === 'SUCCESS' || status === 'COMPLETED') {
      // Step 3: Get markdown result
      const resultRes = await fetch(
        `${LLAMAPARSE_BASE_URL}/v1/parsing/job/${jobId}/result/markdown`,
        { headers }
      );

      if (!resultRes.ok) {
        throw new LlamaParseError(`Result fetch failed (${resultRes.status}).`);
      }

      const resultData = (await resultRes.json()) as { markdown: string };
      return resultData.markdown ?? '';
    }

    if (status === 'ERROR' || status === 'FAILED' || status === 'CANCELLED') {
      throw new LlamaParseError(`Parse job failed with status: ${statusData.status}`);
    }
  }

  throw new LlamaParseError(
    `LlamaParse polling timed out after ${LLAMAPARSE_MAX_POLLS * LLAMAPARSE_POLL_INTERVAL_MS / 1000}s.`
  );
}

async function runTextExtraction(text: string): Promise<ExtractionResult> {
  const client = new Anthropic();

  let responseText = '';
  let retries = 0;

  while (retries < 2) {
    const message = await client.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: MAX_TOKENS,
      messages: [
        {
          role: 'user',
          content: `${TEXT_EXTRACTION_PROMPT}\n\n---\n\n${text}`,
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
        rawText: text,
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

  throw new ExtractionError('Text extraction failed unexpectedly.');
}

async function runDirectExtraction(pdfBuffer: Buffer): Promise<ExtractionResult> {
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

export async function runExtraction(pdfBuffer: Buffer): Promise<ExtractionResult> {
  validatePdfBytes(pdfBuffer);

  try {
    const markdown = await parsePdfWithLlamaParse(pdfBuffer);

    if (markdown.length < 50) {
      console.warn('LlamaParse returned insufficient text, falling back to direct PDF extraction.');
      return runDirectExtraction(pdfBuffer);
    }

    return await runTextExtraction(markdown);
  } catch (err) {
    if (err instanceof ExtractionError) {
      throw err;
    }
    console.warn('LlamaParse pre-processing failed, falling back to direct PDF extraction:', err);
    return runDirectExtraction(pdfBuffer);
  }
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
