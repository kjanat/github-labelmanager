/**
 * Label synchronization logic
 * @module
 */

import type { LabelConfig, SyncOperation, SyncResult } from "./domain/types.ts";
import type { GitHubLabel } from "./adapters/client/mod.ts";
import type { AnnotationProperties } from "./adapters/logger/mod.ts";
import { LabelManager } from "./client.ts";
import { LabelColorUtils } from "./domain/labels.ts";

/**
 * Build annotation properties for a label operation
 * @param config - Label config with metadata
 * @param labelName - Name of the label
 * @param title - Annotation title
 * @param isDelete - Whether this is a delete operation
 */
function getAnnotation(
  config: LabelConfig,
  labelName: string,
  title: string,
  isDelete = false,
): AnnotationProperties {
  const meta = config._meta;
  if (!meta) return { title };

  const line = isDelete
    ? meta.deleteLines[labelName]
    : meta.labelLines[labelName];

  return {
    title,
    file: meta.filePath,
    startLine: line,
  };
}

/**
 * Synchronize labels from config to GitHub repository
 */
export async function syncLabels(
  manager: LabelManager,
  config: LabelConfig,
): Promise<SyncResult> {
  const logger = manager.getLogger();
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
    logger.info("[dry-run] No changes will be made");
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
    const cleanColor = LabelColorUtils.normalize(desired.color);

    // Check for renames via aliases
    const matchedName = desired.name;
    let skipLabel = false;

    if (!existingMap.has(desired.name) && desired.aliases) {
      for (const alias of desired.aliases) {
        if (existingMap.has(alias)) {
          // Rename the label
          const msg = `Renaming: "${alias}" -> "${desired.name}"`;
          if (manager.isDryRun) {
            logger.info(
              `[dry-run] Would rename: "${alias}" -> "${desired.name}"`,
            );
            logger.debug(msg);
          } else {
            logger.notice(
              `"${alias}" -> "${desired.name}"`,
              getAnnotation(config, desired.name, "Label Renamed"),
            );
          }
          try {
            await manager.update(alias, {
              name: alias,
              new_name: desired.name,
              color: cleanColor,
              description: desired.description,
            });
            operations.push({
              type: "rename",
              label: desired.name,
              from: alias,
              success: true,
              details: { color: cleanColor, description: desired.description },
            });
            summary.renamed++;

            // Update local map - rename already updated color/description
            const movedLabel = existingMap.get(alias)!;
            existingMap.delete(alias);
            existingMap.set(desired.name, {
              ...movedLabel,
              name: desired.name,
              color: cleanColor ?? movedLabel.color,
              description: desired.description ?? null,
            });
            // Skip update check - rename already applied all changes
            skipLabel = true;
          } catch (err) {
            logger.error(
              `Rename failed: ${LabelManager.formatError(err)}`,
              getAnnotation(config, desired.name, "Rename Failed"),
            );
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
      const colorDisplay = cleanColor ? `#${cleanColor}` : "default";
      const msg = `Creating: "${desired.name}" (${colorDisplay})`;
      if (manager.isDryRun) {
        logger.info(
          `[dry-run] Would create: "${desired.name}" (${colorDisplay})`,
        );
        logger.debug(msg);
      } else {
        logger.success(msg);
      }
      try {
        await manager.create(desired);
        operations.push({
          type: "create",
          label: desired.name,
          success: true,
          details: { color: cleanColor, description: desired.description },
        });
        summary.created++;
        existingMap.set(desired.name, {
          name: desired.name,
          color: cleanColor ?? "ededed", // GitHub's default label color
          description: desired.description ?? null,
        });
      } catch (err) {
        logger.error(
          `Create failed: ${LabelManager.formatError(err)}`,
          getAnnotation(config, desired.name, "Create Failed"),
        );
        operations.push({
          type: "create",
          label: desired.name,
          success: false,
          error: LabelManager.formatError(err),
        });
        summary.failed++;
      }
    } else {
      // Check if update needed (undefined cleanColor means no color change requested)
      const isColorDiff = cleanColor !== undefined &&
        existing.color.toLowerCase() !== cleanColor;
      const isDescDiff = (existing.description || "") !== desired.description;

      if (isColorDiff || isDescDiff) {
        // Build detailed change message
        const changes: string[] = [];
        if (isColorDiff) {
          changes.push(`color: #${existing.color} -> #${cleanColor}`);
        }
        if (isDescDiff) {
          changes.push("description changed");
        }
        const changeStr = changes.join(", ");
        const msg = `Updating: "${desired.name}" (${changeStr})`;

        if (manager.isDryRun) {
          logger.info(
            `[dry-run] Would update: "${desired.name}" (${changeStr})`,
          );
          logger.debug(msg);
        } else {
          logger.info(msg);
        }
        try {
          await manager.update(existing.name, desired);
          operations.push({
            type: "update",
            label: desired.name,
            success: true,
            details: {
              color: cleanColor,
              description: desired.description ?? undefined,
              oldColor: existing.color,
              oldDescription: existing.description ?? undefined,
            },
          });
          summary.updated++;
          existingMap.set(desired.name, {
            ...existing,
            color: cleanColor ?? existing.color,
            description: desired.description ?? null,
          });
        } catch (err) {
          logger.error(
            `Update failed: ${LabelManager.formatError(err)}`,
            getAnnotation(config, desired.name, "Update Failed"),
          );
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
        const existing = existingMap.get(name)!;
        const msg = `Deleting: "${name}"`;
        if (manager.isDryRun) {
          logger.info(`[dry-run] Would delete: "${name}"`);
          logger.debug(msg);
        } else {
          logger.notice(
            `"${name}"`,
            getAnnotation(config, name, "Label Deleted", true),
          );
        }
        try {
          await manager.delete(name);
          operations.push({
            type: "delete",
            label: name,
            success: true,
            details: {
              color: existing.color,
              description: existing.description ?? undefined,
            },
          });
          summary.deleted++;
          existingMap.delete(name);
        } catch (err) {
          logger.error(
            `Delete failed: ${LabelManager.formatError(err)}`,
            getAnnotation(config, name, "Delete Failed", true),
          );
          operations.push({
            type: "delete",
            label: name,
            success: false,
            error: LabelManager.formatError(err),
          });
          summary.failed++;
        }
      } else {
        // Label already doesn't exist - not an error, just skip
        logger.info(`Delete target not found: "${name}" (already removed)`);
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
