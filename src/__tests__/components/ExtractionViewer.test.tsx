import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ExtractionViewer from '@/components/ExtractionViewer';
import type { Extraction } from '@/lib/types';

function makeExtraction(overrides: Partial<Extraction> = {}): Extraction {
  return {
    id: crypto.randomUUID(),
    document_id: crypto.randomUUID(),
    field_name: 'purchase_price',
    field_value: '500000',
    confidence: 0.95,
    page_ref: null,
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

describe('ExtractionViewer', () => {
  it('renders empty state when no extractions', () => {
    render(<ExtractionViewer extractions={[]} />);
    expect(
      screen.getByText('No fields were extracted from this document.')
    ).toBeInTheDocument();
  });

  it('renders extraction fields with labels', () => {
    const extractions = [
      makeExtraction({ field_name: 'purchase_price', field_value: '500000' }),
      makeExtraction({ field_name: 'closing_date', field_value: '2026-04-15' }),
    ];

    render(<ExtractionViewer extractions={extractions} />);
    expect(screen.getByText('Purchase Price')).toBeInTheDocument();
    expect(screen.getByText('Closing Date')).toBeInTheDocument();
  });

  it('formats currency values', () => {
    const extractions = [
      makeExtraction({ field_name: 'purchase_price', field_value: '500000' }),
    ];

    render(<ExtractionViewer extractions={extractions} />);
    expect(screen.getByText('$500,000')).toBeInTheDocument();
  });

  it('formats date values', () => {
    const extractions = [
      makeExtraction({ field_name: 'closing_date', field_value: '2026-04-15' }),
    ];

    render(<ExtractionViewer extractions={extractions} />);
    expect(screen.getByText('Apr 15, 2026')).toBeInTheDocument();
  });

  it('renders confidence dots', () => {
    const extractions = [
      makeExtraction({ field_name: 'purchase_price', confidence: 0.95 }),
      makeExtraction({ field_name: 'closing_date', confidence: 0.5 }),
    ];

    const { container } = render(
      <ExtractionViewer extractions={extractions} />
    );
    const greenDots = container.querySelectorAll('.bg-success');
    const redDots = container.querySelectorAll('.bg-error');
    expect(greenDots.length).toBeGreaterThanOrEqual(1);
    expect(redDots.length).toBeGreaterThanOrEqual(1);
  });

  it('groups extractions by section', () => {
    const extractions = [
      makeExtraction({ field_name: 'seller_first_name', field_value: 'John' }),
      makeExtraction({ field_name: 'purchase_price', field_value: '400000' }),
    ];

    render(<ExtractionViewer extractions={extractions} />);
    expect(screen.getByText('Parties')).toBeInTheDocument();
    expect(screen.getByText('Price & Terms')).toBeInTheDocument();
  });
});
