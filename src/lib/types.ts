import type { Database } from './supabase/database.types';

export type Tables = Database['public']['Tables'];
export type Enums = Database['public']['Enums'];

export type Person = Tables['people']['Row'];
export type Property = Tables['properties']['Row'];
export type Contract = Tables['contracts']['Row'];
export type ContractPersonalProperty = Tables['contract_personal_property']['Row'];
export type ContractPermittedException = Tables['contract_permitted_exceptions']['Row'];
export type ContractViolation = Tables['contract_violations']['Row'];
export type ContractMortgage = Tables['contract_mortgages']['Row'];
export type ContractEscrow = Tables['contract_escrow']['Row'];
export type ContractClosingCondition = Tables['contract_closing_conditions']['Row'];
export type ContractApportionment = Tables['contract_apportionments']['Row'];

export type Profile = Tables['profiles']['Row'];
export type Organization = Tables['organizations']['Row'];
export type Membership = Tables['memberships']['Row'];
export type Document = Tables['documents']['Row'];
export type Extraction = Tables['extractions']['Row'];
export type RiskFlag = Tables['risk_flags']['Row'];
export type Task = Tables['tasks']['Row'];
export type TimelineItem = Tables['timeline_items']['Row'];
export type AuditEvent = Tables['audit_events']['Row'];
export type EventLog = Tables['event_logs']['Row'];

export type ContractStatus = Enums['contract_status'];
export type PropertyType = Enums['property_type'];
export type PartyRole = Enums['party_role'];
export type FundsType = Enums['funds_type'];
export type MortgageKind = Enums['mortgage_kind'];
export type MembershipRole = Membership['role'];
export type DocumentStatus = Document['status'];
export type DocType = NonNullable<Document['doc_type']>;
export type TaskStatus = Task['status'];
export type TaskSeverity = Task['severity'];
export type RiskFlagType = RiskFlag['flag_type'];
export type RiskSeverity = RiskFlag['severity'];
export type HealthStatus = NonNullable<Contract['health_status']>;

export interface ContractWithRelations extends Contract {
  property: Property;
  seller: Person;
  purchaser: Person;
  seller_attorney: Person | null;
  purchaser_attorney: Person | null;
}

export interface DocumentWithExtractions extends Document {
  extractions: Extraction[];
  risk_flags: RiskFlag[];
}

export interface ContractDetail extends ContractWithRelations {
  mortgages: ContractMortgage[];
  escrow: ContractEscrow | null;
  personal_property: ContractPersonalProperty[];
  permitted_exceptions: ContractPermittedException[];
  violations: ContractViolation[];
  closing_conditions: ContractClosingCondition[];
  apportionment: ContractApportionment | null;
  tasks: Task[];
  timeline_items: TimelineItem[];
  source_document: DocumentWithExtractions | null;
}
