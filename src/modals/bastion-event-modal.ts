import { App, Modal, ButtonComponent } from "obsidian";
import { Plugin } from "obsidian";
import { Bastion } from "../types";
import {
  BASTION_EVENTS,
  rollD100,
  rollDice,
  getEventByRoll,
  getAllIsWellDetail,
} from "../utils/bastion-events";

export class BastionEventModal extends Modal {
  private plugin: Plugin;
  private bastion: Bastion;
  private rolled: boolean = false;
  private rollResult: number = 0;

  constructor(app: App, plugin: Plugin, bastion: Bastion) {
    super(app);
    this.plugin = plugin;
    this.bastion = bastion;
  }

  onOpen() {
    const { contentEl } = this;
    this.modalEl.addClass("bastion-event-modal");

    const header = contentEl.createEl("h2", {
      text: `Bastion Events - ${this.bastion.name}`,
    });

    const section = contentEl.createEl("div", {
      cls: "bastion-modal-section",
    });

    if (!this.rolled) {
      section.createEl("p", {
        text: "Roll for a Bastion Event. The event is determined immediately after issuing the Maintain order.",
        cls: "bastion-event-intro",
      });

      const rollBtn = new ButtonComponent(section);
      rollBtn
        .setButtonText("Roll 1d100")
        .onClick(async () => {
          await this.rollEvent();
        });
      rollBtn.buttonEl.addClass("mod-cta");
    } else {
      this.displayEventResult(section);
    }
  }

  private async rollEvent() {
    this.rollResult = await rollD100(this.app);
    this.rolled = true;

    // Clear and redraw
    const { contentEl } = this;
    contentEl.empty();
    this.onOpen();
  }

  private displayEventResult(container: HTMLElement) {
    // Display the roll result
    const rollDiv = container.createEl("div", {
      cls: "bastion-event-roll",
    });
    rollDiv.createEl("p", {
      text: `You rolled: ${this.rollResult}`,
      cls: "bastion-event-roll-result",
    });

    const event = getEventByRoll(this.rollResult);
    if (!event) {
      rollDiv.createEl("p", {
        text: "No event matched (error)",
        cls: "bastion-event-error",
      });
      return;
    }

    // Event details
    const eventDiv = container.createEl("div", {
      cls: "bastion-event-details",
    });
    eventDiv.createEl("h3", { text: event.name });

    // Event description from data
    eventDiv.createEl("p", {
      text: event.description,
      cls: "bastion-event-description",
    });

    // Type tag
    eventDiv.createEl("span", {
      text: event.type.toUpperCase(),
      cls: `bastion-event-type bastion-event-type-${event.type}`,
    });

    // Special handling for "All Is Well"
    if (event.id === "all-is-well") {
      const wellDiv = eventDiv.createEl("div", {
        cls: "bastion-event-all-is-well",
      });
      wellDiv.createEl("p", {
        text: "All Is Well: " + getAllIsWellDetail(),
        cls: "bastion-event-well-detail",
      });
    }

    // Resolution options based on event type
    this.addResolutionOptions(container, event);

    // Roll again button
    const actionDiv = container.createEl("div", {
      cls: "bastion-event-actions",
    });

    const closeBtn = new ButtonComponent(actionDiv);
    closeBtn.setButtonText("Done").onClick(() => {
      this.close();
    });

    const rollAgainBtn = new ButtonComponent(actionDiv);
    rollAgainBtn
      .setButtonText("Roll Again")
      .setWarning()
      .onClick(async () => {
        this.rolled = false;
        const contentEl = container.closest(".modal-content");
        if (contentEl) {
          contentEl.empty();
          this.onOpen();
        }
      });
  }

  private async addResolutionOptions(
    container: HTMLElement,
    event: (typeof BASTION_EVENTS)[0]
  ) {
    const resDiv = container.createEl("div", {
      cls: "bastion-event-resolution",
    });

    resDiv.createEl("h4", { text: "Resolution:" });
    resDiv.createEl("p", {
      text: event.resolution,
      cls: "bastion-event-resolution-text",
    });

    // Add optional dice roll buttons for specific events
    switch (event.id) {
      case "attack":
        this.addDiceRollButton(resDiv, "6d6");
        break;
      case "criminal-hireling":
        this.addDiceRollButton(resDiv, "1d6");
        break;
      case "lost-hirelings":
        this.addDiceRollButton(resDiv, "1d4");
        break;
      case "refugees":
        this.addDiceRollButton(resDiv, "2d6");
        break;
      case "treasure":
        this.addDiceRollButton(resDiv, "2d10");
        break;
    }
  }

  private async addDiceRollButton(
    container: HTMLElement,
    diceFormula: string
  ) {
    const diceDiv = container.createEl("div");
    diceDiv.style.marginTop = "10px";

    const rollDiceBtn = new ButtonComponent(diceDiv);
    rollDiceBtn
      .setButtonText(`Roll ${diceFormula}`)
      .onClick(async () => {
        const parts = diceFormula.split("d");
        const numDice = Math.max(1, parseInt(parts[0] || "1"));
        const sides = Math.max(1, parseInt(parts[1] || "20"));
        const result = await rollDice(this.app, numDice, sides);
        const resultSpan = diceDiv.createEl("span", {
          text: ` → ${result}`,
        });
        resultSpan.style.marginLeft = "10px";
        resultSpan.style.fontWeight = "bold";
        resultSpan.style.color = "var(--interactive-accent)";
      });
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}
