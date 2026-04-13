// This file is kept for backwards compatibility
// All settings are now handled in settings-tab.ts and data-manager.ts

export interface MyPluginSettings {
	mySetting: string;
}

export const DEFAULT_SETTINGS: MyPluginSettings = {
	mySetting: 'default'
}

export class SampleSettingTab {
	// Deprecated - use BastionSettingsTab instead
}
