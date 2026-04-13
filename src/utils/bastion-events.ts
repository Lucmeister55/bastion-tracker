/**
 * Bastion Events system
 * Integrated with the Maintain order
 * Uses the Javalent dice-roller plugin if available
 */

import { App } from "obsidian";

// Define the Roller interface from dice-roller plugin
interface DiceRoller {
  roll(): Promise<any>;
  results: number[];
}

export const BASTION_EVENTS = [
  {
    min: 1,
    max: 50,
    id: "all-is-well",
    name: "All Is Well",
    type: "positive",
    description: "No events trouble your Bastion this turn. Everything proceeds normally.",
    resolution: "Roll on the All Is Well subtable for flavor text.",
  },
  {
    min: 51,
    max: 55,
    id: "attack",
    name: "Attack",
    type: "negative",
    description: "An enemy force attacks your Bastion.",
    resolution: "Roll 6d6 for damage to your defenders. If damage exceeds defenders, the weakest facility takes damage.",
  },
  {
    min: 56,
    max: 58,
    id: "criminal-hireling",
    name: "Criminal Hireling",
    type: "challenge",
    description: "A criminal hireling causes trouble.",
    resolution: "Pay 1d6 × 100 GP in bribes or lose one hireling.",
  },
  {
    min: 59,
    max: 63,
    id: "extraordinary-opportunity",
    name: "Extraordinary Opportunity",
    type: "choice",
    description: "A special opportunity presents itself.",
    resolution: "Choose how to capitalize on it or let it pass.",
  },
  {
    min: 64,
    max: 72,
    id: "friendly-visitors",
    name: "Friendly Visitors",
    type: "positive",
    description: "Welcome guests arrive at your Bastion.",
    resolution: "They bring news and trade opportunities.",
  },
  {
    min: 73,
    max: 76,
    id: "guest",
    name: "Guest",
    type: "positive",
    description: "An important guest arrives.",
    resolution: "Choose to entertain them (gain favor) or dismiss them.",
  },
  {
    min: 77,
    max: 79,
    id: "lost-hirelings",
    name: "Lost Hirelings",
    type: "negative",
    description: "Some of your hirelings vanish mysteriously.",
    resolution: "Roll 1d4 to determine how many are lost. You may search for them.",
  },
  {
    min: 80,
    max: 83,
    id: "magical-discovery",
    name: "Magical Discovery",
    type: "positive",
    description: "You discover something magical or arcane.",
    resolution: "Gain a magical item or learn something useful.",
  },
  {
    min: 84,
    max: 91,
    id: "refugees",
    name: "Refugees",
    type: "challenge",
    description: "Refugees seek sanctuary at your Bastion.",
    resolution: "Roll 2d6 refugees arrive. Choose to shelter, employ, or turn them away.",
  },
  {
    min: 92,
    max: 98,
    id: "request-for-aid",
    name: "Request for Aid",
    type: "choice",
    description: "Someone requests aid from your Bastion.",
    resolution: "Choose to help, refuse, or negotiate payment.",
  },
  {
    min: 99,
    max: 100,
    id: "treasure",
    name: "Treasure",
    type: "positive",
    description: "A hidden treasure is discovered!",
    resolution: "Roll 2d10 × 100 to determine the GP amount.",
  },
];

export const ALL_IS_WELL_TABLE = [
  "Accident reports are way down.",
  "The leak in the roof has been fixed.",
  "No vermin infestations to report.",
  "You-Know-Who lost their spectacles again.",
  "One of your hirelings adopted a stray dog.",
  "You received a lovely letter from a friend.",
  "Some practical joker has been putting rotten eggs in people's boots.",
  "Someone thought they saw a ghost.",
];

/**
 * Roll 1d100 using dice-roller plugin if available, otherwise fallback to Math.random()
 */
export async function rollD100(app: App): Promise<number> {
  try {
    const diceRollerPlugin = (app as any).plugins?.getPlugin("obsidian-dice-roller");
    if (diceRollerPlugin && diceRollerPlugin.getRoller) {
      const roller = await diceRollerPlugin.getRoller("1d100");
      if (roller && roller.results && roller.results.length > 0) {
        return roller.results[0];
      }
    }
  } catch (err) {
    console.warn("Dice roller plugin failed, falling back to Math.random():", err);
  }

  // Fallback to Math.random()
  return Math.floor(Math.random() * 100) + 1;
}

/**
 * Roll multiple dice using dice-roller plugin if available, otherwise fallback to Math.random()
 * Example: rollDice(app, 6, 6) for 6d6
 */
export async function rollDice(app: App, numDice: number, sides: number): Promise<number> {
  try {
    const diceRollerPlugin = (app as any).plugins?.getPlugin("obsidian-dice-roller");
    if (diceRollerPlugin && diceRollerPlugin.getRoller) {
      const formula = `${numDice}d${sides}`;
      const roller = await diceRollerPlugin.getRoller(formula);
      if (roller && roller.results && roller.results.length > 0) {
        // Sum all results
        return roller.results.reduce((sum: number, result: number) => sum + result, 0);
      }
    }
  } catch (err) {
    console.warn(`Dice roller plugin failed for ${numDice}d${sides}, falling back to Math.random():`, err);
  }

  // Fallback to Math.random()
  let total = 0;
  for (let i = 0; i < numDice; i++) {
    total += Math.floor(Math.random() * sides) + 1;
  }
  return total;
}

/**
 * Get event data by 1d100 roll result
 */
export function getEventByRoll(roll: number) {
  return BASTION_EVENTS.find((e) => roll >= e.min && roll <= e.max);
}

/**
 * Get random flavor text from the "All Is Well" subtable
 */
export function getAllIsWellDetail(): string {
  const index = Math.floor(Math.random() * ALL_IS_WELL_TABLE.length);
  return ALL_IS_WELL_TABLE[index] || "Everything appears to be normal.";
}

export async function resolveEventOutcome(app: App, eventId: string): Promise<string> {
  switch (eventId) {
    case "all-is-well": {
      return getAllIsWellDetail();
    }
    case "attack": {
      const losses = await rollDice(app, 6, 6);
      return `Attack losses check result: ${losses} (6d6). Apply defender losses per table rules.`;
    }
    case "criminal-hireling": {
      const bribeRoll = await rollDice(app, 1, 6);
      return `Bribe pressure: ${bribeRoll * 100} GP (1d6 x 100).`;
    }
    case "lost-hirelings": {
      const lost = await rollDice(app, 1, 4);
      return `Lost hirelings impact roll: ${lost} (1d4).`;
    }
    case "refugees": {
      const refugees = await rollDice(app, 2, 4);
      return `Refugees arriving: ${refugees} (2d4).`;
    }
    case "treasure": {
      const treasureRoll = await rollD100(app);
      return `Treasure table roll: ${treasureRoll} (1d100). Resolve on DMG treasure table.`;
    }
    case "request-for-aid": {
      return "Choose defenders to dispatch, then roll per-defender d6 and total results (10+ for full reward).";
    }
    case "extraordinary-opportunity": {
      return "Decision event: pay 500 GP to pursue and trigger another event roll, or decline with no further effect.";
    }
    case "friendly-visitors": {
      const reward = await rollDice(app, 1, 6);
      return `Visitor payment roll: ${reward * 100} GP (1d6 x 100).`;
    }
    case "guest": {
      const guestType = await rollDice(app, 1, 4);
      return `Guest type roll: ${guestType} (1d4).`;
    }
    case "magical-discovery": {
      return "Gain one uncommon potion or scroll per event rules.";
    }
    default:
      return "Resolve according to Bastion event narrative rules.";
  }
}
