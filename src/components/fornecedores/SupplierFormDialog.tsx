import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface SupplierFormData {
    name: string;
    cnpj: string;
    phone: string;
    email: string;
    address: string;
}

interface SupplierFormDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSave: (data: SupplierFormData) => void;
}

export function SupplierFormDialog({ open, onOpenChange, onSave }: SupplierFormDialogProps) {
    const [form, setForm] = useState<SupplierFormData>({
        name: "",
        cnpj: "",
        phone: "",
        email: "",
        address: ""
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(form);
        setForm({ name: "", cnpj: "", phone: "", email: "", address: "" });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Novo Fornecedor</DialogTitle>
                    <DialogDescription>Preencha os dados do fornecedor abaixo.</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">Nome / Razão Social *</Label>
                        <Input id="name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required placeholder="Nome do fornecedor" />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="cnpj">CNPJ / CPF</Label>
                        <Input id="cnpj" value={form.cnpj} onChange={e => setForm({ ...form, cnpj: e.target.value })} placeholder="00.000.000/0000-00" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="phone">Telefone</Label>
                            <Input id="phone" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="(00) 00000-0000" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input id="email" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="contato@fornecedor.com" />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="address">Endereço</Label>
                        <Input id="address" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} placeholder="Rua, Número, Bairro..." />
                    </div>
                    <DialogFooter className="pt-4">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
                        <Button type="submit" disabled={!form.name.trim()}>Salvar Fornecedor</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
