import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { MonitorPlay } from "lucide-react";

export function PDVConfig() {
    const [showF4, setShowF4] = useState(true);
    const [showF5, setShowF5] = useState(true);
    const [showF6, setShowF6] = useState(true);

    useEffect(() => {
        setShowF4(localStorage.getItem("pdv_show_f4") !== "false");
        setShowF5(localStorage.getItem("pdv_show_f5") !== "false");
        setShowF6(localStorage.getItem("pdv_show_f6") !== "false");
    }, []);

    const handleToggle = (key: string, value: boolean, setter: (val: boolean) => void) => {
        localStorage.setItem(key, value.toString());
        setter(value);
    };

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center gap-2">
                    <MonitorPlay className="h-5 w-5 text-primary" />
                    <CardTitle>Opções de Finalização (PDV)</CardTitle>
                </div>
                <CardDescription>
                    Gerencie botões exibidos ao fechar uma venda
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex items-center justify-between border-b pb-4">
                    <div className="space-y-0.5">
                        <Label className="text-base">Exibir Botão F4 (NFC-e)</Label>
                        <p className="text-xs text-muted-foreground mr-2">Transmite e imprime cupom fiscal eletrônico.</p>
                    </div>
                    <Switch
                        checked={showF4}
                        onCheckedChange={(v) => handleToggle("pdv_show_f4", v, setShowF4)}
                    />
                </div>

                <div className="flex items-center justify-between border-b pb-4">
                    <div className="space-y-0.5">
                        <Label className="text-base">Exibir Botão F5 (Pedido)</Label>
                        <p className="text-xs text-muted-foreground mr-2">Imprime comprovante não fiscal na hora.</p>
                    </div>
                    <Switch
                        checked={showF5}
                        onCheckedChange={(v) => handleToggle("pdv_show_f5", v, setShowF5)}
                    />
                </div>

                <div className="flex items-center justify-between pb-2">
                    <div className="space-y-0.5">
                        <Label className="text-base">Exibir Botão F6 (WhatsApp)</Label>
                        <p className="text-xs text-muted-foreground mr-2">Compartilha um resumo via WhatsApp.</p>
                    </div>
                    <Switch
                        checked={showF6}
                        onCheckedChange={(v) => handleToggle("pdv_show_f6", v, setShowF6)}
                    />
                </div>
            </CardContent>
        </Card>
    );
}
