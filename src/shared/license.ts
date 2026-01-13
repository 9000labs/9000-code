/**
 * 9000 Code - License Management
 *
 * Dual License:
 * - Community Edition: AGPL v3 (Free for personal and open-source use)
 * - Pro/Enterprise Edition: Commercial License
 */

// Edition types
export type Edition = 'community' | 'pro' | 'enterprise';

// Current edition (can be changed based on license key validation)
let currentEdition: Edition = 'community';

/**
 * Edition-specific limits
 */
export const EDITION_LIMITS = {
  community: {
    maxSplitPanels: 4,
    maxQuickCommands: 5,
    maxRemoteConnections: 1,
    searchEnabled: true,
    teamCollaboration: false,
    gitIntegration: false,
    customThemes: false,
    ssoEnabled: false,
    auditLog: false,
  },
  pro: {
    maxSplitPanels: Infinity,
    maxQuickCommands: Infinity,
    maxRemoteConnections: 10,
    searchEnabled: true,
    teamCollaboration: true,
    gitIntegration: true,
    customThemes: true,
    ssoEnabled: false,
    auditLog: false,
  },
  enterprise: {
    maxSplitPanels: Infinity,
    maxQuickCommands: Infinity,
    maxRemoteConnections: Infinity,
    searchEnabled: true,
    teamCollaboration: true,
    gitIntegration: true,
    customThemes: true,
    ssoEnabled: true,
    auditLog: true,
  },
} as const;

/**
 * Get current edition
 */
export function getEdition(): Edition {
  return currentEdition;
}

/**
 * Set current edition (for license validation)
 */
export function setEdition(edition: Edition): void {
  currentEdition = edition;
}

/**
 * Get limits for current edition
 */
export function getCurrentLimits() {
  return EDITION_LIMITS[currentEdition];
}

/**
 * Check if a feature is available in current edition
 */
export function isFeatureAvailable(feature: keyof typeof EDITION_LIMITS.community): boolean {
  const limits = getCurrentLimits();
  const value = limits[feature];

  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'number') {
    return value > 0;
  }
  return true;
}

/**
 * Check if current usage is within limit
 */
export function isWithinLimit(
  feature: 'maxSplitPanels' | 'maxQuickCommands' | 'maxRemoteConnections',
  currentCount: number
): boolean {
  const limits = getCurrentLimits();
  return currentCount < limits[feature];
}

/**
 * Get upgrade message for a feature
 */
export function getUpgradeMessage(_feature: string): string {
  return `이 기능은 Pro/Enterprise Edition에서 사용 가능합니다. 업그레이드하려면 sales@yourcompany.com으로 문의하세요.`;
}

/**
 * License info for display
 */
export function getLicenseInfo() {
  return {
    edition: currentEdition,
    editionName: currentEdition === 'community' ? 'Community Edition'
      : currentEdition === 'pro' ? 'Pro Edition'
      : 'Enterprise Edition',
    limits: getCurrentLimits(),
    isCommercial: currentEdition !== 'community',
  };
}
