import { App } from "obsidian";
import { BasilionFacility } from "../types";

export class CompendiumParser {
  constructor(private app: App) {}

  /**
   * Parse facility markdown files from compendium path
   */
  async parseFacilities(compendiumPath: string): Promise<BasilionFacility[]> {
    const facilities: BasilionFacility[] = [];

    try {
      const folder = this.app.vault.getAbstractFileByPath(compendiumPath);
      if (!folder || !("children" in folder)) {
        console.warn(`Compendium path not found: ${compendiumPath}`);
        return facilities;
      }

      // @ts-ignore - accessing children property
      for (const file of folder.children) {
        if (file.extension === "md") {
          const facility = await this.parseFacilityFile(file);
          if (facility) {
            facilities.push(facility);
          }
        }
      }
    } catch (error) {
      console.error("Error parsing compendium:", error);
    }

    return facilities;
  }

  /**
   * Parse a single facility markdown file
   */
  private async parseFacilityFile(file: any): Promise<BasilionFacility | null> {
    try {
      const content = await this.app.vault.read(file);
      const { frontmatter, body } = this.extractFrontmatter(content);

      // Validate it's a facility using tags
      if (!frontmatter.tags?.some((tag: string) => tag.includes("bastion"))) {
        return null;
      }

      // Parse facility details
      const nameMatch = body.match(/^# (.+)$/m);
      const levelMatch = body.match(/\*Level (\d+) Bastion facility\*/);
      const prerequisitesMatch = body.match(/- \*\*Prerequisites\*\*: (.+)/);
      const spaceMatch = body.match(/- \*\*Space\*\*: (.+?) \(/);
      const hirelingsMatch = body.match(/- \*\*Hirelings\*\*: (\d+)/);
      const orderMatch = body.match(/- \*\*Order\*\*: (.+)/);

      if (!nameMatch || !nameMatch[1]) return null;

      const name = nameMatch[1];
      const level = levelMatch && levelMatch[1] ? parseInt(levelMatch[1], 10) : undefined;
      const space = spaceMatch && spaceMatch[1] ? spaceMatch[1] : "Roomy";
      const numHirelings = hirelingsMatch && hirelingsMatch[1] ? parseInt(hirelingsMatch[1], 10) : 1;
      const orders = orderMatch && orderMatch[1] ? [orderMatch[1]] : [];

      // Extract prerequisites as string
      const requirements = prerequisitesMatch && prerequisitesMatch[1] ? [prerequisitesMatch[1]] : [];

      // Get description from file
      const description = this.extractDescription(body);

      return {
        id: `facility-${file.name.toLowerCase().replace(/[^a-z0-9]/g, "-")}`,
        name,
        type: "basic",
        spaceType: (space as "Cramped" | "Roomy" | "Vast"),
        size: this.spaceToSize(space),
        minLevel: level,
        requirements,
        isUpgraded: false,
        description,
        availableOrders: orders as any[],
        notes: `Source: ${file.name}`,
      };
    } catch (error) {
      console.error(`Error parsing facility file ${file.name}:`, error);
      return null;
    }
  }

  /**
   * Extract YAML frontmatter from markdown content
   */
  private extractFrontmatter(
    content: string
  ): { frontmatter: Record<string, any>; body: string } {
    const normalizedContent = content.replace(/\r\n/g, "\n");
    const frontmatterMatch = normalizedContent.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);

    if (!frontmatterMatch) {
      return { frontmatter: {}, body: content };
    }

    const frontmatterStr = frontmatterMatch[1] || "";
    const body = frontmatterMatch[2] || "";
    const frontmatter: Record<string, any> = {};

    // Simple YAML parser for our needs
    const lines = frontmatterStr.split("\n");
    let activeListKey: "tags" | "cssclasses" | null = null;

    for (const line of lines) {
      const trimmed = line.trim();

      if (activeListKey) {
        if (trimmed.startsWith("- ")) {
          if (!Array.isArray(frontmatter[activeListKey])) {
            frontmatter[activeListKey] = [];
          }
          frontmatter[activeListKey].push(trimmed.slice(2).trim());
          continue;
        }

        if (trimmed) {
          activeListKey = null;
        }
      }

      const colonIndex = line.indexOf(":");
      if (colonIndex === -1) continue;

      const key = line.substring(0, colonIndex).trim();
      const value = line.substring(colonIndex + 1).trim();

      if (key === "tags") {
        if (!value) {
          frontmatter.tags = [];
          activeListKey = "tags";
        } else {
          const arrayMatch = value.match(/\[(.*?)\]/);
          if (arrayMatch && arrayMatch[1]) {
            frontmatter.tags = arrayMatch[1].split(",").map((t) => t.trim());
          }
        }
      } else if (key === "cssclasses") {
        if (!value) {
          frontmatter.cssclasses = [];
          activeListKey = "cssclasses";
        } else if (value.startsWith("[")) {
          try {
            frontmatter.cssclasses = JSON.parse(value);
          } catch {
            frontmatter.cssclasses = [value];
          }
        } else {
          frontmatter.cssclasses = [value];
        }
      } else {
        frontmatter[key] = value;
      }
    }

    return { frontmatter, body };
  }

  /**
   * Extract description from facility markdown body
   */
  private extractDescription(body: string): string {
    // Skip the title and get first paragraph
    const lines = body
      .split("\n")
      .filter((line) => line && !line.startsWith("#"));

    let description = "";
    for (const line of lines) {
      if (line.startsWith("##")) break; // Stop at next heading
      if (line.startsWith("-")) break; // Stop at list items (attributes)
      description += line + " ";
    }

    return description.trim();
  }

  /**
   * Convert space name to square count
   */
  private spaceToSize(space: string): number {
    const spaceLower = space.toLowerCase();
    if (spaceLower.includes("cramped")) return 4;
    if (spaceLower.includes("roomy")) return 16;
    if (spaceLower.includes("vast")) return 36;
    return 16; // default
  }
}
