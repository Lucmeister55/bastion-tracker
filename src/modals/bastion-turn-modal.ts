import { Modal, App, Setting, Notice } from "obsidian";
import BastionPlugin from "../main";
import { BastionTurn, Bastion, Order } from "../types";
import { getEventByRoll, resolveEventOutcome, rollD100 } from "../utils/bastion-events";

interface PlannedTurn {
  turnNumber: number;
  orderType: Order | "Maintain";
  summary?: string;
}

export class BastionTurnModal extends Modal {
  plugin: BastionPlugin;
  bastion: Bastion;
  turnCount = 1;
  plannedTurns: PlannedTurn[] = [];
  sequenceSummary = "";

  constructor(app: App, plugin: BastionPlugin, bastionId: string) {
    super(app);
    this.plugin = plugin;
    this.bastion = plugin.dataManager.getBastion(bastionId);
  }

  private getExistingTurns(): BastionTurn[] {
    return this.bastion.turns || [];
  }

  onOpen(): void {
    this.render();
  }

  private render(): void {
    const { contentEl } = this;
    contentEl.empty();
    const existingTurns = this.getExistingTurns();
    const nextTurn = existingTurns.length + 1;

    contentEl.createEl("h2", { text: `${this.bastion.name} - Bastion turns` });

    const setupSection = contentEl.createEl("div", { cls: "bastion-modal-section" });
    setupSection.createEl("h3", { text: "1) Turn count" });
    setupSection.createEl("p", {
      text: "Choose how many Bastion turns to process. Events are resolved in chronological order.",
    });

    new Setting(setupSection)
      .setName("Number of turns")
      .setDesc("Default is 1")
      .then((setting) => {
        const input = setting.controlEl.createEl("input", {
          cls: "btn-num-input",
          type: "number",
          value: String(this.turnCount),
        }) as HTMLInputElement;
        input.min = "1";
        input.max = "30";
        input.onchange = () => {
          const parsed = parseInt(input.value, 10);
          this.turnCount = Number.isFinite(parsed) ? Math.max(1, Math.min(30, parsed)) : 1;
          input.value = String(this.turnCount);
        };

        const createBtn = setting.controlEl.createEl("button", {
          cls: "bastion-btn-small",
          text: "Create turn sequence",
        });
        createBtn.onclick = () => {
          this.plannedTurns = Array.from({ length: this.turnCount }, (_, i) => ({
            turnNumber: nextTurn + i,
            orderType: "Maintain",
          }));
          this.sequenceSummary = "";
          this.render();
        };
      });

    if (this.plannedTurns.length > 0) {
      const planningSection = contentEl.createEl("div", { cls: "bastion-modal-section" });
      planningSection.createEl("h3", { text: "2) Choose order for each turn" });

      this.plannedTurns.forEach((planned, index) => {
        const row = planningSection.createEl("div", { cls: "bastion-order-item" });
        row.createEl("strong", { text: `Turn ${planned.turnNumber}` });

        const select = row.createEl("select");
        const options: Array<Order | "Maintain"> = [
          "Maintain",
          "Craft",
          "Empower",
          "Harvest",
          "Recruit",
          "Research",
          "Trade",
        ];
        options.forEach((opt) => {
          const option = select.createEl("option", { text: opt, value: opt });
          option.selected = opt === planned.orderType;
        });
        select.onchange = () => {
          planned.orderType = select.value as Order | "Maintain";
          planned.summary = undefined;
          this.sequenceSummary = "";
        };

        if (planned.summary) {
          row.createEl("span", { cls: "resolved", text: "Resolved" });
        } else {
          row.createEl("span", { cls: "pending", text: "Pending" });
        }

        const note = planningSection.createEl("p", {
          text:
            planned.orderType === "Maintain"
              ? "Maintain triggers a 1d100 event roll, then any required event dice are rolled automatically."
              : "Non-maintain orders do not trigger a Bastion event roll by default.",
        });
        note.style.margin = "4px 0 10px 0";

        if (index < this.plannedTurns.length - 1) {
          planningSection.createEl("hr");
        }
      });

      const resolveBtn = planningSection.createEl("button", {
        cls: "bastion-btn-primary",
        text: "3) Resolve turns in chronological order",
      });
      resolveBtn.onclick = async () => {
        await this.resolveTurnSequence();
      };

      if (this.sequenceSummary) {
        const summarySection = contentEl.createEl("div", { cls: "bastion-modal-section" });
        summarySection.createEl("h3", { text: "Turn sequence summary" });
        summarySection.createEl("pre", { text: this.sequenceSummary });
      }
    }

    const buttonSection = contentEl.createEl("div", { cls: "bastion-modal-buttons" });
    buttonSection.createEl("button", { cls: "bastion-btn-secondary", text: "Close" }).onclick = () => {
      this.close();
    };
  }

  private async resolveTurnSequence(): Promise<void> {
    if (this.plannedTurns.length === 0) {
      new Notice("Create a turn sequence first.");
      return;
    }

    const newTurns: BastionTurn[] = [];
    const lines: string[] = [];

    for (const planned of this.plannedTurns) {
      const turn: BastionTurn = {
        id: `turn-${Date.now()}-${planned.turnNumber}`,
        bastionId: this.bastion.id,
        turnNumber: planned.turnNumber,
        date: Date.now(),
        orders: [],
        events: [],
        resolutionNotes: "",
      };

      if (planned.orderType === "Maintain") {
        const eventRoll = await rollD100(this.app);
        const event = getEventByRoll(eventRoll);
        const outcome = event
          ? await resolveEventOutcome(this.app, event.id)
          : "No event resolved due to missing event mapping.";

        if (event) {
          turn.events.push({
            id: `event-${Date.now()}-${planned.turnNumber}`,
            type: event.name,
            description: event.description,
            resolution: outcome,
          });
        }

        planned.summary = event
          ? `Turn ${planned.turnNumber}: Maintain -> ${event.name} (roll ${eventRoll}). ${outcome}`
          : `Turn ${planned.turnNumber}: Maintain -> Event roll ${eventRoll} had no matching event.`;
      } else {
        planned.summary = `Turn ${planned.turnNumber}: ${planned.orderType} order executed. No Bastion event roll.`;
      }

      turn.resolutionNotes = planned.summary;
      lines.push(planned.summary);
      newTurns.push(turn);
    }

    this.bastion.turns = [...this.getExistingTurns(), ...newTurns];
    await this.plugin.dataManager.saveBastion(this.bastion);
    this.plugin.refreshBastionView();

    this.sequenceSummary = lines.join("\n");
    new Notice(`Resolved ${newTurns.length} Bastion turn(s).`);
    this.render();
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}
