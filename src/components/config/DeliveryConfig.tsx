import { useEffect, useState } from "react";
import { useDeliverySettings, useSaveDeliverySettings } from "@/hooks/useDeliverySettings";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, ImagePlus, X, Copy } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { NeighborhoodFees } from "./NeighborhoodFees";

export function DeliveryConfig() {
    const { data: settings, isLoading, refetch } = useDeliverySettings();
    const saveSettings = useSaveDeliverySettings();

    const [form, setForm] = useState({
        slug: "",
        logo_url: "",
        banner_url: "",
        primary_color: "#facc15",
        greeting_text: "Boa noite, cliente!",
        store_status: "open",
        whatsapp_number: "",
        min_order_value: 0,
        delivery_fee: 0,
    });

    useEffect(() => {
        if (settings) {
            setForm({
                ...settings,
            });
        }
    }, [settings]);

    const updateField = (key: keyof typeof form, value: string | number) => {
        setForm((prev) => ({ ...prev, [key]: value }));
    };

    const handleSave = () => {
        if (!form.slug.trim()) {
            toast.error("O campo de URL (slug) é obrigatório");
            return;
        }

        saveSettings.mutate(form, {
            onSuccess: () => {
                toast.success("Configurações do delivery validadas e atualizadas!");
                refetch();
            },
            onError: (err) => {
                toast.error(err.message);
            }
        });
    };

    const handleImageChange = (key: 'logo_url' | 'banner_url') => (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;
                const max_dim = 800;

                if (width > height && width > max_dim) {
                    height *= max_dim / width;
                    width = max_dim;
                } else if (height > max_dim) {
                    width *= max_dim / height;
                    height = max_dim;
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    ctx.drawImage(img, 0, 0, width, height);
                    const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
                    updateField(key, dataUrl);
                }
            };
            img.src = event.target?.result as string;
        };
        reader.readAsDataURL(file);
    };

    if (isLoading) {
        return (
            <Card>
                <CardContent className="flex justify-center py-10">
                    <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                </CardContent>
            </Card>
        );
    }

    const deliveryUrl = `${window.location.origin}/delivery#/${form.slug}`; // Example structure if we make slug required in the URL later. But for now it's just /delivery

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <CardTitle>Delivery</CardTitle>
                    <CardDescription>
                        Configurações da sua página de pedidos e loja virtual.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">

                    {/* Link / Dominio */}
                    <div className="space-y-2 pb-4 border-b border-gray-100">
                        <Label>Identificador do Restaurante (Slug / Link)</Label>
                        <div className="flex gap-2">
                            <div className="flex-1 flex items-center bg-gray-50 rounded-md border px-3 text-sm text-muted-foreground">
                                <span className="mr-1">{window.location.origin}/delivery/</span>
                                <input
                                    placeholder="ex: nome-do-restaurante"
                                    value={form.slug}
                                    onChange={(e) => updateField("slug", e.target.value.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, ''))}
                                    className="flex-1 bg-transparent border-none outline-none text-foreground font-semibold p-0"
                                />
                            </div>
                            <Button
                                variant="outline"
                                onClick={() => {
                                    const fullUrl = `${window.location.origin}/delivery/${form.slug}`;
                                    navigator.clipboard.writeText(fullUrl);
                                    toast.success("Link copiado!");
                                }}
                                disabled={!form.slug}
                            >
                                <Copy className="h-4 w-4 mr-2" /> Copiar Link
                            </Button>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">Este é o link que você deve enviar para seus clientes fazerem pedidos.</p>
                    </div>

                    {/* Textos e Contato */}
                    <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Texto de Saudação</Label>
                            <Input
                                value={form.greeting_text}
                                onChange={(e) => updateField("greeting_text", e.target.value)}
                                placeholder="ex: Boa noite, cliente!"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Número do WhatsApp (Com DDD e DDI)</Label>
                            <Input
                                value={form.whatsapp_number}
                                onChange={(e) => updateField("whatsapp_number", e.target.value)}
                                placeholder="ex: 5511999999999"
                            />
                        </div>
                    </div>

                    {/* Status e Valores */}
                    <div className="grid md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label>Status da Loja</Label>
                            <Select value={form.store_status} onValueChange={(v) => updateField("store_status", v)}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="open">Aberta ✅</SelectItem>
                                    <SelectItem value="closed">Fechada 🚫</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Valor Mínimo (R$)</Label>
                            <Input
                                type="number" step="0.5"
                                value={form.min_order_value || ''}
                                onChange={(e) => updateField("min_order_value", parseFloat(e.target.value) || 0)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Taxa de Entrega Padrão (R$)</Label>
                            <Input
                                type="number" step="0.5"
                                value={form.delivery_fee || ''}
                                onChange={(e) => updateField("delivery_fee", parseFloat(e.target.value) || 0)}
                            />
                        </div>
                    </div>

                    {/* Estilo (Cores e Imagens) */}
                    <div className="space-y-2 pt-4 border-t border-gray-100">
                        <h3 className="font-semibold text-sm">Visual da Loja</h3>
                        <div className="grid md:grid-cols-2 gap-6 pt-2">
                            <div className="space-y-4">
                                <div className="flex gap-4">
                                    <div className="space-y-2 flex-1">
                                        <Label>Cor Primária (HEX)</Label>
                                        <div className="flex gap-2">
                                            <Input
                                                type="color"
                                                value={form.primary_color}
                                                onChange={(e) => updateField("primary_color", e.target.value)}
                                                className="w-14 h-10 p-1 cursor-pointer"
                                            />
                                            <Input
                                                value={form.primary_color}
                                                onChange={(e) => updateField("primary_color", e.target.value)}
                                                className="flex-1 font-mono uppercase"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label>Logo da Loja</Label>
                                    <div className="flex gap-4 items-center">
                                        {form.logo_url ? (
                                            <div className="relative w-16 h-16 rounded-full overflow-hidden border">
                                                <img src={form.logo_url} className="w-full h-full object-cover" alt="Logo" />
                                                <button onClick={() => updateField('logo_url', '')} className="absolute inset-0 bg-black/50 text-white flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                                                    <X className="w-5 h-5" />
                                                </button>
                                            </div>
                                        ) : (
                                            <label className="flex w-16 h-16 cursor-pointer items-center justify-center rounded-full border-2 border-dashed border-muted-foreground/30 hover:border-primary/50 transition-colors bg-gray-50">
                                                <ImagePlus className="h-5 w-5 text-muted-foreground" />
                                                <input type="file" accept="image/*" className="hidden" onChange={handleImageChange('logo_url')} />
                                            </label>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Banner (Fundo do Cabeçalho)</Label>
                                <div className="flex flex-col gap-2">
                                    {form.banner_url ? (
                                        <div className="relative h-24 w-full rounded-md overflow-hidden border">
                                            <img src={form.banner_url} className="w-full h-full object-cover" alt="Banner" />
                                            <button onClick={() => updateField('banner_url', '')} className="absolute top-2 right-2 rounded-full bg-black/60 p-1 text-white hover:bg-destructive transition-colors">
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ) : (
                                        <label className="flex h-24 w-full cursor-pointer flex-col items-center justify-center gap-1 rounded-md border-2 border-dashed border-muted-foreground/30 hover:border-primary/50 transition-colors bg-gray-50">
                                            <ImagePlus className="h-6 w-6 text-muted-foreground" />
                                            <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Enviar Imagem</span>
                                            <input type="file" accept="image/*" className="hidden" onChange={handleImageChange('banner_url')} />
                                        </label>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                </CardContent>
                <CardFooter className="justify-end">
                    <Button onClick={handleSave} disabled={saveSettings.isPending}>
                        {saveSettings.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        Salvar Configurações
                    </Button>
                </CardFooter>
            </Card>
            <NeighborhoodFees />
        </div >
    );
}
