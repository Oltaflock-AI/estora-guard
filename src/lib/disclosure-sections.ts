// Section schemas for non-AOS documents (SPD and LBP). Used by DisclosureViewer
// to render disclosures with the same left-rail / center / right-rail layout
// the AOS editor uses, but read-only — signed disclosures aren't editable.
//
// Each section claims a list of extracted field_names. Fields that don't match
// any section fall into a synthetic "Other extracted fields" bucket at the
// bottom of the viewer.

export interface DisclosureSection {
  id: string;
  label: string;
  paragraph?: string;
  /** Extraction field_name values that belong in this section, in display order. */
  fieldNames: string[];
}

export const DISCLOSURE_SECTIONS: Record<string, DisclosureSection[]> = {
  sellers_property_disclosure: [
    {
      id: 'property_seller',
      label: 'Property & Seller',
      paragraph: 'Form Header',
      // Only fields the SPD form's header actually contains. school_district
      // and tax_parcel_id are AOS-only; seller_disclosure_attached is a
      // meta-flag pulled from the AOS reference to the SPD, not from the SPD
      // itself; street_2 is optional and absent when the address has no
      // apt/unit line.
      fieldNames: [
        'document_kind',
        'street_1',
        'city',
        'state',
        'postal_code',
        'municipality',
        'county',
        'year_built',
        'seller_first_name',
        'seller_last_name',
      ],
    },
    {
      id: 's2_roof',
      label: 'Roof',
      paragraph: 'Section 2',
      fieldNames: ['roof_warranty_transferable'],
    },
    {
      id: 's3_basement',
      label: 'Basement & Crawl Spaces',
      paragraph: 'Section 3',
      fieldNames: ['basement_waterproofed', 'basement_wall_cracks_disclosed'],
    },
    {
      id: 's9_10_water_sewer',
      label: 'Water & Sewage',
      paragraph: 'Sections 9–10',
      fieldNames: ['water_source', 'sewage_disposal'],
    },
    {
      id: 's11_structural',
      label: 'Structural / Foundation',
      paragraph: 'Section 11',
      fieldNames: ['deck_permit_number'],
    },
    {
      id: 's12_hazardous',
      label: 'Hazardous & Environmental',
      paragraph: 'Section 12',
      // SPD §12 has lead-paint awareness (12a), asbestos, radon, mold, UST,
      // formaldehyde, landfill, pests. lead_based_paint_disclosure_attached
      // is an AOS attachment flag, not a labeled SPD §12 field — exclude it.
      fieldNames: [
        'radon_mitigation_present',
        'radon_test_value_pci_l',
      ],
    },
  ],
  lead_based_paint_disclosure: [
    {
      id: 'property_parties',
      label: 'Property & Parties',
      paragraph: 'Form Header',
      // street_2 is optional and absent for addresses with no apt/unit line,
      // so excluding it from the expected set keeps the completion ring honest.
      fieldNames: [
        'document_kind',
        'street_1',
        'city',
        'state',
        'postal_code',
        'year_built',
        'seller_first_name',
        'seller_last_name',
        'purchaser_first_name',
        'purchaser_last_name',
        'contract_date',
      ],
    },
    {
      id: 'section_a',
      label: "Seller's Disclosure",
      paragraph: 'Section A',
      fieldNames: ['lead_based_paint_disclosure_attached'],
    },
    {
      id: 'section_b',
      label: "Buyer's Rights",
      paragraph: 'Section B',
      fieldNames: ['lead_based_paint_inspection_elected'],
    },
    {
      id: 'section_c',
      label: "Agent's Acknowledgment",
      paragraph: 'Section C',
      fieldNames: ['seller_broker_name', 'buyer_broker_name', 'brokerage_name'],
    },
  ],
};

export function sectionsForKind(kind: string | null | undefined): DisclosureSection[] | null {
  if (!kind) return null;
  return DISCLOSURE_SECTIONS[kind] ?? null;
}

export function readableKind(kind: string | null | undefined): string {
  switch (kind) {
    case 'agreement_of_sale':
      return 'Agreement of Sale';
    case 'sellers_property_disclosure':
      return "Seller's Property Disclosure";
    case 'lead_based_paint_disclosure':
      return 'Lead-Based Paint Disclosure';
    case 'addendum':
      return 'Addendum';
    case 'other':
      return 'Other Document';
    default:
      return 'Document';
  }
}
