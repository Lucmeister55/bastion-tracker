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

    new Setting(containerEl)
      .setName("Restrict to Level Requirements")
      .setDesc("Only show facilities your bastion level can support")
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.dataManager.getSettings().restrictToLevelRequirements)
          .onChange(async (value) => {
            this.plugin.dataManager.updateSettings({ restrictToLevelRequirements: value });
            await this.plugin.dataManager.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Restrict Max Special Facilities")
      .setDesc("Limit number of special facilities based on bastion level (DMG rules)")
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.dataManager.getSettings().restrictMaxSpecialFacilities)
          .onChange(async (value) => {
            this.plugin.dataManager.updateSettings({ restrictMaxSpecialFacilities: value });
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
      .then((setting) => {
        const btn_dec = setting.controlEl.createEl("button", { cls: "btn-small", text: "−" });
        const input = setting.controlEl.createEl("input", {
          cls: "btn-num-input",
          type: "number",
          value: String(this.plugin.dataManager.getSettings().turnFrequencyDays),
        }) as HTMLInputElement;
        input.min = "1";
        input.max = "30";
        const btn_inc = setting.controlEl.createEl("button", { cls: "btn-small", text: "+" });

        setting.controlEl.style.display = "flex";
        setting.controlEl.style.gap = "8px";
        setting.controlEl.style.alignItems = "center";

        const updateValue = async (newVal: number) => {
          const clamped = Math.max(1, Math.min(30, newVal));
          this.plugin.dataManager.updateSettings({ turnFrequencyDays: clamped });
          await this.plugin.dataManager.saveSettings();
          input.value = String(clamped);
        };

        btn_dec.onclick = async () => {
          const current = this.plugin.dataManager.getSettings().turnFrequencyDays;
          await updateValue(current - 1);
        };

        btn_inc.onclick = async () => {
          const current = this.plugin.dataManager.getSettings().turnFrequencyDays;
          await updateValue(current + 1);
        };

        input.onchange = async () => {
          const val = parseInt(input.value, 10);
          if (!isNaN(val)) {
            await updateValue(val);
          }
        };
      });

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
