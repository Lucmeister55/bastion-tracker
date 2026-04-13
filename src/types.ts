/**
 * Type definitions for D&D 5.5e Bastion system
 */

export interface Bastion {
  id: string;
  name: string;
  characterName: string;
  level: number;
  description: string;
  facilities: BasilionFacility[];
  hirelings: Hireling[];
  defenders: number;
  gold: number;
  turns?: BastionTurn[];
  createdAt: number;
  lastUpdated: number;
}

export interface BasilionFacility {
  id: string;
  name: string;
  type: "basic" | "special";
  spaceType: "Cramped" | "Roomy" | "Vast";
  size: number; // in 5-foot squares
  minLevel?: number;
  requirements?: string[];
  cost?: number;
  timeToBuild?: number; // in days
  isUpgraded: boolean;
  description: string;
  availableOrders: Order[];
  notes: string;
  hirelings?: number; // Number of hirelings assigned to this facility
}

export interface Hireling {
  id: string;
  name: string;
  facilityId: string;
  role: string;
  status: "active" | "injured" | "dead";
  personality: string;
  backstory: string;
  skills: string[];
  notes: string;
}

export type Order = "Craft" | "Empower" | "Harvest" | "Maintain" | "Recruit" | "Research" | "Trade";

export interface BastionTurn {
  id: string;
  bastionId: string;
  turnNumber: number;
  date: number;
  orders: IssuedOrder[];
  events: BastionEvent[];
  resolutionNotes: string;
}

export interface IssuedOrder {
  id: string;
  facilityId: string;
  orderType: Order;
  details: string;
  resolved: boolean;
  result: string;
}

export interface BastionEvent {
  id: string;
  type: string;
  description: string;
  resolution: string;
  defendersLost?: number;
  rewardGold?: number;
}

export interface BastionSettings {
  compendiumPath: string;
  autoLoadRooms: boolean;
  trackDefenders: boolean;
  trackGold: boolean;
  trackTurns: boolean;
  turnFrequencyDays: number;
  restrictToLevelRequirements: boolean;
  restrictMaxSpecialFacilities: boolean;
}

export const DEFAULT_BASTIONS_SETTINGS: BastionSettings = {
  compendiumPath: "3-Mechanics/CLI/bastions",
  autoLoadRooms: true,
  trackDefenders: true,
  trackGold: true,
  trackTurns: true,
  turnFrequencyDays: 7,
  restrictToLevelRequirements: true,
  restrictMaxSpecialFacilities: true,
};
