import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Receipt, FileText, MessageCircle } from "lucide-react";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";

interface ReceiptOptionsDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onEmitNFCe: () => void;
    onPrintReceipt: () => void;
    onWhatsApp?: () => void;
}

export function ReceiptOptionsDialog({ open, onOpenChange, onEmitNFCe, onPrintReceipt, onWhatsApp }: ReceiptOptionsDialogProps) {
    const [showF4, setShowF4] = useState(true);
    const [showF5, setShowF5] = useState(true);
    const [showF6, setShowF6] = useState(true);

    useEffect(() => {
        if (open) {
            setShowF4(localStorage.getItem("pdv_show_f4") !== "false");
            setShowF5(localStorage.getItem("pdv_show_f5") !== "false");
            setShowF6(localStorage.getItem("pdv_show_f6") !== "false");
        }
    }, [open]);

    useEffect(() => {
        if (!open) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "F4" && showF4) {
                e.preventDefault();
                onEmitNFCe();
            } else if (e.key === "F5" && showF5) {
                e.preventDefault();
                onPrintReceipt();
            } else if (e.key === "F6" && showF6 && onWhatsApp) {
                e.preventDefault();
                onWhatsApp();
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [open, onEmitNFCe, onPrintReceipt, onWhatsApp, showF4, showF5, showF6]);

    const visibleCount = [showF4, showF5, showF6].filter(Boolean).length;
    if (visibleCount === 0 && open) {
        // Fallback: auto close if everything disabled
        setTimeout(() => onOpenChange(false), 0);
        return null;
    }

    const gridCols = visibleCount === 1 ? "grid-cols-1" : visibleCount === 2 ? "grid-cols-2" : "grid-cols-3";
    const maxWidth = visibleCount === 1 ? "sm:max-w-[300px]" : visibleCount === 2 ? "sm:max-w-[450px]" : "sm:max-w-[650px]";

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className={`${maxWidth} p-8 border-0 bg-transparent shadow-none`} hideClose>
                <VisuallyHidden><DialogTitle>Opções de Impressão</DialogTitle></VisuallyHidden>
                <div className={`grid ${gridCols} gap-4 bg-transparent`}>
                    {/* F4 */}
                    {showF4 && (
                        <Button
                            onClick={onEmitNFCe}
                            variant="outline"
                            className="h-40 flex flex-col items-center justify-center gap-4 bg-[#545454] text-white hover:bg-[#636363] hover:text-white border-0 rounded-md shadow-lg"
                        >
                            <FileText className="h-14 w-14 drop-shadow-md text-white/90" />
                            <span className="text-base font-medium text-center leading-tight">F4 | NFCe Online<br />Transmitir</span>
                        </Button>
                    )}

                    {/* F5 */}
                    {showF5 && (
                        <Button
                            onClick={onPrintReceipt}
                            variant="outline"
                            className="h-40 flex flex-col items-center justify-center gap-4 bg-[#545454] text-white hover:bg-[#636363] hover:text-white border-0 rounded-md shadow-lg"
                        >
                            <Receipt className="h-14 w-14 drop-shadow-md text-white/90" />
                            <span className="text-base font-medium text-center">F5 | Pedido</span>
                        </Button>
                    )}

                    {/* F6 */}
                    {showF6 && (
                        <Button
                            onClick={onWhatsApp}
                            variant="outline"
                            className="h-40 flex flex-col items-center justify-center gap-4 bg-[#545454] text-white hover:bg-[#636363] hover:text-white border-0 rounded-md shadow-lg"
                        >
                            <MessageCircle className="h-14 w-14 drop-shadow-md text-[#25D366]" />
                            <span className="text-base font-medium text-center">F6 | WhatsApp</span>
                        </Button>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
