import { Modal, App, Setting } from "obsidian";
import BastionPlugin from "../main";
import { Bastion, BasilionFacility } from "../types";
import { CompendiumParser } from "../utils/compendium-parser";
import { FacilityEditorModal } from "./facility-editor-modal";
import { BastionEventModal } from "./bastion-event-modal";

export class BastionModal extends Modal {
  plugin: BastionPlugin;
  bastion: Bastion | null;
  onSave: (bastion: Bastion) => void;
  compendiumFacilities: BasilionFacility[] = [];

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

  async onOpen() {
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
      .then((setting) => {
        const btn_dec = setting.controlEl.createEl("button", { cls: "btn-small", text: "−" });
        const input = setting.controlEl.createEl("input", {
          cls: "btn-num-input",
          type: "number",
          value: String(this.bastion?.level || 5),
        }) as HTMLInputElement;
        input.min = "1";
        input.max = "20";
        const btn_inc = setting.controlEl.createEl("button", { cls: "btn-small", text: "+" });

        setting.controlEl.style.display = "flex";
        setting.controlEl.style.gap = "8px";
        setting.controlEl.style.alignItems = "center";

        const updateValue = (newVal: number) => {
          if (this.bastion) {
            this.bastion.level = Math.max(1, Math.min(20, newVal));
            input.value = String(this.bastion.level);
          }
        };

        btn_dec.onclick = () => {
          updateValue((this.bastion?.level || 5) - 1);
        };

        btn_inc.onclick = () => {
          updateValue((this.bastion?.level || 5) + 1);
        };

        input.onchange = () => {
          const val = parseInt(input.value, 10);
          if (!isNaN(val)) {
            updateValue(val);
          }
        };
      });

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
      .then((setting) => {
        const btn_dec = setting.controlEl.createEl("button", { cls: "btn-small", text: "−" });
        const input = setting.controlEl.createEl("input", {
          cls: "btn-num-input",
          type: "number",
          value: String(this.bastion?.defenders || 0),
        }) as HTMLInputElement;
        input.min = "0";
        const btn_inc = setting.controlEl.createEl("button", { cls: "btn-small", text: "+" });

        setting.controlEl.style.display = "flex";
        setting.controlEl.style.gap = "8px";
        setting.controlEl.style.alignItems = "center";

        const updateValue = (newVal: number) => {
          if (this.bastion) {
            this.bastion.defenders = Math.max(0, newVal);
            input.value = String(this.bastion.defenders);
          }
        };

        btn_dec.onclick = () => {
          updateValue((this.bastion?.defenders || 0) - 1);
        };

        btn_inc.onclick = () => {
          updateValue((this.bastion?.defenders || 0) + 1);
        };

        input.onchange = () => {
          const val = parseInt(input.value, 10);
          if (!isNaN(val)) {
            updateValue(val);
          }
        };
      });

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
        // Show selection interface
        const selectEl = facilitiesSection.createEl("div", { cls: "bastion-facility-select" });
        
        // Custom name input
        selectEl.createEl("label", { text: "Custom Facility Name (optional):" });
        const customInput = selectEl.createEl("input", {
          type: "text",
          placeholder: "Leave blank to choose from compendium",
        }) as HTMLInputElement;
        
        const createCustomBtn = selectEl.createEl("button", { text: "Create Custom", cls: "bastion-btn-small" });
        createCustomBtn.onclick = () => {
          if (customInput.value.trim()) {
            const newFacility: BasilionFacility = {
              id: `facility-${Date.now()}`,
              name: customInput.value.trim(),
              type: "basic",
              spaceType: "Roomy",
              size: 16,
              isUpgraded: false,
              description: "",
              availableOrders: [],
              notes: "Custom facility",
              hirelings: 1,
            };
            this.bastion?.facilities.push(newFacility);
            selectEl.remove();
            // Open editor for custom facility
            new FacilityEditorModal(this.app, this.plugin, newFacility, (updated) => {
              Object.assign(newFacility, updated);
            }).open();
            this.display();
          }
        };
        
        // Compendium selection
        if (this.compendiumFacilities.length > 0) {
          selectEl.createEl("hr");
          selectEl.createEl("label", { text: "Or select from compendium:" });
          
          // Filter facilities based on level requirement
          const restrict = this.plugin.dataManager.getSettings().restrictToLevelRequirements;
          const bastionLevel = this.bastion.level;
          const availableFacilities = restrict
            ? this.compendiumFacilities.filter((f) => !f.minLevel || f.minLevel <= bastionLevel)
            : this.compendiumFacilities;
          
          // Sort by level
          const sorted = availableFacilities.sort((a, b) => (a.minLevel || 0) - (b.minLevel || 0));
          
          const dropdown = selectEl.createEl("select");
          
          sorted.forEach((facility) => {
            const levelStr = facility.minLevel ? ` (Level ${facility.minLevel})` : " (Any Level)";
            dropdown.createEl("option", { text: facility.name + levelStr, value: facility.id });
          });
          
          const selectCompendiumBtn = selectEl.createEl("button", { text: "Add Selected", cls: "bastion-btn-small" });
          selectCompendiumBtn.onclick = () => {
            const selectedId = dropdown.value;
            const selected = this.compendiumFacilities.find((f) => f.id === selectedId);
            if (selected) {
              const newFacility = JSON.parse(JSON.stringify(selected));
              newFacility.id = `facility-${Date.now()}`;
              this.bastion?.facilities.push(newFacility);
              selectEl.remove();
              this.display();
            }
          };
        } else {
          selectEl.createEl("p", { text: "No compendium facilities loaded. Create a custom facility instead." });
        }
      }
    };

    this.bastion?.facilities.forEach((facility: BasilionFacility, index: number) => {
      const facilityEl = facilitiesSection.createEl("div", { cls: "bastion-facility-item" });
      
      const infoEl = facilityEl.createEl("div", { cls: "bastion-facility-info" });
      infoEl.createEl("strong", { text: facility.name });
      infoEl.createEl("span", { cls: "bastion-facility-meta", text: `${facility.type} • ${facility.spaceType}${facility.isUpgraded ? " (Upgraded)" : ""}` });
      
      const actionsEl = facilityEl.createEl("div", { cls: "bastion-facility-actions" });
      
      actionsEl.createEl("button", { cls: "bastion-btn-small", text: "Edit" }).onclick = () => {
        new FacilityEditorModal(this.app, this.plugin, facility, (updated) => {
          Object.assign(facility, updated);
          this.display();
        }).open();
      };

      // Show enlarge button for basic facilities
      if (facility.type === "basic" && facility.spaceType !== "Vast") {
        const enlargeText = facility.spaceType === "Cramped" ? "To Roomy" : "To Vast";
        actionsEl.createEl("button", { cls: "bastion-btn-small", text: `Enlarge: ${enlargeText}` }).onclick = () => {
          if (facility.spaceType === "Cramped") {
            facility.spaceType = "Roomy";
            facility.size = 16;
          } else if (facility.spaceType === "Roomy") {
            facility.spaceType = "Vast";
            facility.size = 36;
          }
          this.display();
        };
      }

      actionsEl.createEl("button", { cls: "bastion-btn-small", text: "Remove" }).onclick = () => {
        if (this.bastion) {
          this.bastion.facilities.splice(index, 1);
          this.display();
        }
      };
    });

    // Orders Section
    const ordersSection = contentEl.createEl("div", { cls: "bastion-modal-section" });
    ordersSection.createEl("h3", { text: "Issue Orders" });
    
    const ordersButtonsEl = ordersSection.createEl("div");
    ordersButtonsEl.style.display = "flex";
    ordersButtonsEl.style.flexWrap = "wrap";
    ordersButtonsEl.style.gap = "8px";
    
    const orders: Array<{ name: string; action: () => void }> = [
      {
        name: "Maintain",
        action: () => {
          new BastionEventModal(this.app, this.plugin, this.bastion!).open();
        },
      },
      {
        name: "Recruit",
        action: () => {
          alert("Recruit: Roll for new hireling availability");
        },
      },
      {
        name: "Trade",
        action: () => {
          alert("Trade: Gain resources from trade");
        },
      },
      {
        name: "Craft",
        action: () => {
          alert("Craft: Create items in your facilities");
        },
      },
      {
        name: "Research",
        action: () => {
          alert("Research: Gain arcane knowledge");
        },
      },
      {
        name: "Empower",
        action: () => {
          alert("Empower: Strengthen defenses or facilities");
        },
      },
      {
        name: "Harvest",
        action: () => {
          alert("Harvest: Gather resources from your facilities");
        },
      },
    ];
    
    orders.forEach((order) => {
      const btn = ordersButtonsEl.createEl("button", {
        cls: "bastion-btn-small",
        text: order.name,
      });
      btn.onclick = order.action;
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
