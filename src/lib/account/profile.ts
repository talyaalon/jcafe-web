// פרופיל לקוח פר-סניף — נשמר ב-Supabase user_metadata.profiles[<companyId>].
// טלפון + כתובות שמורות (עם ברירת מחדל). מאפשר מילוי-אוטומטי בתשלום ואזור אישי נפרד לכל סניף.

export interface SavedAddress {
  id: string;
  label?: string;
  addr1: string;
  addr2?: string;
  city?: string;
  postcode?: string;
  isDefault?: boolean;
}

export interface BranchProfile {
  phone?: string;
  addresses?: SavedAddress[];
}

type Meta = Record<string, unknown> | undefined | null;

// הפרופיל של סניף מסוים (ריק אם אין).
export function getBranchProfile(meta: Meta, company: number | null): BranchProfile {
  const profiles = ((meta as { profiles?: Record<string, BranchProfile> } | null | undefined)
    ?.profiles ?? {}) as Record<string, BranchProfile>;
  const p = company != null ? profiles[String(company)] : undefined;
  return p ?? {};
}

// הכתובת המוגדרת כברירת מחדל (או הראשונה אם אין סימון).
export function defaultAddress(p: BranchProfile): SavedAddress | undefined {
  return p.addresses?.find((a) => a.isDefault) ?? p.addresses?.[0];
}

// בונה user_metadata מעודכן עם הפרופיל החדש לסניף — שומר את שאר ה-metadata.
export function withBranchProfile(
  meta: Meta,
  company: number,
  profile: BranchProfile,
): Record<string, unknown> {
  const base = (meta ?? {}) as Record<string, unknown>;
  const profiles = (base.profiles ?? {}) as Record<string, BranchProfile>;
  return { ...base, profiles: { ...profiles, [String(company)]: profile } };
}
