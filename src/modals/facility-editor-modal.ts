import { Modal, App, Setting } from "obsidian";
import BastionPlugin from "../main";
import { BasilionFacility, Order } from "../types";

export class FacilityEditorModal extends Modal {
  plugin: BastionPlugin;
  facility: BasilionFacility;
  onSave: (facility: BasilionFacility) => void;

  constructor(
    app: App,
    plugin: BastionPlugin,
    facility: BasilionFacility,
    onSave: (facility: BasilionFacility) => void
  ) {
    super(app);
    this.plugin = plugin;
    this.facility = facility;
    this.onSave = onSave;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.createEl("h2", { text: `Edit: ${this.facility.name}` });

    // Basic Info
    const basicSection = contentEl.createEl("div", { cls: "bastion-modal-section" });
    basicSection.createEl("h3", { text: "Basic Information" });

    new Setting(basicSection)
      .setName("Facility Name")
      .addText((text) =>
        text
          .setValue(this.facility.name || "")
          .onChange((value) => {
            this.facility.name = value;
          })
      );

    new Setting(basicSection)
      .setName("Type")
      .addDropdown((dropdown) =>
        dropdown
          .addOption("basic", "Basic")
          .addOption("special", "Special")
          .setValue(this.facility.type)
          .onChange((value) => {
            this.facility.type = value as "basic" | "special";
          })
      );

    // Space Configuration
    const spaceSection = contentEl.createEl("div", { cls: "bastion-modal-section" });
    spaceSection.createEl("h3", { text: "Space" });

    new Setting(spaceSection)
      .setName("Space Type")
      .addDropdown((dropdown) =>
        dropdown
          .addOption("Cramped", "Cramped (4 sq)")
          .addOption("Roomy", "Roomy (16 sq)")
          .addOption("Vast", "Vast (36 sq)")
          .setValue(this.facility.spaceType)
          .onChange((value) => {
            this.facility.spaceType = value as "Cramped" | "Roomy" | "Vast";
            // Auto-update size
            const sizes: Record<string, number> = { Cramped: 4, Roomy: 16, Vast: 36 };
            this.facility.size = sizes[value] || 16;
          })
      );

    new Setting(spaceSection)
      .setName("Is Upgraded")
      .addToggle((toggle) =>
        toggle
          .setValue(this.facility.isUpgraded)
          .onChange((value) => {
            this.facility.isUpgraded = value;
          })
      );

    new Setting(spaceSection)
      .setName("Size (squares)")
      .addText((text) =>
        text
          .setValue(String(this.facility.size || 16))
          .onChange((value) => {
            const parsed = parseInt(value, 10);
            if (!isNaN(parsed)) {
              this.facility.size = Math.max(1, parsed);
            }
          })
      );

    // Hirelings & Orders
    const detailsSection = contentEl.createEl("div", { cls: "bastion-modal-section" });
    detailsSection.createEl("h3", { text: "Details" });

    new Setting(detailsSection)
      .setName("Hirelings")
      .addText((text) =>
        text
          .setValue(String(this.facility.hirelings || 1))
          .onChange((value) => {
            const num = parseInt(value, 10);
            if (!isNaN(num)) {
              this.facility.hirelings = Math.max(0, num);
            }
          })
      );

    new Setting(detailsSection)
      .setName("Available Orders")
      .setDesc("Comma-separated, e.g. Craft, Research")
      .addText((text) =>
        text
          .setValue((this.facility.availableOrders || []).join(", "))
          .onChange((value) => {
            this.facility.availableOrders = value
              .split(",")
              .map((s) => s.trim())
              .filter((s) => s.length > 0) as Order[];
          })
      );

    // Description & Notes
    const contentSection = contentEl.createEl("div", { cls: "bastion-modal-section" });
    contentSection.createEl("h3", { text: "Content" });

    new Setting(contentSection)
      .setName("Description")
      .addTextArea((text) =>
        text
          .setValue(this.facility.description || "")
          .onChange((value) => {
            this.facility.description = value;
          })
      );

    new Setting(contentSection)
      .setName("Notes")
      .addTextArea((text) =>
        text
          .setValue(this.facility.notes || "")
          .onChange((value) => {
            this.facility.notes = value;
          })
      );

    // Buttons
    const buttonSection = contentEl.createEl("div", { cls: "bastion-modal-buttons" });
    buttonSection.createEl("button", { cls: "bastion-btn-primary", text: "Save" }).onclick = () => {
      this.onSave(this.facility);
      this.close();
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
