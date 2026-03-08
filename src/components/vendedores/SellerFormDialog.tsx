import { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

interface SellerFormDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSave: (data: any) => void;
    initialData?: any;
}

export function SellerFormDialog({
    open,
    onOpenChange,
    onSave,
    initialData,
}: SellerFormDialogProps) {
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        phone: "",
        commission_percentage: 0,
        active: true,
    });

    useEffect(() => {
        if (initialData) {
            setFormData({
                name: initialData.name || "",
                email: initialData.email || "",
                phone: initialData.phone || "",
                commission_percentage: Number(initialData.commission_percentage) || 0,
                active: Boolean(initialData.active),
            });
        } else {
            setFormData({
                name: "",
                email: "",
                phone: "",
                commission_percentage: 0,
                active: true,
            });
        }
    }, [initialData, open]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(formData);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>
                        {initialData ? "Editar Vendedor" : "Novo Vendedor"}
                    </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">Nome Completo *</Label>
                        <Input
                            id="name"
                            value={formData.name}
                            onChange={(e) =>
                                setFormData({ ...formData, name: e.target.value })
                            }
                            placeholder="Ex: João Silva"
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                            id="email"
                            type="email"
                            value={formData.email}
                            onChange={(e) =>
                                setFormData({ ...formData, email: e.target.value })
                            }
                            placeholder="vendedor@email.com"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="phone">Telefone</Label>
                            <Input
                                id="phone"
                                value={formData.phone}
                                onChange={(e) =>
                                    setFormData({ ...formData, phone: e.target.value })
                                }
                                placeholder="(00) 00000-0000"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="commission">Comissão %</Label>
                            <Input
                                id="commission"
                                type="number"
                                step="0.01"
                                value={formData.commission_percentage}
                                onChange={(e) =>
                                    setFormData({ ...formData, commission_percentage: Number(e.target.value) })
                                }
                                placeholder="0,00"
                            />
                        </div>
                    </div>
                    <div className="flex items-center space-x-2 pt-2">
                        <Switch
                            id="active"
                            checked={formData.active}
                            onCheckedChange={(checked) =>
                                setFormData({ ...formData, active: checked })
                            }
                        />
                        <Label htmlFor="active">Vendedor Ativo</Label>
                    </div>

                    <DialogFooter className="pt-4">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                        >
                            Cancelar
                        </Button>
                        <Button type="submit">
                            {initialData ? "Salvar Alterações" : "Cadastrar Vendedor"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
