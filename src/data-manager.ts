import { App, Plugin } from "obsidian";
import { BastionSettings, DEFAULT_BASTIONS_SETTINGS } from "./types";

export interface BastionPluginSettings extends BastionSettings {
  bastions: Record<string, any>; // Stored as JSON
}

export const DEFAULT_PLUGIN_SETTINGS: BastionPluginSettings = {
  ...DEFAULT_BASTIONS_SETTINGS,
  bastions: {},
};

export class BastionDataManager {
  private plugin: Plugin;
  private settings: BastionPluginSettings;

  constructor(plugin: Plugin) {
    this.plugin = plugin;
    this.settings = DEFAULT_PLUGIN_SETTINGS;
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_PLUGIN_SETTINGS, await this.plugin.loadData());
  }

  async saveSettings() {
    await this.plugin.saveData(this.settings);
  }

  getSettings(): BastionPluginSettings {
    return this.settings;
  }

  updateSettings(updates: Partial<BastionPluginSettings>) {
    this.settings = Object.assign(this.settings, updates);
  }

  getBastions() {
    return this.settings.bastions;
  }

  getBastion(id: string) {
    return this.settings.bastions[id];
  }

  async saveBastion(bastion: any) {
    this.settings.bastions[bastion.id] = bastion;
    await this.saveSettings();
  }

  async deleteBastion(id: string) {
    delete this.settings.bastions[id];
    await this.saveSettings();
  }

  async clearAllBastions() {
    this.settings.bastions = {};
    await this.saveSettings();
  }
}
