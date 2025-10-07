import { GlobalState } from 'extension/providers/state/global-state-manager';

export interface AdvancedFeature {
  id: keyof GlobalState;
  label: string;
  description: string;
  disabled?: boolean;
  comingSoon?: boolean;
  dangerous?: string;
}

// 保持向后兼容性的别名
export type ExperimentalFeature = AdvancedFeature;
