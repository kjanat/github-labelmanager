/**
 * Label synchronization logic
 * @module
 */

import type {
  GitHubLabel,
  LabelConfig,
  SyncOperation,
  SyncResult,
} from "./types.ts";
import { LabelManager } from "./client.ts";
import { logger } from "./logger.ts";

/** Normalize color to lowercase 6-char hex without # */
function normalizeColor(color: string): string {
  return String(color).replace(/^#/, "").toLowerCase().padStart(6, "0");
}

/**
 * Synchronize labels from config to GitHub repository
 */
export async function syncLabels(
  manager: LabelManager,
  config: LabelConfig,
): Promise<SyncResult> {
  const operations: SyncOperation[] = [];
  const summary = {
    created: 0,
    updated: 0,
    renamed: 0,
    deleted: 0,
    skipped: 0,
    failed: 0,
  };

  const { owner, repo } = manager.repoInfo;
  logger.info(`Syncing labels for ${owner}/${repo}`);
  if (manager.isDryRun) {
    logger.warn("DRY RUN MODE - no changes will be made");
  }

  // Fetch current labels from GitHub
  let currentLabels: GitHubLabel[];
  try {
    currentLabels = await manager.list();
  } catch (err) {
    logger.error(`Failed to list labels: ${LabelManager.formatError(err)}`);
    return {
      success: false,
      operations: [
        {
          type: "skip",
          label: "*",
          success: false,
          error: "Failed to fetch existing labels",
        },
      ],
      summary: { ...summary, failed: 1 },
    };
  }

  const existingMap = new Map(currentLabels.map((l) => [l.name, l]));

  // Process each desired label
  for (const desired of config.labels) {
    const cleanColor = normalizeColor(desired.color);

    // Check for renames via aliases
    let matchedName = desired.name;
    let skipLabel = false;

    if (!existingMap.has(desired.name) && desired.aliases) {
      for (const alias of desired.aliases) {
        if (existingMap.has(alias)) {
          // Rename the label
          logger.warn(`Renaming: "${alias}" -> "${desired.name}"`);
          try {
            await manager.update(alias, {
              name: alias,
              new_name: desired.name,
              color: desired.color,
              description: desired.description,
            });
            operations.push({
              type: "rename",
              label: desired.name,
              from: alias,
              success: true,
            });
            summary.renamed++;

            // Update local map
            const movedLabel = existingMap.get(alias)!;
            existingMap.delete(alias);
            existingMap.set(desired.name, {
              ...movedLabel,
              name: desired.name,
            });
            matchedName = desired.name;
          } catch (err) {
            logger.error(`Rename failed: ${LabelManager.formatError(err)}`);
            operations.push({
              type: "rename",
              label: desired.name,
              from: alias,
              success: false,
              error: LabelManager.formatError(err),
            });
            summary.failed++;
            // Don't attempt create after failed rename - alias still exists
            skipLabel = true;
          }
          break;
        }
      }
    }

    if (skipLabel) {
      continue;
    }

    // Create or update
    const existing = existingMap.get(matchedName);

    if (!existing) {
      // Create new label
      logger.success(`Creating: "${desired.name}"`);
      try {
        await manager.create(desired);
        operations.push({ type: "create", label: desired.name, success: true });
        summary.created++;
        existingMap.set(desired.name, {
          name: desired.name,
          color: cleanColor,
          description: desired.description,
        });
      } catch (err) {
        logger.error(`Create failed: ${LabelManager.formatError(err)}`);
        operations.push({
          type: "create",
          label: desired.name,
          success: false,
          error: LabelManager.formatError(err),
        });
        summary.failed++;
      }
    } else {
      // Check if update needed
      const isColorDiff = existing.color.toLowerCase() !== cleanColor;
      const isDescDiff = (existing.description || "") !== desired.description;

      if (isColorDiff || isDescDiff) {
        logger.info(`Updating: "${desired.name}"`);
        try {
          await manager.update(existing.name, desired);
          operations.push({
            type: "update",
            label: desired.name,
            success: true,
          });
          summary.updated++;
          existingMap.set(desired.name, {
            ...existing,
            color: cleanColor,
            description: desired.description,
          });
        } catch (err) {
          logger.error(`Update failed: ${LabelManager.formatError(err)}`);
          operations.push({
            type: "update",
            label: desired.name,
            success: false,
            error: LabelManager.formatError(err),
          });
          summary.failed++;
        }
      } else {
        logger.skip(`Up-to-date: "${desired.name}"`);
        operations.push({ type: "skip", label: desired.name, success: true });
        summary.skipped++;
      }
    }
  }

  // Process deletions
  if (config.delete) {
    for (const name of config.delete) {
      if (existingMap.has(name)) {
        logger.warn(`Deleting: "${name}"`);
        try {
          await manager.delete(name);
          operations.push({ type: "delete", label: name, success: true });
          summary.deleted++;
          existingMap.delete(name);
        } catch (err) {
          logger.error(`Delete failed: ${LabelManager.formatError(err)}`);
          operations.push({
            type: "delete",
            label: name,
            success: false,
            error: LabelManager.formatError(err),
          });
          summary.failed++;
        }
      } else {
        logger.skip(`Delete target not found: "${name}"`);
        operations.push({ type: "skip", label: name, success: true });
        summary.skipped++;
      }
    }
  }

  logger.info("Sync complete");

  return {
    success: summary.failed === 0,
    operations,
    summary,
  };
}
