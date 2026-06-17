export type FrontendSettings = {
  movementSimulationSeconds: number;
};

export const FRONTEND_SETTINGS_STORAGE_KEY = 'smart-rfid-frontend-settings';

export const DEFAULT_FRONTEND_SETTINGS: FrontendSettings = {
  movementSimulationSeconds: 6,
};

function sanitizeFrontendSettings(settings: Partial<FrontendSettings>): FrontendSettings {
  const movementSimulationSeconds = Number(settings.movementSimulationSeconds);

  return {
    movementSimulationSeconds:
      Number.isFinite(movementSimulationSeconds)
        ? Math.min(30, Math.max(1, movementSimulationSeconds))
        : DEFAULT_FRONTEND_SETTINGS.movementSimulationSeconds,
  };
}

export function loadFrontendSettings(): FrontendSettings {
  if (typeof window === 'undefined') {
    return DEFAULT_FRONTEND_SETTINGS;
  }

  try {
    const stored = window.sessionStorage.getItem(FRONTEND_SETTINGS_STORAGE_KEY);

    if (!stored) {
      return DEFAULT_FRONTEND_SETTINGS;
    }

    return sanitizeFrontendSettings({
      ...DEFAULT_FRONTEND_SETTINGS,
      ...JSON.parse(stored),
    });
  } catch (error) {
    console.error('Failed to load frontend settings', error);
    return DEFAULT_FRONTEND_SETTINGS;
  }
}

export function storeFrontendSettings(settings: FrontendSettings) {
  window.sessionStorage.setItem(FRONTEND_SETTINGS_STORAGE_KEY, JSON.stringify(sanitizeFrontendSettings(settings)));
  window.dispatchEvent(new CustomEvent('smart-rfid-frontend-settings-change'));
}
