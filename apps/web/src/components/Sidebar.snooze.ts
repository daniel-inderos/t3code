import type { EnvironmentId } from "@t3tools/contracts";
import type { TimestampFormat } from "@t3tools/contracts/settings";
import type { EnvironmentThreadShell } from "@t3tools/client-runtime/state/models";
import {
  type LimitResetSnooze,
  pickSnoozePreset as pickSharedSnoozePreset,
  resolveLimitResetSnooze as resolveSharedLimitResetSnooze,
  resolveSnoozePresets as resolveSharedSnoozePresets,
  snoozeWakeLabel,
  type SnoozePreset,
} from "@t3tools/client-runtime/state/thread-settled";

import { appAtomRegistry } from "../rpc/atomRegistry";
import { serverEnvironment } from "../state/server";
import { formatShortTimestamp } from "../timestampFormat";
import { toastManager } from "./ui/toast";

export { snoozeWakeLabel, type SnoozePreset };

/** The snooze menu for a thread, from its environment's presets, read when the menu opens. */
export function resolveSnoozePresets(
  now: Date,
  timestampFormat: TimestampFormat,
  environmentId: EnvironmentId,
): ReadonlyArray<SnoozePreset> {
  return resolveSharedSnoozePresets(now, snoozeOptions(timestampFormat, environmentId));
}

/** "Until limits reset" for these threads, from their environments' latest usage limits. */
export function resolveLimitResetSnooze(
  threads: ReadonlyArray<
    Pick<EnvironmentThreadShell, "environmentId" | "modelSelection" | "runtime">
  >,
  now: Date,
  timestampFormat: TimestampFormat,
): LimitResetSnooze | null {
  return resolveSharedLimitResetSnooze({
    threads,
    providers: (environmentId) =>
      appAtomRegistry.get(serverEnvironment.providersValueAtom(environmentId)) ?? undefined,
    now,
    formatTime: (date) => formatShortTimestamp(date.toISOString(), timestampFormat),
  });
}

/** The presets a menu showed, with its "Until limits reset" choice when it had one. */
export function shownSnoozePresets(
  presets: ReadonlyArray<SnoozePreset>,
  limitReset: LimitResetSnooze | null,
): ReadonlyArray<SnoozePreset> {
  return limitReset?.kind === "ready" ? [limitReset.preset, ...presets] : presets;
}

/** A shown menu choice as picked; see the shared `pickSnoozePreset`. */
export function pickSnoozePreset(
  shown: ReadonlyArray<SnoozePreset>,
  id: string,
  timestampFormat: TimestampFormat,
  environmentId: EnvironmentId,
): SnoozePreset | undefined {
  const picked = pickSharedSnoozePreset({
    shown,
    id,
    now: new Date(),
    ...snoozeOptions(timestampFormat, environmentId),
  });
  if (!picked) {
    toastManager.add({
      type: "warning",
      title: "Could not snooze thread",
      description: "That snooze time has passed. Choose another time.",
    });
  }
  return picked;
}

function snoozeOptions(timestampFormat: TimestampFormat, environmentId: EnvironmentId) {
  const presets = appAtomRegistry.get(
    serverEnvironment.settingsValueAtom(environmentId),
  )?.snoozePresets;
  return {
    ...(presets ? { presets } : {}),
    formatTime: (date: Date) => formatShortTimestamp(date.toISOString(), timestampFormat),
  };
}
