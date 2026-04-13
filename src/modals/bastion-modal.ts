import { Modal, App, MarkdownRenderer, Notice, Setting, setIcon } from "obsidian";
import BastionPlugin from "../main";
import { Bastion, BasilionFacility } from "../types";
import { CompendiumParser } from "../utils/compendium-parser";
import { FacilityEditorModal } from "./facility-editor-modal";

export class BastionModal extends Modal {
  plugin: BastionPlugin;
  bastion: Bastion | null;
  isCreationMode: boolean;
  creationStep = 1;
  starterCrampedName = "Bedroom";
  starterRoomyName = "Dining Room";
  onSave: (bastion: Bastion) => void;
  compendiumFacilities: BasilionFacility[] = [];

  constructor(app: App, plugin: BastionPlugin, bastionId?: string) {
    super(app);
    this.plugin = plugin;
    const existingBastion = bastionId ? plugin.dataManager.getBastion(bastionId) : null;
    this.isCreationMode = !existingBastion;
    this.bastion = existingBastion
      ? JSON.parse(JSON.stringify(existingBastion))
      : this.createNewBastion();
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

  async onOpen() {
    if (this.isCreationMode) {
      this.modalEl.removeClass("bastion-manage-modal");
    } else {
      this.modalEl.addClass("bastion-manage-modal");
    }

    // Load compendium facilities if auto-load is enabled
    if (this.plugin.dataManager.getSettings().autoLoadRooms) {
      const parser = new CompendiumParser(this.app);
      const compPath = this.plugin.dataManager.getSettings().compendiumPath;
      this.compendiumFacilities = await parser.parseFacilities(compPath);
    }

    // Call the display method
    this.display();
  }

  display() {
    if (this.isCreationMode) {
      this.displayCreationWizard();
      return;
    }

    this.displayManageView();
  }

  private displayManageView(): void {
    if (!this.bastion) return;

    const { contentEl } = this;
    contentEl.empty();

    const layout = contentEl.createEl("div", { cls: "bastion-manage-layout" });
    const left = layout.createEl("div", { cls: "bastion-manage-left" });
    const right = layout.createEl("div", { cls: "bastion-manage-right" });

    left.createEl("h3", { text: "Bastion stats" });
    this.addEditableField(left, "Bastion name", this.bastion.name, (value) => {
      this.bastion!.name = value;
    });
    this.addEditableField(left, "Character owner", this.bastion.characterName || "Unassigned", (value) => {
      this.bastion!.characterName = value;
    });
    this.addEditableField(left, "Defenders", String(this.bastion.defenders), (value) => {
      const parsed = parseInt(value, 10);
      this.bastion!.defenders = Number.isFinite(parsed) ? Math.max(0, parsed) : this.bastion!.defenders;
    }, true);

    const levelRow = left.createEl("div", { cls: "bastion-edit-row" });
    levelRow.createEl("span", { cls: "bastion-edit-label", text: "Level" });
    const levelVal = levelRow.createEl("div", { cls: "bastion-manage-level-controls" });
    levelVal.createEl("button", { cls: "btn-small", text: "−" }).onclick = () => {
      this.bastion!.level = Math.max(1, this.bastion!.level - 1);
      this.displayManageView();
    };
    levelVal.createEl("strong", { text: String(this.bastion.level) });
    levelVal.createEl("button", { cls: "btn-small", text: "+" }).onclick = () => {
      this.bastion!.level = Math.min(20, this.bastion!.level + 1);
      this.displayManageView();
    };
    const levelPen = levelRow.createEl("button", { cls: "bastion-icon-btn" });
    levelPen.setAttr("type", "button");
    levelPen.setAttr("aria-label", "Edit level");
    setIcon(levelPen, "pencil");
    levelPen.onclick = () => {
      const raw = window.prompt("Set level", String(this.bastion!.level));
      if (raw === null) return;
      const parsed = parseInt(raw, 10);
      if (!Number.isFinite(parsed)) return;
      this.bastion!.level = Math.max(1, Math.min(20, parsed));
      this.displayManageView();
    };

    this.addEditableField(left, "Gold (gp)", String(this.bastion.gold), (value) => {
      const parsed = parseInt(value, 10);
      this.bastion!.gold = Number.isFinite(parsed) ? Math.max(0, parsed) : this.bastion!.gold;
    }, true);

    this.renderSizeGuide(left);

    const basicFacilities = this.bastion.facilities.filter((f) => f.type === "basic");
    const specialFacilities = this.bastion.facilities.filter((f) => f.type === "special");

    const basicCol = right.createEl("div", { cls: "bastion-manage-col" });
    const specialCol = right.createEl("div", { cls: "bastion-manage-col" });

    this.renderFacilityColumn(
      basicCol,
      "Basic facilities",
      "basic",
      basicFacilities,
      10,
      `${basicFacilities.length}/10 used`
    );

    const unlockedSpecialSlots = this.getSpecialFacilitySlots(this.bastion.level);
    this.renderFacilityColumn(
      specialCol,
      "Special facilities",
      "special",
      specialFacilities,
      6,
      `${specialFacilities.length}/${unlockedSpecialSlots} unlocked slots`
    );

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

  private addEditableField(
    container: HTMLElement,
    label: string,
    value: string,
    onSave: (value: string) => void,
    numeric = false
  ): void {
    const row = container.createEl("div", { cls: "bastion-edit-row" });
    row.createEl("span", { cls: "bastion-edit-label", text: label });
    row.createEl("span", { cls: "bastion-edit-value", text: value });
    const btn = row.createEl("button", { cls: "bastion-icon-btn" });
    btn.setAttr("type", "button");
    btn.setAttr("aria-label", `Edit ${label}`);
    setIcon(btn, "pencil");
    btn.onclick = () => {
      const next = window.prompt(`Edit ${label}`, value);
      if (next === null) return;
      if (numeric && !/^-?\d+$/.test(next.trim())) return;
      onSave(next.trim());
      this.displayManageView();
    };
  }

  private renderFacilityColumn(
    column: HTMLElement,
    title: string,
    type: "basic" | "special",
    facilities: BasilionFacility[],
    absoluteMax: number,
    subtitle: string
  ): void {
    column.createEl("h3", { text: title });
    column.createEl("p", { text: subtitle });

    const addBox = column.createEl("div", { cls: "bastion-facility-select" });
    const modeSelect = addBox.createEl("select") as HTMLSelectElement;
    modeSelect.createEl("option", { text: "Use compendium", value: "compendium" });
    modeSelect.createEl("option", { text: "Custom facility", value: "custom" });

    const compendiumList = addBox.createEl("select") as HTMLSelectElement;
    const options = this.getCompendiumFacilityOptions().filter((opt) => opt.facilityType === type);
    options.forEach((opt) => {
      const label = opt.facilityType === "special" ? `${opt.name} (Special, Level ${opt.facility.minLevel || 0})` : `${opt.name} (Basic)`;
      compendiumList.createEl("option", { text: label, value: opt.id });
    });

    modeSelect.onchange = () => {
      compendiumList.style.display = modeSelect.value === "custom" ? "none" : "block";
    };

    const addBtn = addBox.createEl("button", { cls: "bastion-btn-small", text: "Add" });
    addBtn.title = type === "basic" ? "Build cost depends on size" : "Cost: Free (uses special slot)";

    addBtn.onclick = () => {
      if (!this.bastion) return;

      if (type === "basic" && facilities.length >= absoluteMax) {
        new Notice("Basic facilities are capped at 10.");
        return;
      }

      if (type === "special") {
        const unlocked = this.getSpecialFacilitySlots(this.bastion.level);
        if (facilities.length >= unlocked) {
          new Notice(`No unlocked special slots at level ${this.bastion.level}.`);
          return;
        }
      }

      if (modeSelect.value === "custom") {
        const draft: BasilionFacility = {
          id: `facility-${Date.now()}`,
          name: `Custom ${type === "basic" ? "Basic" : "Special"}`,
          type,
          spaceType: "Roomy",
          size: 16,
          isUpgraded: false,
          description: "",
          availableOrders: [],
          notes: "",
          hirelings: type === "special" ? 1 : 0,
        };
        new FacilityEditorModal(this.app, this.plugin, draft, (edited) => {
          if (edited.type === "basic") {
            const built = this.createBasicFacility(
              edited.name,
              edited.spaceType,
              edited.spaceType === "Cramped" ? 500 : edited.spaceType === "Roomy" ? 1000 : 3000,
              edited.spaceType === "Cramped" ? 20 : edited.spaceType === "Roomy" ? 45 : 125,
              edited.spaceType === "Cramped" ? 4 : edited.spaceType === "Roomy" ? 16 : 36
            );
            built.availableOrders = edited.availableOrders || [];
            built.description = edited.description;
            built.notes = edited.notes;
            built.hirelings = edited.hirelings;
            this.bastion!.facilities.push(built);
          } else {
            edited.id = `facility-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
            edited.cost = undefined;
            edited.timeToBuild = undefined;
            this.bastion!.facilities.push(edited);
          }
          this.displayManageView();
        }).open();
        return;
      }

      const selected = options.find((opt) => opt.id === compendiumList.value);
      if (!selected) {
        new Notice("No compendium facility selected.");
        return;
      }
      const copy = JSON.parse(JSON.stringify(selected.facility)) as BasilionFacility;
      copy.id = `facility-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
      copy.type = type;
      if (type === "special") {
        copy.cost = undefined;
        copy.timeToBuild = undefined;
      }
      this.bastion.facilities.push(copy);
      this.displayManageView();
    };

    if (type === "special") {
      const unlocked = this.bastion ? this.getSpecialFacilitySlots(this.bastion.level) : 0;
      const slotsWrap = column.createEl("div", { cls: "bastion-special-slot-grid" });

      for (let i = 0; i < absoluteMax; i++) {
        const assigned = facilities[i];
        const slot = slotsWrap.createEl("div", { cls: "bastion-special-slot-card" });
        const unlockLevel = this.getSpecialSlotUnlockLevel(i);

        if (i >= unlocked) {
          slot.addClass("is-locked");
          slot.createEl("strong", { text: `Slot ${i + 1}` });
          slot.createEl("span", { text: `Unlocks at level ${unlockLevel}` });
          continue;
        }

        if (!assigned) {
          slot.addClass("is-empty");
          slot.createEl("strong", { text: `Slot ${i + 1}` });
          slot.createEl("span", { text: "Empty" });
          continue;
        }

        slot.addClass("is-filled");
        slot.createEl("strong", { text: assigned.name });
        slot.createEl("span", { text: `${assigned.spaceType} • ${assigned.size} squares` });
        this.appendSizeIcon(slot, assigned);
        const actions = slot.createEl("div", { cls: "bastion-facility-actions" });
        const remove = actions.createEl("button", { cls: "bastion-btn-small", text: "Remove" });
        remove.onclick = () => {
          if (!this.bastion) return;
          this.bastion.facilities = this.bastion.facilities.filter((f) => f.id !== assigned.id);
          this.displayManageView();
        };
      }

      return;
    }

    facilities.forEach((facility) => {
      const card = column.createEl("div", {
        cls: facility.type === "basic" ? "bastion-facility-item bastion-facility-item-basic" : "bastion-facility-item",
      });
      card.createEl("strong", { text: facility.name });
      card.createEl("span", {
        cls: "bastion-facility-meta",
        text: `${facility.spaceType} • ${facility.size} squares`,
      });

      this.appendSizeIcon(card, facility);
      this.appendSizeStepper(card, facility);

      const actions = card.createEl("div", { cls: "bastion-facility-actions" });
      const remove = actions.createEl("button", { cls: "bastion-btn-small", text: "Remove" });
      remove.onclick = () => {
        if (!this.bastion) return;
        this.bastion.facilities = this.bastion.facilities.filter((f) => f.id !== facility.id);
        this.displayManageView();
      };
    });
  }

  private appendSizeStepper(container: HTMLElement, facility: BasilionFacility): void {
    const levels: Array<{ label: "Cramped" | "Roomy" | "Vast"; squares: number; cost?: number; days?: number }> = [
      { label: "Cramped", squares: 4, cost: 500, days: 25 },
      { label: "Roomy", squares: 16, cost: 2000, days: 80 },
      { label: "Vast", squares: 36 },
    ];

    const currentIndex = levels.findIndex((level) => level.label === facility.spaceType);
    const safeIndex = currentIndex >= 0 ? currentIndex : 1;

    const stepper = container.createEl("div", { cls: "bastion-size-stepper" });
    const minus = stepper.createEl("button", { cls: "bastion-btn-small", text: "−" });
    minus.setAttr("type", "button");
    const box = stepper.createEl("div", { cls: "bastion-size-box" });
    const plus = stepper.createEl("button", { cls: "bastion-btn-small", text: "+" });
    plus.setAttr("type", "button");

    levels.forEach((level, index) => {
      box.createEl("span", {
        cls: index === safeIndex ? "bastion-size-chip active" : "bastion-size-chip",
        text: level.label,
      });
    });

    minus.disabled = safeIndex <= 0;
    plus.disabled = safeIndex >= levels.length - 1;

    if (safeIndex > 0) {
      const previous = levels[safeIndex - 1];
      minus.onclick = () => {
        if (!previous) return;
        facility.spaceType = previous.label;
        facility.size = previous.squares;
        facility.cost = previous.cost;
        facility.timeToBuild = previous.days;
        this.displayManageView();
      };
    }

    if (safeIndex < levels.length - 1) {
      const next = levels[safeIndex + 1];
      if (!next) return;
      plus.title = next.cost !== undefined ? `Upgrade to ${next.label}: ${next.cost} GP, ${next.days} days` : `Upgrade to ${next.label}`;
      plus.onclick = () => {
        if (!next) return;
        facility.spaceType = next.label;
        facility.size = next.squares;
        facility.cost = next.cost;
        facility.timeToBuild = next.days;
        this.displayManageView();
      };
    }
  }

  private renderSizeGuide(container: HTMLElement): void {
    const guide = container.createEl("div", { cls: "bastion-size-guide" });
    guide.createEl("h4", { text: "Space reference" });

    const clusters = [
      { label: "Cramped", symbol: "◔", count: 4, cols: 2 },
      { label: "Roomy", symbol: "◕", count: 16, cols: 4 },
      { label: "Vast", symbol: "✺", count: 36, cols: 6 },
    ];

    clusters.forEach((cluster) => {
      const clusterCard = guide.createEl("div", { cls: "bastion-size-guide-card" });
      const header = clusterCard.createEl("div", { cls: "bastion-size-guide-header" });
      header.createEl("span", { cls: "bastion-size-icon", text: cluster.symbol });
      header.createEl("strong", { text: `${cluster.label} (${cluster.count} squares)` });

      const grid = clusterCard.createEl("div", { cls: "bastion-size-wire-grid" });
      grid.style.gridTemplateColumns = `repeat(${cluster.cols}, 1fr)`;
      for (let i = 0; i < cluster.count; i++) {
        grid.createEl("span", { cls: "bastion-size-square" });
      }
    });
  }

  private appendSizeIcon(container: HTMLElement, facility: BasilionFacility): void {
    const visuals: Record<string, { symbol: string; cols: number }> = {
      Cramped: { symbol: "◔", cols: 2 },
      Roomy: { symbol: "◕", cols: 4 },
      Vast: { symbol: "✺", cols: 6 },
    };

    const meta = visuals[facility.spaceType] || visuals.Roomy;
    const visualWrap = container.createEl("div", { cls: "bastion-size-icon-row" });
    const icon = visualWrap.createEl("span", { cls: "bastion-size-icon", text: meta?.symbol || "◕" });
    icon.setAttr("title", `${facility.spaceType} • ${facility.size} squares`);
  }

  private getSpecialFacilitySlots(level: number): number {
    if (level >= 17) return 6;
    if (level >= 13) return 5;
    if (level >= 9) return 4;
    if (level >= 5) return 2;
    return 0;
  }

  private getSpecialSlotUnlockLevel(slotIndex: number): number {
    if (slotIndex < 2) return 5;
    if (slotIndex < 4) return 9;
    if (slotIndex < 5) return 13;
    return 17;
  }

  private getNextSpecialUnlockLevel(level: number): number | null {
    const thresholds = [5, 9, 13, 17];
    for (const threshold of thresholds) {
      if (level < threshold) {
        return threshold;
      }
    }
    return null;
  }

  private getFacilityTypeFromCompendium(facility: BasilionFacility): "basic" | "special" {
    return facility.minLevel ? "special" : "basic";
  }

  private getCompendiumFacilityOptions(): Array<{
    id: string;
    name: string;
    facilityType: "basic" | "special";
    facility: BasilionFacility;
  }> {
    if (!this.bastion) return [];
    const restrict = this.plugin.dataManager.getSettings().restrictToLevelRequirements;
    const level = this.bastion.level;

    return this.compendiumFacilities
      .filter((facility) => (restrict ? !facility.minLevel || facility.minLevel <= level : true))
      .map((facility) => ({
        id: facility.id,
        name: facility.name,
        facilityType: this.getFacilityTypeFromCompendium(facility),
        facility,
      }))
      .sort((a, b) => (a.facility.minLevel || 0) - (b.facility.minLevel || 0));
  }

  private createBasicFacility(
    name: string,
    spaceType: "Cramped" | "Roomy" | "Vast",
    cost: number,
    days: number,
    size: number
  ): BasilionFacility {
    return {
      id: `facility-${Date.now()}-${Math.floor(Math.random() * 100000)}`,
      name,
      type: "basic",
      spaceType,
      size,
      cost,
      timeToBuild: days,
      isUpgraded: false,
      description: "",
      availableOrders: [],
      notes: `Build cost: ${cost} GP, build time: ${days} days`,
      hirelings: 0,
    };
  }

  private createCustomSpecialFacility(name: string): BasilionFacility {
    return {
      id: `facility-${Date.now()}-${Math.floor(Math.random() * 100000)}`,
      name,
      type: "special",
      spaceType: "Roomy",
      size: 16,
      isUpgraded: false,
      description: "",
      availableOrders: [],
      notes: "Custom special facility (no build cost)",
      hirelings: 1,
    };
  }

  private createStarterBasicFacility(
    name: string,
    spaceType: "Cramped" | "Roomy",
    size: number
  ): BasilionFacility {
    return {
      id: `facility-${Date.now()}-${Math.floor(Math.random() * 100000)}`,
      name,
      type: "basic",
      spaceType,
      size,
      isUpgraded: false,
      description: "",
      availableOrders: [],
      notes: "Starter facility (free at bastion creation)",
      hirelings: 0,
    };
  }

  private displayCreationWizard(): void {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.createEl("h2", { text: `Create Bastion (${this.creationStep}/4)` });

    if (!this.bastion) return;

    if (this.creationStep === 1) {
      const section = contentEl.createEl("div", { cls: "bastion-modal-section" });

      new Setting(section)
        .setName("Bastion Name")
        .addText((text) =>
          text.setValue(this.bastion?.name || "").onChange((value) => {
            if (this.bastion) this.bastion.name = value;
          })
        );

      new Setting(section)
        .setName("Character Name")
        .addText((text) =>
          text.setValue(this.bastion?.characterName || "").onChange((value) => {
            if (this.bastion) this.bastion.characterName = value;
          })
        );

      new Setting(section)
        .setName("Level")
        .addText((text) =>
          text.setValue(String(this.bastion?.level || 5)).onChange((value) => {
            const parsed = parseInt(value, 10);
            if (this.bastion && Number.isFinite(parsed)) {
              this.bastion.level = Math.max(1, Math.min(20, parsed));
            }
          })
        );

      new Setting(section)
        .setName("Description")
        .addTextArea((text) =>
          text.setValue(this.bastion?.description || "").onChange((value) => {
            if (this.bastion) this.bastion.description = value;
          })
        );
    }

    if (this.creationStep === 2) {
      const section = contentEl.createEl("div", { cls: "bastion-modal-section" });
      section.createEl("p", {
        text: "Choose exactly two starter basic facilities: one Cramped and one Roomy.",
      });
      section.createEl("p", { text: "Starter facilities are free at creation." });

      const sizeReference = section.createEl("div", { cls: "bastion-facility-select" });
      const markdownTable = [
        "| Space | Maximum Area |",
        "| --- | --- |",
        "| Cramped | 4 squares |",
        "| Roomy | 16 squares |",
        "| Vast | 36 squares |",
      ].join("\n");
      void MarkdownRenderer.renderMarkdown(markdownTable, sizeReference, "", this.plugin);

      const basicNames = ["Bedroom", "Dining Room", "Parlor", "Courtyard", "Kitchen", "Storage"];

      new Setting(section)
        .setName("Cramped facility (required)")
        .addDropdown((dropdown) => {
          basicNames.forEach((name) => dropdown.addOption(name, name));
          dropdown.setValue(this.starterCrampedName);
          dropdown.onChange((value) => {
            this.starterCrampedName = value;
          });
        });

      new Setting(section)
        .setName("Roomy facility (required)")
        .addDropdown((dropdown) => {
          basicNames.forEach((name) => dropdown.addOption(name, name));
          dropdown.setValue(this.starterRoomyName);
          dropdown.onChange((value) => {
            this.starterRoomyName = value;
          });
        });
    }

    if (this.creationStep === 3) {
      const section = contentEl.createEl("div", { cls: "bastion-modal-section" });

      new Setting(section)
        .setName("Bastion Defenders")
        .addText((text) =>
          text.setValue(String(this.bastion?.defenders || 0)).onChange((value) => {
            const parsed = parseInt(value, 10);
            if (this.bastion) this.bastion.defenders = Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
          })
        );

      new Setting(section)
        .setName("Gold (gp)")
        .addText((text) =>
          text.setValue(String(this.bastion?.gold || 0)).onChange((value) => {
            const parsed = parseInt(value, 10);
            if (this.bastion) this.bastion.gold = Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
          })
        );

    }

    if (this.creationStep === 4) {
      const section = contentEl.createEl("div", { cls: "bastion-modal-section" });

      const summary = section.createEl("div", { cls: "bastion-facility-select" });
      summary.createEl("p", { text: `Name: ${this.bastion.name || "(unnamed)"}` });
      summary.createEl("p", { text: `Character: ${this.bastion.characterName || "(none)"}` });
      summary.createEl("p", { text: `Level: ${this.bastion.level}` });
      summary.createEl("p", { text: `Defenders: ${this.bastion.defenders}` });
      summary.createEl("p", { text: `Gold: ${this.bastion.gold} gp` });
      summary.createEl("p", {
        text: `Starter basic facilities: ${this.starterCrampedName} (Cramped), ${this.starterRoomyName} (Roomy)`,
      });
    }

    const buttonSection = contentEl.createEl("div", { cls: "bastion-modal-buttons" });
    if (this.creationStep > 1) {
      buttonSection.createEl("button", { cls: "bastion-btn-secondary", text: "Back" }).onclick = () => {
        this.creationStep -= 1;
        this.displayCreationWizard();
      };
    }

    if (this.creationStep < 4) {
      buttonSection.createEl("button", { cls: "bastion-btn-primary", text: "Next" }).onclick = () => {
        if (this.creationStep === 1 && !this.bastion?.name.trim()) {
          new Notice("Please enter a Bastion name to continue.");
          return;
        }
        this.creationStep += 1;
        this.displayCreationWizard();
      };
    } else {
      buttonSection.createEl("button", { cls: "bastion-btn-primary", text: "Create Bastion" }).onclick = () => {
        if (!this.bastion) return;
        this.bastion.facilities = [
          this.createStarterBasicFacility(this.starterCrampedName, "Cramped", 4),
          this.createStarterBasicFacility(this.starterRoomyName, "Roomy", 16),
        ];
        this.bastion.lastUpdated = Date.now();
        this.onSave(this.bastion);
        this.close();
      };
    }

    buttonSection.createEl("button", { cls: "bastion-btn-secondary", text: "Cancel" }).onclick = () => {
      this.close();
    };
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}
