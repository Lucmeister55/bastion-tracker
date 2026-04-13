import { Modal, App, Setting } from "obsidian";
import BastionPlugin from "../main";
import { Bastion, BasilionFacility } from "../types";

export class BastionModal extends Modal {
  plugin: BastionPlugin;
  bastion: Bastion | null;
  onSave: (bastion: Bastion) => void;

  constructor(app: App, plugin: BastionPlugin, bastionId?: string) {
    super(app);
    this.plugin = plugin;
    this.bastion = bastionId ? JSON.parse(JSON.stringify(plugin.dataManager.getBastion(bastionId))) : this.createNewBastion();
    this.onSave = (bastion) => {
      plugin.dataManager.saveBastion(bastion);
      plugin.refreshBastionView();
    };
  }

  createNewBastion(): Bastion {
    return {
      id: `bastion-${Date.now()}`,
      name: "New Bastion",
      characterName: "",
      level: 5,
      description: "",
      facilities: [],
      hirelings: [],
      defenders: 0,
      gold: 0,
      createdAt: Date.now(),
      lastUpdated: Date.now(),
    };
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.createEl("h2", { text: this.bastion?.id.includes("bastion-") && !this.plugin.dataManager.getBastion(this.bastion.id) ? "New Bastion" : "Edit Bastion" });

    // Basic Info
    const basicSection = contentEl.createEl("div", { cls: "bastion-modal-section" });
    basicSection.createEl("h3", { text: "Basic Information" });

    new Setting(basicSection)
      .setName("Bastion Name")
      .addText((text) =>
        text
          .setValue(this.bastion?.name || "")
          .onChange((value) => {
            if (this.bastion) this.bastion.name = value;
          })
      );

    new Setting(basicSection)
      .setName("Character Name")
      .addText((text) =>
        text
          .setValue(this.bastion?.characterName || "")
          .onChange((value) => {
            if (this.bastion) this.bastion.characterName = value;
          })
      );

    new Setting(basicSection)
      .setName("Level")
      .addSlider((slider) =>
        slider
          .setLimits(1, 20, 1)
          .setValue(this.bastion?.level || 5)
          .onChange((value) => {
            if (this.bastion) this.bastion.level = value;
          })
      );

    new Setting(basicSection)
      .setName("Description")
      .addTextArea((text) =>
        text
          .setValue(this.bastion?.description || "")
          .onChange((value) => {
            if (this.bastion) this.bastion.description = value;
          })
      );

    // Resources Section
    const resourcesSection = contentEl.createEl("div", { cls: "bastion-modal-section" });
    resourcesSection.createEl("h3", { text: "Resources" });

    new Setting(resourcesSection)
      .setName("Bastion Defenders")
      .addText((text) =>
        text
          .setValue((this.bastion?.defenders || 0).toString())
          .onChange((value) => {
            if (this.bastion) this.bastion.defenders = parseInt(value) || 0;
          })
      );

    new Setting(resourcesSection)
      .setName("Gold (gp)")
      .addText((text) =>
        text
          .setValue((this.bastion?.gold || 0).toString())
          .onChange((value) => {
            if (this.bastion) this.bastion.gold = parseInt(value) || 0;
          })
      );

    // Facilities Section
    const facilitiesSection = contentEl.createEl("div", { cls: "bastion-modal-section" });
    facilitiesSection.createEl("h3", { text: "Facilities" });
    facilitiesSection.createEl("p", { text: `Total: ${this.bastion?.facilities.length || 0}` });

    const addFacilityBtn = facilitiesSection.createEl("button", { cls: "bastion-btn", text: "Add Facility" });
    addFacilityBtn.onclick = () => {
      if (this.bastion) {
        const newFacility: BasilionFacility = {
          id: `facility-${Date.now()}`,
          name: "New Facility",
          type: "basic",
          spaceType: "Roomy",
          size: 16,
          isUpgraded: false,
          description: "",
          availableOrders: [],
          notes: "",
        };
        this.bastion.facilities.push(newFacility);
        this.onOpen(); // Refresh modal
      }
    };

    this.bastion?.facilities.forEach((facility: BasilionFacility, index: number) => {
      const facilityEl = facilitiesSection.createEl("div", { cls: "bastion-facility-item" });
      facilityEl.createEl("strong", { text: facility.name });
      facilityEl.createEl("button", { cls: "bastion-btn-small", text: "Edit" }).onclick = () => {
        // Open facility editor
      };
      facilityEl.createEl("button", { cls: "bastion-btn-small", text: "Remove" }).onclick = () => {
        if (this.bastion) {
          this.bastion.facilities.splice(index, 1);
          this.onOpen(); // Refresh modal
        }
      };
    });

    // Buttons
    const buttonSection = contentEl.createEl("div", { cls: "bastion-modal-buttons" });
    buttonSection.createEl("button", { cls: "bastion-btn-primary", text: "Save" }).onclick = () => {
      if (this.bastion) {
        this.bastion.lastUpdated = Date.now();
        this.onSave(this.bastion);
        this.close();
      }
    };

    buttonSection.createEl("button", { cls: "bastion-btn-secondary", text: "Cancel" }).onclick = () => {
      this.close();
    };
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}
