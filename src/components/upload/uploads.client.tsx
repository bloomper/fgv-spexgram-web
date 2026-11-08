"use client";

import * as React from "react";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { CheckCircle2, CircleAlert, Copy, Loader2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { uploadFile } from "@/components/upload/tus.client";
import { addUploadsAction } from "@/app/(app)/actions.server";
import type { UploadResultView } from "@/utils/gram";
import { track } from "@/utils/umami";

export type UploadMode = "items" | "contribution";

export type UploadTarget = {
  albumId: string;
  albumTitle: string;
  mode: UploadMode;
  /** Larger files are refused before they are sent. */
  maxBytes: number;
};

export type UploadEntry = {
  key: string;
  fileName: string;
  size: number;
  albumId: string;
  albumTitle: string;
  mode: UploadMode;
  state: "queued" | "uploading" | "adding" | "done" | "failed";
  progress: number;
  result?: UploadResultView;
  /** Why it failed before the server could say what became of it. */
  error?: string;
};

type Uploads = {
  entries: UploadEntry[];
  enqueue: (files: File[], target: UploadTarget) => void;
  clearFinished: () => void;
};

const UploadsContext = createContext<Uploads | null>(null);

/** Files sent at the same time. */
const PARALLEL = 2;

let counter = 0;

/**
 * Uploads that keep running while the user goes on to other pages: the layout holds them, the header shows how far they
 * have come, and an album page shows its own. Each file goes through tus, then to the album as an item (editors) or a
 * contribution (members), one at a time so that each gets its own result: created, already in Spexgram, or rejected.
 */
export function UploadsProvider({ children }: { children: React.ReactNode }) {
  const t = useTranslations("Uploads");
  const router = useRouter();
  const pathname = usePathname();
  const [entries, setEntries] = useState<UploadEntry[]>([]);
  const files = useRef(new Map<string, File>());
  const started = useRef(new Set<string>());
  const pathnameRef = useRef(pathname);

  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  const update = useCallback((key: string, change: Partial<UploadEntry>) => {
    setEntries(current => current.map(entry => entry.key === key ? { ...entry, ...change } : entry));
  }, []);

  const run = useCallback(async (entry: UploadEntry) => {
    const file = files.current.get(entry.key);

    if (!file) {
      return;
    }
    update(entry.key, { state: "uploading" });
    try {
      const uploadId = await uploadFile(file, fraction => update(entry.key, { progress: fraction }));

      update(entry.key, { state: "adding", progress: 1 });

      const result = await addUploadsAction(entry.albumId, entry.mode, [uploadId]);

      if (!result.ok) {
        update(entry.key, { state: "failed", error: result.message });
      } else {
        update(entry.key, { state: "done", result: result.data[0] });
        track(entry.mode === "items" ? "item-upload" : "contribution-upload", { outcome: result.data[0]?.outcome ?? "NONE" });
        // The album's page shows the new item; other pages, e.g. one playing a video, are left alone
        if (pathnameRef.current.includes(entry.albumId)) {
          router.refresh();
        }
      }
    } catch {
      update(entry.key, { state: "failed", error: t("failed") });
    } finally {
      files.current.delete(entry.key);
    }
  }, [router, t, update]);

  // Starts queued files while fewer than PARALLEL are on their way
  useEffect(() => {
    const active = entries.filter(entry => entry.state === "uploading" || entry.state === "adding"
      || (entry.state === "queued" && started.current.has(entry.key))).length;

    for (const entry of entries.filter(candidate => candidate.state === "queued" && !started.current.has(candidate.key))
      .slice(0, Math.max(0, PARALLEL - active))) {
      started.current.add(entry.key);
      void run(entry);
    }
  }, [entries, run, update]);

  const enqueue = useCallback((list: File[], target: UploadTarget) => {
    const added = list.map((file): UploadEntry => {
      const key = `upload-${++counter}`;
      const tooLarge = file.size > target.maxBytes;

      if (!tooLarge) {
        files.current.set(key, file);
      }
      return {
        key,
        fileName: file.name,
        size: file.size,
        albumId: target.albumId,
        albumTitle: target.albumTitle,
        mode: target.mode,
        state: tooLarge ? "failed" : "queued",
        progress: 0,
        error: tooLarge ? t("tooLarge") : undefined,
      };
    });

    setEntries(current => [...current, ...added]);
  }, [t]);

  const clearFinished = useCallback(() => {
    setEntries(current => current.filter(entry => entry.state !== "done" && entry.state !== "failed"));
  }, []);

  return <UploadsContext.Provider value={{ entries, enqueue, clearFinished }}>{children}</UploadsContext.Provider>;
}

export function useUploads(): Uploads {
  const uploads = useContext(UploadsContext);

  if (!uploads) {
    throw new Error("useUploads must be used within <UploadsProvider />");
  }
  return uploads;
}

const isActive = (entry: UploadEntry) => entry.state === "queued" || entry.state === "uploading" || entry.state === "adding";

/**
 * One upload: its name, progress, and what became of it, with a link to the file that was already in Spexgram.
 */
function UploadRow({ entry }: { entry: UploadEntry }) {
  const t = useTranslations("Uploads");
  const outcome = entry.result?.outcome;

  return (
    <li className="flex items-start gap-2 py-1.5 text-sm" data-testid="upload-row">
      <span className="mt-0.5 shrink-0">
        {isActive(entry) ? <Loader2 className="size-4 animate-spin" aria-hidden />
          : outcome === "CREATED" ? <CheckCircle2 className="size-4 text-green-600 dark:text-green-400" aria-hidden />
            : outcome === "DUPLICATE" ? <Copy className="size-4 text-amber-600 dark:text-amber-400" aria-hidden />
              : <CircleAlert className="size-4 text-destructive" aria-hidden />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium">{entry.fileName}</span>
        <span className="block text-xs text-muted-foreground">
          {entry.state === "queued" && t("queued")}
          {entry.state === "uploading" && t("uploading", { percent: Math.round(entry.progress * 100) })}
          {entry.state === "adding" && t("adding")}
          {entry.state === "failed" && (entry.error ?? t("failed"))}
          {outcome === "CREATED" && (entry.mode === "contribution" ? t("contributed") : t("created"))}
          {outcome === "REJECTED" && t("rejected", { message: entry.result?.message ?? "" })}
          {outcome === "DUPLICATE" && (
            <>
              {entry.result?.existingAlbumTitle ? t("duplicateIn", { album: entry.result.existingAlbumTitle }) : t("duplicate")}
              {entry.result?.existingItemId && (
                <>{" "}<Link href={`/items/${entry.result.existingItemId}`} className="text-primary hover:text-primary/80">{t("showExisting")}</Link></>
              )}
            </>
          )}
        </span>
        {entry.state === "uploading" && (
          <span className="mt-1 block h-1 w-full overflow-hidden rounded bg-muted" aria-hidden>
            <span className="block h-full bg-primary transition-[width]" style={{ width: `${Math.round(entry.progress * 100)}%` }} />
          </span>
        )}
      </span>
    </li>
  );
}

/**
 * The uploads to one album, on its page.
 */
export function UploadList({ albumId }: { albumId: string }) {
  const t = useTranslations("Uploads");
  const { entries, clearFinished } = useUploads();
  const mine = entries.filter(entry => entry.albumId === albumId);

  if (mine.length === 0) {
    return null;
  }
  return (
    <section aria-labelledby="upload-list" className="space-y-2 rounded-lg border p-3">
      <div className="flex items-center justify-between gap-2">
        <h2 id="upload-list" className="text-sm font-semibold">{t("title")}</h2>
        {mine.some(entry => !isActive(entry)) &&
          <Button variant="ghost" size="sm" onClick={clearFinished}>{t("clearFinished")}</Button>}
      </div>
      <ul className="divide-y" aria-live="polite">{mine.map(entry => <UploadRow key={entry.key} entry={entry} />)}</ul>
    </section>
  );
}

/**
 * The header's button for uploads on their way, shown while there are any; it lists them all.
 */
export function UploadIndicator() {
  const t = useTranslations("Uploads");
  const { entries, clearFinished } = useUploads();
  const active = entries.filter(isActive);

  if (entries.length === 0) {
    return null;
  }

  const progress = active.length
    ? Math.round(active.reduce((sum, entry) => sum + entry.progress, 0) / active.length * 100)
    : 100;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={
        <Button variant="ghost" size="sm" aria-label={active.length ? t("activeLabel", { count: active.length, percent: progress }) : t("doneLabel")} />
      }>
        {active.length ? <Loader2 className="animate-spin" /> : <Upload />}
        <span className="tabular-nums">{active.length ? `${progress} %` : entries.length}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 max-w-[calc(100vw-2rem)]">
        <DropdownMenuGroup>
          <DropdownMenuLabel>{t("title")}</DropdownMenuLabel>
        </DropdownMenuGroup>
        <ul className="max-h-80 divide-y overflow-y-auto px-2">
          {entries.map(entry => <UploadRow key={entry.key} entry={entry} />)}
        </ul>
        {entries.some(entry => !isActive(entry)) && (
          <div className="p-2"><Button variant="outline" size="sm" className="w-full" onClick={clearFinished}>{t("clearFinished")}</Button></div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * A drop zone and file picker that queues many photos and videos for an album.
 */
export function UploadDropZone({ target, hint }: { target: UploadTarget; hint?: React.ReactNode }) {
  const t = useTranslations("Uploads");
  const { enqueue } = useUploads();
  const [over, setOver] = useState(false);
  const inputId = `upload-${target.albumId}`;

  const add = (list: FileList | null) => {
    if (list && list.length > 0) {
      enqueue(Array.from(list), target);
    }
  };

  return (
    <div
      className={`rounded-lg border-2 border-dashed p-6 text-center transition-colors ${over ? "border-primary bg-primary/5" : ""}`}
      onDragOver={event => {
        event.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={event => {
        event.preventDefault();
        setOver(false);
        add(event.dataTransfer.files);
      }}
      data-testid="upload-drop-zone"
    >
      <Upload className="mx-auto mb-2 size-8 text-muted-foreground" aria-hidden />
      <p className="text-sm">{t("drop")}</p>
      <label htmlFor={inputId} className="mt-3 inline-flex cursor-pointer items-center rounded-md border px-3 py-1.5 text-sm font-medium hover:bg-accent focus-within:ring-2 focus-within:ring-ring">
        {t("choose")}
        <input id={inputId} type="file" multiple accept="image/*,video/*,.heic,.heif,.dng,.cr2,.cr3,.nef,.arw,.orf,.raf,.rw2"
               className="sr-only" onChange={event => {
          add(event.target.files);
          event.target.value = "";
        }} />
      </label>
      {hint && <div className="mt-3 text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}
