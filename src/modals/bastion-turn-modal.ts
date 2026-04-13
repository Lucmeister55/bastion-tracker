import { Modal, App, Setting } from "obsidian";
import BastionPlugin from "../main";
import { BastionTurn, Bastion, IssuedOrder } from "../types";

export class BastionTurnModal extends Modal {
  plugin: BastionPlugin;
  bastion: Bastion;
  turn: BastionTurn;
  onSave: (turn: BastionTurn) => void;

  constructor(app: App, plugin: BastionPlugin, bastionId: string) {
    super(app);
    this.plugin = plugin;
    this.bastion = plugin.dataManager.getBastion(bastionId);

    // Load or create turn
    const turns = this.plugin.dataManager.getSettings().bastions[bastionId]?.turns || [];
    this.turn = turns[turns.length - 1] || this.createNewTurn(bastionId);

    this.onSave = (turn) => {
      const bastion = this.plugin.dataManager.getBastion(bastionId);
      if (!bastion.turns) bastion.turns = [];
      bastion.turns.push(turn);
      this.plugin.dataManager.saveBastion(bastion);
      this.plugin.refreshBastionView();
    };
  }

  createNewTurn(bastionId: string): BastionTurn {
    const turns = this.plugin.dataManager.getSettings().bastions[bastionId]?.turns || [];
    return {
      id: `turn-${Date.now()}`,
      bastionId,
      turnNumber: turns.length + 1,
      date: Date.now(),
      orders: [],
      events: [],
      resolutionNotes: "",
    };
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.createEl("h2", { text: `${this.bastion.name} - Bastion Turn ${this.turn.turnNumber}` });

    // Turn Info
    const infoSection = contentEl.createEl("div", { cls: "bastion-modal-section" });
    new Setting(infoSection)
      .setName("Turn Number")
      .addText((text) => text.setValue(this.turn.turnNumber.toString()).setDisabled(true));

    // Orders
    const ordersSection = contentEl.createEl("div", { cls: "bastion-modal-section" });
    ordersSection.createEl("h3", { text: "Orders Issued" });

    this.turn.orders.forEach((order: IssuedOrder, index: number) => {
      const orderEl = ordersSection.createEl("div", { cls: "bastion-order-item" });
      orderEl.createEl("strong", { text: `${order.orderType}: ${order.details}` });
      orderEl.createEl("span", { cls: order.resolved ? "resolved" : "pending", text: order.resolved ? "Resolved" : "Pending" });

      if (!order.resolved) {
        orderEl.createEl("button", { cls: "bastion-btn-small", text: "Resolve" }).onclick = () => {
          order.resolved = true;
          this.onOpen();
        };
      } else if (order.result) {
        orderEl.createEl("p", { text: `Result: ${order.result}` });
      }
    });

    const addOrderBtn = ordersSection.createEl("button", { cls: "bastion-btn", text: "Add Order" });
    addOrderBtn.onclick = () => {
      const newOrder: IssuedOrder = {
        id: `order-${Date.now()}`,
        facilityId: this.bastion.facilities[0]?.id || "",
        orderType: "Maintain",
        details: "",
        resolved: false,
        result: "",
      };
      this.turn.orders.push(newOrder);
      this.onOpen();
    };

    // Events
    const eventsSection = contentEl.createEl("div", { cls: "bastion-modal-section" });
    eventsSection.createEl("h3", { text: "Events" });
    eventsSection.createEl("p", { text: `Total Events: ${this.turn.events.length}` });

    const addEventBtn = eventsSection.createEl("button", { cls: "bastion-btn", text: "Resolve Bastion Event" });
    addEventBtn.onclick = () => {
      // Random event from table
      const eventTypes = [
        "Peaceful",
        "Request for Aid",
        "Social Event",
        "Unwanted Visitors",
        "Discovery",
        "Minor Calamity",
        "Political Upheaval",
      ];
      const eventType = eventTypes[Math.floor(Math.random() * eventTypes.length)] || "Peaceful";
      const event = {
        id: `event-${Date.now()}`,
        type: eventType,
        description: "Event occurred. Resolve details below.",
        resolution: "",
        defendersLost: 0,
        rewardGold: 0,
      };
      this.turn.events.push(event);
      this.onOpen();
    };

    // Notes
    const notesSection = contentEl.createEl("div", { cls: "bastion-modal-section" });
    notesSection.createEl("h3", { text: "Resolution Notes" });
    new Setting(notesSection)
      .setName("Notes")
      .addTextArea((text) =>
        text
          .setValue(this.turn.resolutionNotes)
          .onChange((value) => {
            this.turn.resolutionNotes = value;
          })
      );

    // Buttons
    const buttonSection = contentEl.createEl("div", { cls: "bastion-modal-buttons" });
    buttonSection.createEl("button", { cls: "bastion-btn-primary", text: "Complete Turn" }).onclick = () => {
      this.onSave(this.turn);
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
