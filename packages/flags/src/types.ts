export interface UserContext {
  userId?: string;
  role?: string;
  city?: string;
  category?: string;
}

export interface TargetingRules {
  roles?: string[];
  cities?: string[];
  categories?: string[];
  allowList?: string[];
  denyList?: string[];
}

export interface Variant {
  name: string;
  weight: number;
}

export interface FeatureFlagData {
  key: string;
  description: string | null;
  enabled: boolean;
  rollout: number;
  rules: TargetingRules | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ExperimentData {
  key: string;
  description: string | null;
  variants: Variant[];
  status: "DRAFT" | "RUNNING" | "PAUSED" | "STOPPED";
  startAt: Date | null;
  stopAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AssignmentResult {
  variant: string;
  isNew: boolean;
}

export interface ExperimentMetrics {
  experimentKey: string;
  variant: string;
  exposures: number;
  conversions: number;
  conversionRate: number;
  clicks: number;
  clickRate: number;
}
