export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      people: {
        Row: {
          id: string;
          first_name: string;
          last_name: string;
          email: string;
          phone: string | null;
          city: string;
          state: string;
          postal_code: string | null;
          is_nyc: boolean;
          masked_tax_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          first_name: string;
          last_name: string;
          email: string;
          phone?: string | null;
          city: string;
          state?: string;
          postal_code?: string | null;
          is_nyc?: boolean;
          masked_tax_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          first_name?: string;
          last_name?: string;
          email?: string;
          phone?: string | null;
          city?: string;
          state?: string;
          postal_code?: string | null;
          is_nyc?: boolean;
          masked_tax_id?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      properties: {
        Row: {
          id: string;
          street_1: string;
          street_2: string | null;
          city: string;
          state: string;
          postal_code: string;
          county: string;
          property_type: 'single_family' | 'condo' | 'co_op' | 'townhouse' | 'multi_family';
          bedrooms: number | null;
          bathrooms: number | null;
          year_built: number | null;
          legal_description: string;
          has_public_road_access: boolean;
          delivered_vacant: boolean;
          as_is_sale: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          street_1: string;
          street_2?: string | null;
          city: string;
          state?: string;
          postal_code: string;
          county: string;
          property_type: 'single_family' | 'condo' | 'co_op' | 'townhouse' | 'multi_family';
          bedrooms?: number | null;
          bathrooms?: number | null;
          year_built?: number | null;
          legal_description: string;
          has_public_road_access?: boolean;
          delivered_vacant?: boolean;
          as_is_sale?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          street_1?: string;
          street_2?: string | null;
          city?: string;
          state?: string;
          postal_code?: string;
          county?: string;
          property_type?: 'single_family' | 'condo' | 'co_op' | 'townhouse' | 'multi_family';
          bedrooms?: number | null;
          bathrooms?: number | null;
          year_built?: number | null;
          legal_description?: string;
          has_public_road_access?: boolean;
          delivered_vacant?: boolean;
          as_is_sale?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };
      contracts: {
        Row: {
          id: string;
          contract_number: string;
          property_id: string;
          seller_id: string;
          purchaser_id: string;
          seller_attorney_id: string | null;
          purchaser_attorney_id: string | null;
          status: 'draft' | 'pending_commitment' | 'active' | 'cancelled' | 'closed' | 'defaulted_buyer' | 'defaulted_seller';
          contract_date: string;
          closing_date: string | null;
          commitment_date: string | null;
          purchase_price: number;
          downpayment_amount: number;
          balance_due_at_closing: number;
          acceptable_funds: 'cash' | 'certified_check' | 'official_bank_check' | 'wire' | 'other';
          subject_to_mortgage_contingency: boolean;
          title_company_name: string | null;
          schedule_a_legal_description: string | null;
          seller_has_right_to_sell: boolean;
          seller_not_foreign_person: boolean;
          no_undisclosed_abatements: boolean;
          title_insurable: boolean;
          premises_broom_clean: boolean;
          systems_in_working_order: boolean;
          smoke_detector_affidavit_required: boolean;
          certificate_of_occupancy_required: boolean;
          firpta_cert_required: boolean;
          notes: string | null;
          health_score: number | null;
          health_status: 'green' | 'yellow' | 'red' | null;
          source_document_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          contract_number: string;
          property_id: string;
          seller_id: string;
          purchaser_id: string;
          seller_attorney_id?: string | null;
          purchaser_attorney_id?: string | null;
          status?: 'draft' | 'pending_commitment' | 'active' | 'cancelled' | 'closed' | 'defaulted_buyer' | 'defaulted_seller';
          contract_date: string;
          closing_date?: string | null;
          commitment_date?: string | null;
          purchase_price: number;
          downpayment_amount?: number;
          balance_due_at_closing?: number;
          acceptable_funds?: 'cash' | 'certified_check' | 'official_bank_check' | 'wire' | 'other';
          subject_to_mortgage_contingency?: boolean;
          title_company_name?: string | null;
          schedule_a_legal_description?: string | null;
          seller_has_right_to_sell?: boolean;
          seller_not_foreign_person?: boolean;
          no_undisclosed_abatements?: boolean;
          title_insurable?: boolean;
          premises_broom_clean?: boolean;
          systems_in_working_order?: boolean;
          smoke_detector_affidavit_required?: boolean;
          certificate_of_occupancy_required?: boolean;
          firpta_cert_required?: boolean;
          notes?: string | null;
          health_score?: number | null;
          health_status?: 'green' | 'yellow' | 'red' | null;
          source_document_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          contract_number?: string;
          property_id?: string;
          seller_id?: string;
          purchaser_id?: string;
          seller_attorney_id?: string | null;
          purchaser_attorney_id?: string | null;
          status?: 'draft' | 'pending_commitment' | 'active' | 'cancelled' | 'closed' | 'defaulted_buyer' | 'defaulted_seller';
          contract_date?: string;
          closing_date?: string | null;
          commitment_date?: string | null;
          purchase_price?: number;
          downpayment_amount?: number;
          balance_due_at_closing?: number;
          acceptable_funds?: 'cash' | 'certified_check' | 'official_bank_check' | 'wire' | 'other';
          subject_to_mortgage_contingency?: boolean;
          title_company_name?: string | null;
          schedule_a_legal_description?: string | null;
          seller_has_right_to_sell?: boolean;
          seller_not_foreign_person?: boolean;
          no_undisclosed_abatements?: boolean;
          title_insurable?: boolean;
          premises_broom_clean?: boolean;
          systems_in_working_order?: boolean;
          smoke_detector_affidavit_required?: boolean;
          certificate_of_occupancy_required?: boolean;
          firpta_cert_required?: boolean;
          notes?: string | null;
          health_score?: number | null;
          health_status?: 'green' | 'yellow' | 'red' | null;
          source_document_id?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      contract_personal_property: {
        Row: {
          id: string;
          contract_id: string;
          item_name: string;
          included: boolean;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          contract_id: string;
          item_name: string;
          included?: boolean;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          contract_id?: string;
          item_name?: string;
          included?: boolean;
          notes?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      contract_permitted_exceptions: {
        Row: {
          id: string;
          contract_id: string;
          exception_name: string;
          details: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          contract_id: string;
          exception_name: string;
          details?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          contract_id?: string;
          exception_name?: string;
          details?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      contract_violations: {
        Row: {
          id: string;
          contract_id: string;
          violation_type: string;
          issuing_authority: string | null;
          must_be_cleared_before_closing: boolean;
          resolved: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          contract_id: string;
          violation_type: string;
          issuing_authority?: string | null;
          must_be_cleared_before_closing?: boolean;
          resolved?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          contract_id?: string;
          violation_type?: string;
          issuing_authority?: string | null;
          must_be_cleared_before_closing?: boolean;
          resolved?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };
      contract_mortgages: {
        Row: {
          id: string;
          contract_id: string;
          mortgage_type: 'existing_assumed' | 'purchase_money' | 'institutional';
          lender_name: string | null;
          principal_amount: number;
          interest_rate: number | null;
          monthly_payment: number | null;
          escrow_required: boolean;
          commitment_received: boolean;
          commitment_received_date: string | null;
          subordinate_to_future_financing: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          contract_id: string;
          mortgage_type: 'existing_assumed' | 'purchase_money' | 'institutional';
          lender_name?: string | null;
          principal_amount: number;
          interest_rate?: number | null;
          monthly_payment?: number | null;
          escrow_required?: boolean;
          commitment_received?: boolean;
          commitment_received_date?: string | null;
          subordinate_to_future_financing?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          contract_id?: string;
          mortgage_type?: 'existing_assumed' | 'purchase_money' | 'institutional';
          lender_name?: string | null;
          principal_amount?: number;
          interest_rate?: number | null;
          monthly_payment?: number | null;
          escrow_required?: boolean;
          commitment_received?: boolean;
          commitment_received_date?: string | null;
          subordinate_to_future_financing?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };
      contract_escrow: {
        Row: {
          id: string;
          contract_id: string;
          escrow_agent_id: string;
          bank_name: string;
          account_reference: string;
          amount_held: number;
          segregated_account: boolean;
          dispute_flag: boolean;
          release_terms: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          contract_id: string;
          escrow_agent_id: string;
          bank_name: string;
          account_reference: string;
          amount_held: number;
          segregated_account?: boolean;
          dispute_flag?: boolean;
          release_terms?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          contract_id?: string;
          escrow_agent_id?: string;
          bank_name?: string;
          account_reference?: string;
          amount_held?: number;
          segregated_account?: boolean;
          dispute_flag?: boolean;
          release_terms?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      contract_closing_conditions: {
        Row: {
          id: string;
          contract_id: string;
          condition_name: string;
          is_required: boolean;
          is_satisfied: boolean;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          contract_id: string;
          condition_name: string;
          is_required?: boolean;
          is_satisfied?: boolean;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          contract_id?: string;
          condition_name?: string;
          is_required?: boolean;
          is_satisfied?: boolean;
          notes?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      contract_apportionments: {
        Row: {
          id: string;
          contract_id: string;
          prorate_taxes: boolean;
          prorate_water: boolean;
          prorate_fuel: boolean;
          prorate_rents: boolean;
          transfer_tax_paid_by: string;
          recording_fees_paid_by: string;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          contract_id: string;
          prorate_taxes?: boolean;
          prorate_water?: boolean;
          prorate_fuel?: boolean;
          prorate_rents?: boolean;
          transfer_tax_paid_by?: string;
          recording_fees_paid_by?: string;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          contract_id?: string;
          prorate_taxes?: boolean;
          prorate_water?: boolean;
          prorate_fuel?: boolean;
          prorate_rents?: boolean;
          transfer_tax_paid_by?: string;
          recording_fees_paid_by?: string;
          notes?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          email: string | null;
          avatar_url: string | null;
          person_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          email?: string | null;
          avatar_url?: string | null;
          person_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string | null;
          email?: string | null;
          avatar_url?: string | null;
          person_id?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      organizations: {
        Row: {
          id: string;
          name: string;
          slug: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      memberships: {
        Row: {
          id: string;
          org_id: string;
          user_id: string;
          role: 'agent' | 'coordinator' | 'broker' | 'attorney' | 'admin' | 'auditor';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          org_id: string;
          user_id: string;
          role?: 'agent' | 'coordinator' | 'broker' | 'attorney' | 'admin' | 'auditor';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          org_id?: string;
          user_id?: string;
          role?: 'agent' | 'coordinator' | 'broker' | 'attorney' | 'admin' | 'auditor';
          updated_at?: string;
        };
        Relationships: [];
      };
      documents: {
        Row: {
          id: string;
          org_id: string;
          uploaded_by: string;
          contract_id: string | null;
          filename: string;
          storage_path: string;
          doc_type: 'agreement_of_sale' | 'disclosure' | 'addendum' | 'other' | null;
          raw_text: string | null;
          summary: string | null;
          status: 'pending' | 'processing' | 'done' | 'failed';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          org_id: string;
          uploaded_by: string;
          contract_id?: string | null;
          filename: string;
          storage_path: string;
          doc_type?: 'agreement_of_sale' | 'disclosure' | 'addendum' | 'other' | null;
          raw_text?: string | null;
          summary?: string | null;
          status?: 'pending' | 'processing' | 'done' | 'failed';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          org_id?: string;
          uploaded_by?: string;
          contract_id?: string | null;
          filename?: string;
          storage_path?: string;
          doc_type?: 'agreement_of_sale' | 'disclosure' | 'addendum' | 'other' | null;
          raw_text?: string | null;
          summary?: string | null;
          status?: 'pending' | 'processing' | 'done' | 'failed';
          updated_at?: string;
        };
        Relationships: [];
      };
      extractions: {
        Row: {
          id: string;
          document_id: string;
          field_name: string;
          field_value: string | null;
          confidence: number | null;
          page_ref: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          document_id: string;
          field_name: string;
          field_value?: string | null;
          confidence?: number | null;
          page_ref?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          document_id?: string;
          field_name?: string;
          field_value?: string | null;
          confidence?: number | null;
          page_ref?: number | null;
        };
        Relationships: [];
      };
      risk_flags: {
        Row: {
          id: string;
          document_id: string;
          flag_type: 'tight_deadline' | 'missing_clause' | 'unusual_condition' | 'unclear_language' | 'material_defect';
          severity: 'low' | 'medium' | 'high';
          title: string;
          explanation: string;
          acknowledged: boolean;
          acknowledged_by: string | null;
          acknowledged_at: string | null;
          acknowledged_note: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          document_id: string;
          flag_type: 'tight_deadline' | 'missing_clause' | 'unusual_condition' | 'unclear_language' | 'material_defect';
          severity: 'low' | 'medium' | 'high';
          title: string;
          explanation: string;
          acknowledged?: boolean;
          acknowledged_by?: string | null;
          acknowledged_at?: string | null;
          acknowledged_note?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          document_id?: string;
          flag_type?: 'tight_deadline' | 'missing_clause' | 'unusual_condition' | 'unclear_language' | 'material_defect';
          severity?: 'low' | 'medium' | 'high';
          title?: string;
          explanation?: string;
          acknowledged?: boolean;
          acknowledged_by?: string | null;
          acknowledged_at?: string | null;
          acknowledged_note?: string | null;
        };
        Relationships: [];
      };
      tasks: {
        Row: {
          id: string;
          contract_id: string;
          title: string;
          description: string | null;
          status: 'todo' | 'in_progress' | 'done' | 'overdue';
          severity: 'low' | 'medium' | 'high' | 'critical';
          category: string | null;
          assignee_id: string | null;
          due_at: string | null;
          offset_days: number | null;
          dedupe_key: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          contract_id: string;
          title: string;
          description?: string | null;
          status?: 'todo' | 'in_progress' | 'done' | 'overdue';
          severity?: 'low' | 'medium' | 'high' | 'critical';
          category?: string | null;
          assignee_id?: string | null;
          due_at?: string | null;
          offset_days?: number | null;
          dedupe_key?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          contract_id?: string;
          title?: string;
          description?: string | null;
          status?: 'todo' | 'in_progress' | 'done' | 'overdue';
          severity?: 'low' | 'medium' | 'high' | 'critical';
          category?: string | null;
          assignee_id?: string | null;
          due_at?: string | null;
          offset_days?: number | null;
          dedupe_key?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      timeline_items: {
        Row: {
          id: string;
          contract_id: string;
          label: string;
          description: string | null;
          milestone_type: string | null;
          due_at: string | null;
          completed_at: string | null;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          contract_id: string;
          label: string;
          description?: string | null;
          milestone_type?: string | null;
          due_at?: string | null;
          completed_at?: string | null;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          contract_id?: string;
          label?: string;
          description?: string | null;
          milestone_type?: string | null;
          due_at?: string | null;
          completed_at?: string | null;
          sort_order?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      audit_events: {
        Row: {
          id: string;
          org_id: string;
          actor_id: string | null;
          action: string;
          entity_type: string;
          entity_id: string | null;
          field_name: string | null;
          old_value: string | null;
          new_value: string | null;
          detail: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          org_id: string;
          actor_id?: string | null;
          action: string;
          entity_type: string;
          entity_id?: string | null;
          field_name?: string | null;
          old_value?: string | null;
          new_value?: string | null;
          detail?: Json | null;
          created_at?: string;
        };
        Update: never;
        Relationships: [];
      };
      event_logs: {
        Row: {
          id: string;
          contract_id: string;
          event_type: string;
          entity_type: string | null;
          entity_id: string | null;
          detail: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          contract_id: string;
          event_type: string;
          entity_type?: string | null;
          entity_id?: string | null;
          detail?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          contract_id?: string;
          event_type?: string;
          entity_type?: string | null;
          entity_id?: string | null;
          detail?: Json | null;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      user_org_ids: {
        Args: Record<string, never>;
        Returns: string[];
      };
      is_contract_party: {
        Args: { p_contract_id: string };
        Returns: boolean;
      };
      compute_health: {
        Args: { p_contract_id: string };
        Returns: Json;
      };
      check_deadlines: {
        Args: Record<string, never>;
        Returns: Json;
      };
    };
    Enums: {
      party_role: 'seller' | 'purchaser' | 'attorney' | 'escrow_agent';
      property_type: 'single_family' | 'condo' | 'co_op' | 'townhouse' | 'multi_family';
      contract_status: 'draft' | 'pending_commitment' | 'active' | 'cancelled' | 'closed' | 'defaulted_buyer' | 'defaulted_seller';
      funds_type: 'cash' | 'certified_check' | 'official_bank_check' | 'wire' | 'other';
      mortgage_kind: 'existing_assumed' | 'purchase_money' | 'institutional';
    };
    CompositeTypes: Record<string, never>;
  };
}

type PublicSchema = Database[Extract<keyof Database, 'public'>];

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema['Tables'] & PublicSchema['Views'])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions['schema']]['Tables'] &
        Database[PublicTableNameOrOptions['schema']]['Views'])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions['schema']]['Tables'] &
      Database[PublicTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema['Tables'] &
        PublicSchema['Views'])
    ? (PublicSchema['Tables'] &
        PublicSchema['Views'])[PublicTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema['Tables']
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions['schema']]['Tables']
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema['Tables']
    ? PublicSchema['Tables'][PublicTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema['Tables']
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions['schema']]['Tables']
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema['Tables']
    ? PublicSchema['Tables'][PublicTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema['Enums']
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions['schema']]['Enums']
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions['schema']]['Enums'][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema['Enums']
    ? PublicSchema['Enums'][PublicEnumNameOrOptions]
    : never;
