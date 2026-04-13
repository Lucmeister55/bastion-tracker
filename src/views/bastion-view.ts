import { ItemView, WorkspaceLeaf, setIcon } from "obsidian";
import BastionPlugin from "../main";
import { Bastion } from "../types";

export const BASTION_VIEW_TYPE = "bastion-view";

export class BastionView extends ItemView {
  plugin: BastionPlugin;

  constructor(leaf: WorkspaceLeaf, plugin: BastionPlugin) {
    super(leaf);
    this.plugin = plugin;
  }

  getViewType(): string {
    return BASTION_VIEW_TYPE;
  }

  getDisplayText(): string {
    return "Bastions";
  }

  getIcon(): string {
    return "crown";
  }

  async onOpen(): Promise<void> {
    this.render();
  }

  async onClose(): Promise<void> {
    // Cleanup if needed
  }

  render(): void {
    const container = this.containerEl.children[1] as HTMLElement | undefined;
    if (!container) return;
    container.empty();

    const bastions = this.plugin.dataManager.getBastions();
    const bastionList = Object.values(bastions) as Bastion[];

    // Header
    const header = container.createEl("div", { cls: "bastion-header" });
    header.createEl("h2", { text: "Bastions" });
    header.createEl("button", { cls: "bastion-btn-new", text: "New Bastion" }).onclick = () => {
      this.plugin.openBastionModal();
    };

    // Bastions List
    if (bastionList.length === 0) {
      container.createEl("div", { cls: "bastion-empty", text: "No bastions yet. Create one to get started!" });
      return;
    }

    const list = container.createEl("div", { cls: "bastion-list" });

    bastionList.forEach((bastion) => {
      const bastionCard = list.createEl("div", { cls: "bastion-card" });

      const title = bastionCard.createEl("div", { cls: "bastion-card-title" });
      title.createEl("strong", { text: bastion.name });
      title.createEl("span", { cls: "bastion-level", text: `Lvl ${bastion.level}` });

      const character = bastionCard.createEl("div", { cls: "bastion-character", text: `Character: ${bastion.characterName}` });

      const stats = bastionCard.createEl("div", { cls: "bastion-stats" });
      this.createStatChip(stats, "shield", `${bastion.defenders} defenders`);
      this.createStatChip(stats, "coins", `${bastion.gold} gp`);
      this.createStatChip(stats, "building", `${bastion.facilities.length} facilities`);

      const actions = bastionCard.createEl("div", { cls: "bastion-actions" });
      actions.createEl("button", { cls: "bastion-btn-small", text: "Manage" }).onclick = () => {
        this.plugin.openBastionModal(bastion.id);
      };
      actions.createEl("button", { cls: "bastion-btn-small", text: "Turn" }).onclick = () => {
        this.plugin.openBastionTurnModal(bastion.id);
      };
      actions.createEl("button", { cls: "bastion-btn-small", text: "Delete" }).onclick = () => {
        if (confirm(`Delete ${bastion.name}?`)) {
          this.plugin.dataManager.deleteBastion(bastion.id);
          this.render();
        }
      };
    });
  }

  private createStatChip(container: HTMLElement, iconName: string, text: string): void {
    const chip = container.createEl("span", { cls: "bastion-stat-chip" });
    const icon = chip.createSpan({ cls: "bastion-stat-icon" });
    setIcon(icon, iconName);
    chip.createSpan({ text });
  }
}
