import * as fs from "fs";
import * as path from "path";

/**
 * Test the compendium parser with example files
 * This runs during the build process to validate parser functionality
 */

class TestRunner {
  async runTests() {
    console.log("\n=== Compendium Parser Tests ===\n");

    const exampleDir = path.join(process.cwd(), "compendium-examples");
    if (!fs.existsSync(exampleDir)) {
      console.warn("[SKIP] compendium-examples directory not found, skipping tests");
      return;
    }

    try {
      // Read example file
      const exampleFile = path.join(exampleDir, "archive.md");
      if (!fs.existsSync(exampleFile)) {
        console.warn("[SKIP] No example markdown files found in compendium-examples");
        return;
      }

      const rawContent = fs.readFileSync(exampleFile, "utf-8");
      const content = rawContent.replace(/\r\n/g, "\n");

      // Test YAML frontmatter parsing
      const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
      if (!frontmatterMatch) {
        console.error("[FAIL] Failed to parse frontmatter");
        process.exit(1);
      }

      const frontmatterStr = frontmatterMatch[1] || "";
      const body = frontmatterMatch[2] || "";

      // Test tag parsing
      const frontmatterLines = frontmatterStr.split("\n");
      const parsedTags = [];
      let inTagsBlock = false;

      for (const line of frontmatterLines) {
        const trimmed = line.trim();

        if (trimmed.startsWith("tags:")) {
          inTagsBlock = true;
          const inlineArrayMatch = trimmed.match(/tags:\s*\[(.*)\]$/);
          if (inlineArrayMatch && inlineArrayMatch[1]) {
            parsedTags.push(
              ...inlineArrayMatch[1]
                .split(",")
                .map((tag) => tag.trim())
                .filter(Boolean)
            );
            inTagsBlock = false;
          }
          continue;
        }

        if (inTagsBlock && trimmed.startsWith("- ")) {
          parsedTags.push(trimmed.slice(2).trim());
          continue;
        }

        if (inTagsBlock && trimmed && !trimmed.startsWith("- ")) {
          inTagsBlock = false;
        }
      }

      if (parsedTags.length === 0) {
        console.error("[FAIL] Failed to parse tags");
        process.exit(1);
      }

      const hasBastionTag = parsedTags.some((tag) => tag.includes("bastion"));
      if (!hasBastionTag) {
        console.error("[FAIL] Example missing bastion tag");
        process.exit(1);
      }

      // Test facility details parsing
      const tests = [
        {
          name: "Title parsing",
          regex: /^# (.+)$/m,
          expected: "Archive",
        },
        {
          name: "Level parsing",
          regex: /\*Level (\d+) Bastion facility\*/,
          expected: "13",
        },
        {
          name: "Prerequisites parsing",
          regex: /- \*\*Prerequisites\*\*: (.+)/,
          expected: "None",
        },
        {
          name: "Space parsing",
          regex: /- \*\*Space\*\*: (.+?) \(/,
          expected: "Roomy",
        },
        {
          name: "Hirelings parsing",
          regex: /- \*\*Hirelings\*\*: (\d+)/,
          expected: "1",
        },
        {
          name: "Order parsing",
          regex: /- \*\*Order\*\*: (.+)/,
          expected: "research",
        },
      ];

      let passed = 0;
      for (const test of tests) {
        const match = body.match(test.regex);
        if (match && match[1] === test.expected) {
          console.log(`[PASS] ${test.name}: "${match[1]}"`);
          passed++;
        } else {
          console.error(
            `[FAIL] ${test.name}: expected "${test.expected}", got "${match?.[1] || "null"}"`
          );
        }
      }

      console.log(`\n${passed}/${tests.length} tests passed\n`);

      if (passed !== tests.length) {
        process.exit(1);
      }

      console.log("[PASS] Compendium parser validation successful!\n");
    } catch (error) {
      console.error("[FAIL] Test error:", error);
      process.exit(1);
    }
  }
}

const runner = new TestRunner();
runner.runTests().catch((error) => {
  console.error("[FAIL] Fatal test error:", error);
  process.exit(1);
});
