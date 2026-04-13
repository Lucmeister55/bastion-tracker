import { App, PluginSettingTab, Setting } from "obsidian";
import BastionPlugin from "./main";
import { BastionPluginSettings } from "./data-manager";

export class BastionSettingsTab extends PluginSettingTab {
  plugin: BastionPlugin;

  constructor(app: App, plugin: BastionPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    containerEl.createEl("h2", { text: "Bastion Tracking Settings" });

    // Compendium Integration
    const compendiumDesc = containerEl.createEl("div");
    compendiumDesc.createEl("h3", { text: "Compendium Integration" });
    compendiumDesc.createEl("p", { text: "Configure where the plugin loads bastion room definitions from your vault." });

    new Setting(containerEl)
      .setName("Compendium Path")
      .setDesc("Path to your bastion room compendium folder (markdown files)")
      .addText((text) =>
        text
          .setPlaceholder("3-Mechanics/CLI/bastions")
          .setValue(this.plugin.dataManager.getSettings().compendiumPath)
          .onChange(async (value) => {
            this.plugin.dataManager.updateSettings({ compendiumPath: value });
            await this.plugin.dataManager.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Auto-load Room Options")
      .setDesc("Automatically load facility options from compendium when creating/editing bastions")
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.dataManager.getSettings().autoLoadRooms)
          .onChange(async (value) => {
            this.plugin.dataManager.updateSettings({ autoLoadRooms: value });
            await this.plugin.dataManager.saveSettings();
          })
      );

    // Tracking Options
    const trackingDesc = containerEl.createEl("div");
    trackingDesc.createEl("h3", { text: "Tracking Options" });

    new Setting(containerEl)
      .setName("Track Defenders")
      .setDesc("Enable bastion defender tracking and events")
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.dataManager.getSettings().trackDefenders)
          .onChange(async (value) => {
            this.plugin.dataManager.updateSettings({ trackDefenders: value });
            await this.plugin.dataManager.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Track Gold")
      .setDesc("Enable gold/resource tracking for bastion operations")
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.dataManager.getSettings().trackGold)
          .onChange(async (value) => {
            this.plugin.dataManager.updateSettings({ trackGold: value });
            await this.plugin.dataManager.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Track Bastion Turns")
      .setDesc("Enable automated bastion turn tracking and event resolution")
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.dataManager.getSettings().trackTurns)
          .onChange(async (value) => {
            this.plugin.dataManager.updateSettings({ trackTurns: value });
            await this.plugin.dataManager.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Turn Frequency (days)")
      .setDesc("How many in-game days between bastion turns")
      .addSlider((slider) =>
        slider
          .setLimits(1, 30, 1)
          .setValue(this.plugin.dataManager.getSettings().turnFrequencyDays)
          .onChange(async (value) => {
            this.plugin.dataManager.updateSettings({ turnFrequencyDays: value });
            await this.plugin.dataManager.saveSettings();
          })
      );

    // Data Management
    const dataDesc = containerEl.createEl("div");
    dataDesc.createEl("h3", { text: "Data Management" });

    new Setting(containerEl)
      .setName("Export All Bastions")
      .setDesc("Export bastion data as JSON")
      .addButton((button) =>
        button.setButtonText("Export").onClick(async () => {
          const data = JSON.stringify(this.plugin.dataManager.getSettings().bastions, null, 2);
          const blob = new Blob([data], { type: "application/json" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `bastions-${Date.now()}.json`;
          a.click();
          URL.revokeObjectURL(url);
        })
      );

    new Setting(containerEl)
      .setName("Clear All Bastions")
      .setDesc("⚠️ Delete all bastion data (cannot be undone)")
      .addButton((button) =>
        button.setButtonText("Clear").onClick(async () => {
          if (confirm("Are you sure? This will delete all bastion data!")) {
            await this.plugin.dataManager.clearAllBastions();
          }
        })
      );
  }
}
