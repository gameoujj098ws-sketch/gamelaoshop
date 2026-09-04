import { useEffect, useState } from "react";
import { Download, Share2, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallAppButton() {
  const [prompt, setPrompt] = useState<InstallPromptEvent | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)").matches
      || ("standalone" in navigator && Boolean((navigator as Navigator & { standalone?: boolean }).standalone));
    setInstalled(standalone);
    const onPrompt = (event: Event) => {
      event.preventDefault();
      setPrompt(event as InstallPromptEvent);
    };
    const onInstalled = () => { setInstalled(true); setPrompt(null); };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  async function install() {
    if (!prompt) {
      setHelpOpen(true);
      return;
    }
    await prompt.prompt();
    const choice = await prompt.userChoice;
    if (choice.outcome === "accepted") setPrompt(null);
  }

  return (
    <>
      <div className="px-4 pb-3">
        <div className="rounded-2xl border border-primary/25 bg-primary/10 p-4 text-center">
          <span className="mx-auto grid size-11 place-items-center rounded-xl bg-primary text-primary-foreground">
            <Smartphone className="size-5" />
          </span>
          <h2 className="mt-2 text-base font-extrabold">Game Lao Shop App</h2>
          <p className="mt-1 text-xs text-muted-foreground">ເພີ່ມໃສ່ໜ້າຈໍມືຖື ແລະ ເປີດແບບເຕັມຈໍ</p>
          <Button className="mt-3 w-full btn-neon" disabled={installed} onClick={() => void install()}>
            <Download className="mr-2 size-4" />
            {installed ? "ຕິດຕັ້ງແລ້ວ" : "ດາວໂຫຼດ / ຕິດຕັ້ງແອັບ"}
          </Button>
        </div>
      </div>

      <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
        <DialogContent className="max-w-sm bg-surface-2 border-border">
          <DialogHeader><DialogTitle>ວິທີຕິດຕັ້ງໃນມືຖື</DialogTitle></DialogHeader>
          <div className="space-y-3 text-sm">
            <p className="flex gap-2"><Share2 className="mt-0.5 size-4 shrink-0 text-primary" /> iPhone/iPad: ກົດ Share ແລ້ວເລືອກ “Add to Home Screen”.</p>
            <p className="flex gap-2"><Download className="mt-0.5 size-4 shrink-0 text-primary" /> Android Chrome: ກົດເມນູ ⋮ ແລ້ວເລືອກ “Install app” ຫຼື “Add to Home screen”.</p>
            <p className="text-xs text-muted-foreground">ເມື່ອເປີດຈາກໄອຄອນໜ້າຈໍ ແອັບຈະສະແດງເຕັມຈໍໂດຍບໍ່ມີແຖບ browser.</p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}