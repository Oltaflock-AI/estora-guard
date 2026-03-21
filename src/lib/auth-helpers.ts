import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/database.types';
import type { Profile, Organization, Membership } from '@/lib/types';

type TypedClient = SupabaseClient<Database>;
type MembershipRole = Membership['role'];

export interface UserProfile {
  id: string;
  fullName: string | null;
  email: string | null;
  avatarUrl: string | null;
  personId: string | null;
}

export interface UserOrg {
  orgId: string;
  orgName: string;
  orgSlug: string;
  role: MembershipRole;
}

export async function getCurrentUser(
  supabase: TypedClient
): Promise<UserProfile | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  const profile = data as Profile | null;
  if (!profile) return null;

  return {
    id: profile.id,
    fullName: profile.full_name,
    email: profile.email,
    avatarUrl: profile.avatar_url,
    personId: profile.person_id,
  };
}

export async function getUserOrgs(
  supabase: TypedClient
): Promise<UserOrg[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: rawMemberships } = await supabase
    .from('memberships')
    .select('*')
    .eq('user_id', user.id);

  const memberships = (rawMemberships ?? []) as Membership[];
  if (memberships.length === 0) return [];

  const orgIds = memberships.map((m) => m.org_id);
  const { data: rawOrgs } = await supabase
    .from('organizations')
    .select('*')
    .in('id', orgIds);

  const orgs = (rawOrgs ?? []) as Organization[];
  const orgMap = new Map(orgs.map((o) => [o.id, o]));

  return memberships
    .filter((m) => orgMap.has(m.org_id))
    .map((m) => {
      const org = orgMap.get(m.org_id)!;
      return {
        orgId: org.id,
        orgName: org.name,
        orgSlug: org.slug,
        role: m.role,
      };
    });
}

export async function getUserRole(
  supabase: TypedClient,
  orgId: string
): Promise<MembershipRole | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from('memberships')
    .select('*')
    .eq('user_id', user.id)
    .eq('org_id', orgId)
    .single();

  const membership = data as Membership | null;
  return membership?.role ?? null;
}

export class AuthorizationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthorizationError';
  }
}

export async function requireRole(
  supabase: TypedClient,
  orgId: string,
  requiredRole: MembershipRole | MembershipRole[]
): Promise<MembershipRole> {
  const role = await getUserRole(supabase, orgId);

  if (!role) {
    throw new AuthorizationError('Not a member of this organization.');
  }

  const allowed = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
  if (!allowed.includes(role)) {
    throw new AuthorizationError(
      `Role "${role}" is not authorized. Required: ${allowed.join(', ')}.`
    );
  }

  return role;
}

export async function requireAuth(
  supabase: TypedClient
): Promise<{ userId: string; email: string }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new AuthorizationError('Authentication required.');
  }

  return { userId: user.id, email: user.email ?? '' };
}
