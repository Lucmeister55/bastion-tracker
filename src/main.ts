import { Plugin, Notice } from "obsidian";
import { BastionDataManager } from "./data-manager";
import { BastionView, BASTION_VIEW_TYPE } from "./views/bastion-view";
import { BastionSettingsTab } from "./settings-tab";
import { BastionModal } from "./modals/bastion-modal";
import { BastionTurnModal } from "./modals/bastion-turn-modal";

export default class BastionPlugin extends Plugin {
	dataManager: BastionDataManager;

	async onload() {
		// Initialize data manager
		this.dataManager = new BastionDataManager(this);
		await this.dataManager.loadSettings();

		// Register the bastion view
		this.registerView(BASTION_VIEW_TYPE, (leaf) => new BastionView(leaf, this));

		// Add settings tab
		this.addSettingTab(new BastionSettingsTab(this.app, this));

		// Add ribbon icon to open bastion view
		this.addRibbonIcon("crown", "Bastions", async () => {
			this.activateBastionView();
		});

		// Commands
		this.addCommand({
			id: "bastion-open-view",
			name: "Open Bastions",
			callback: () => this.activateBastionView(),
		});

		this.addCommand({
			id: "bastion-create-new",
			name: "Create new bastion",
			callback: () => this.openBastionModal(),
		});

		this.addCommand({
			id: "bastion-export-data",
			name: "Export bastion data",
			callback: () => this.exportBastionData(),
		});

		// Auto-open view on load
		this.app.workspace.onLayoutReady(() => {
			if (this.app.workspace.getLeavesOfType(BASTION_VIEW_TYPE).length === 0) {
				this.activateBastionView();
			}
		});

		console.log("Bastion Plugin loaded");
	}

	onunload() {
		console.log("Bastion Plugin unloaded");
	}

	async activateBastionView() {
		const { workspace } = this.app;

		let leaf = workspace.getLeavesOfType(BASTION_VIEW_TYPE)[0];

		if (!leaf) {
			leaf = workspace.getRightLeaf(false) ?? undefined;
			if (leaf) await leaf.setViewState({ type: BASTION_VIEW_TYPE, active: true });
		}

		workspace.revealLeaf(leaf!);
	}

	openBastionModal(bastionId?: string) {
		new BastionModal(this.app, this, bastionId).open();
	}

	openBastionTurnModal(bastionId: string) {
		new BastionTurnModal(this.app, this, bastionId).open();
	}

	refreshBastionView() {
		const leaves = this.app.workspace.getLeavesOfType(BASTION_VIEW_TYPE);
		leaves.forEach((leaf) => {
			if (leaf.view instanceof BastionView) {
				leaf.view.render();
			}
		});
	}

	async exportBastionData() {
		const data = JSON.stringify(this.dataManager.getSettings().bastions, null, 2);
		const blob = new Blob([data], { type: "application/json" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `bastions-${Date.now()}.json`;
		a.click();
		URL.revokeObjectURL(url);
		new Notice("Bastion data exported!");
	}
}
