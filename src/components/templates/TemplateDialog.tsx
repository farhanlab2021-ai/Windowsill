"use client";

import { Dialog } from "@/components/ui/Dialog";
import { useOpenPage } from "@/hooks/useNavigation";
import { createPageFromTemplate } from "@/lib/templates";
import { useUI } from "@/stores/ui";
import { TemplateCards } from "./TemplateCards";

/** "New from template" dialog. Creates the page and opens it. */
export function TemplateDialog() {
  const open = useUI((s) => s.templateDialogOpen);
  const setOpen = useUI((s) => s.setTemplateDialogOpen);
  const openPage = useOpenPage();

  return (
    <Dialog open={open} onClose={() => setOpen(false)} title="New page from a template" className="w-[min(92vw,40rem)]">
      <TemplateCards
        onPick={async (template) => {
          const page = await createPageFromTemplate(template);
          setOpen(false);
          openPage(page.id);
        }}
      />
    </Dialog>
  );
}
