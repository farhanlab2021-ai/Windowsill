"use client";

import { Download, ShieldCheck, Upload } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Dialog } from "@/components/ui/Dialog";
import { useTheme } from "@/hooks/useTheme";
import { BackupError, downloadBackup, parseBackup, restoreBackup } from "@/lib/db/backup";
import { modKeyLabel } from "@/lib/platform";
import type { ThemeChoice } from "@/lib/theme";
import { useUI } from "@/stores/ui";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3 border-b border-line pb-5 last:border-0 last:pb-0">
      <h3 className="text-xs font-semibold tracking-wider text-faint uppercase">{title}</h3>
      {children}
    </section>
  );
}

const BUTTON = "inline-flex items-center gap-2 rounded-lg border border-line px-3 py-1.5 text-sm hover:bg-hover";

function ThemePicker() {
  const { choice, setTheme } = useTheme();
  const options: { id: ThemeChoice; label: string }[] = [
    { id: "light", label: "Light" },
    { id: "dark", label: "Dark" },
    { id: "system", label: "Match system" },
  ];
  return (
    <div role="radiogroup" aria-label="Theme" className="grid grid-cols-3 gap-1 rounded-lg bg-hover p-1">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          role="radio"
          aria-checked={choice === o.id}
          onClick={() => setTheme(o.id)}
          className={`rounded-md py-1.5 text-sm ${choice === o.id ? "bg-surface font-medium shadow-sm" : "text-muted"}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function StorageSafety() {
  const [persisted, setPersisted] = useState<boolean | null>(null);
  useEffect(() => {
    void navigator.storage?.persisted?.().then(setPersisted);
  }, []);
  if (persisted === null) return null;
  return persisted ? (
    <p className="flex items-center gap-2 text-sm text-muted">
      <ShieldCheck className="size-4 text-accent" /> Your browser will keep this data until you clear it yourself.
    </p>
  ) : (
    <div className="space-y-2">
      <p className="text-sm text-muted">
        Browsers may clear website data when the device runs low on space. You can ask yours to keep Windowsill&apos;s
        data safe (installing the app usually does this too).
      </p>
      <button type="button" className={BUTTON} onClick={async () => setPersisted((await navigator.storage.persist?.()) ?? false)}>
        <ShieldCheck className="size-4" /> Keep my data safe
      </button>
    </div>
  );
}

function BackupControls() {
  const fileInput = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<{ text: string; error?: boolean } | null>(null);

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted">
        Your notes are stored only in this browser. Download a backup now and then — it&apos;s also how you move your notes
        to another device.
      </p>
      <div className="flex flex-wrap gap-2">
        <button type="button" className={BUTTON} onClick={() => void downloadBackup()}>
          <Download className="size-4" /> Download backup
        </button>
        <button type="button" className={BUTTON} onClick={() => fileInput.current?.click()}>
          <Upload className="size-4" /> Restore from backup…
        </button>
      </div>
      <input
        ref={fileInput}
        type="file"
        accept="application/json,.json"
        hidden
        onChange={async (e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (!file) return;
          try {
            const { pages } = await restoreBackup(parseBackup(await file.text()));
            setMessage({ text: `Restored ${pages} page${pages === 1 ? "" : "s"}. Nothing was deleted; newer versions were kept.` });
          } catch (err) {
            setMessage({ text: err instanceof BackupError ? err.message : "Sorry, that backup couldn't be restored.", error: true });
          }
        }}
      />
      {message && (
        <p role="status" className={`text-sm ${message.error ? "text-danger" : "text-accent"}`}>
          {message.text}
        </p>
      )}
    </div>
  );
}

export const SHORTCUTS: [string, string][] = [
  [`${modKeyLabel()} K`, "Search pages"],
  ["Alt N", "New page"],
  ["Alt T", "Start / pause the timer"],
  ["/", "Insert a block (in the editor)"],
  ["?", "Show this list"],
  ["Space", "Start / pause the timer (Focus Mode)"],
  ["M", "Play / pause sounds (Focus Mode)"],
  ["Esc", "Leave Focus Mode, close menus"],
];

/** Settings: theme, backups, storage safety, installing, keyboard shortcuts. */
export function SettingsDialog() {
  const open = useUI((s) => s.settingsOpen);
  const setOpen = useUI((s) => s.setSettingsOpen);

  return (
    <Dialog open={open} onClose={() => setOpen(false)} title="Settings" className="w-[min(92vw,34rem)]">
      <div className="space-y-5">
        <Section title="Appearance">
          <ThemePicker />
        </Section>
        <Section title="Your data">
          <BackupControls />
          <StorageSafety />
        </Section>
        <Section title="Install the app">
          <p className="text-sm text-muted">
            Windowsill works offline and can be installed like an app. In Chrome or Edge, use the install icon at the
            right of the address bar. On iPhone or iPad, tap Share → <em>Add to Home Screen</em>. On Android, open the
            browser menu → <em>Install app</em>.
          </p>
        </Section>
        <Section title="Keyboard shortcuts">
          <table className="w-full text-sm">
            <tbody>
              {SHORTCUTS.map(([keys, action]) => (
                <tr key={keys} className="border-t border-line first:border-0">
                  <td className="py-1.5 pr-3 whitespace-nowrap">
                    <kbd className="rounded border border-line bg-canvas px-1.5 py-0.5 font-sans text-xs">{keys}</kbd>
                  </td>
                  <td className="py-1.5 text-muted">{action}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
      </div>
    </Dialog>
  );
}
