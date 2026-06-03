import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Building2, Plus, UserPlus, RefreshCw, Loader2, Check, X, Settings, Users, Globe, ExternalLink } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";

const API_URL = import.meta.env.VITE_API_URL;

interface Module {
    id: string;
    name: string;
    module_key: string;
}

interface Company {
    id: string;
    name: string;
    cnpj?: string;
    email: string | null;
    phone: string | null;
    active: boolean;
    created_at?: string;
    modules: string[];
    delivery_slug?: string;
}

export default function SuperAdmin() {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [isCompanyDialogOpen, setIsCompanyDialogOpen] = useState(false);
    const [isEditCompanyDialogOpen, setIsEditCompanyDialogOpen] = useState(false);
    const [isAccountDialogOpen, setIsAccountDialogOpen] = useState(false);
    const [isUsersDialogOpen, setIsUsersDialogOpen] = useState(false);
    const [isEditUserDialogOpen, setIsEditUserDialogOpen] = useState(false);
    const [selectedCompanyId, setSelectedCompanyId] = useState("");
    const [editingCompany, setEditingCompany] = useState<Company | null>(null);
    const [editingUser, setEditingUser] = useState<any | null>(null);

    // Module Selection State
    const [selectedModules, setSelectedModules] = useState<string[]>([]);
    const [editModules, setEditModules] = useState<string[]>([]);

    const { data: companies = [], isLoading, refetch } = useQuery<Company[]>({
        queryKey: ["super-companies"],
        queryFn: async () => {
            const response = await fetch(`${API_URL}/superadmin/companies`, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
                },
            });
            if (!response.ok) throw new Error("Falha ao carregar empresas");
            return response.json();
        },
    });

    const { data: availableModules = [] } = useQuery<Module[]>({
        queryKey: ["system-modules"],
        queryFn: async () => {
            const response = await fetch(`${API_URL}/superadmin/modules`, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
                },
            });
            if (!response.ok) throw new Error("Falha ao carregar módulos");
            return response.json();
        },
    });

    const { data: companyUsers = [], isLoading: isLoadingUsers, refetch: refetchUsers } = useQuery<any[]>({
        queryKey: ["company-users", selectedCompanyId],
        queryFn: async () => {
            if (!selectedCompanyId) return [];
            const response = await fetch(`${API_URL}/superadmin/companies/${selectedCompanyId}/users`, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
                },
            });
            if (!response.ok) throw new Error("Falha ao carregar usuários");
            return response.json();
        },
        enabled: isUsersDialogOpen && !!selectedCompanyId,
        staleTime: 0,
        gcTime: 0,
    });

    const createCompanyMutation = useMutation({
        mutationFn: async (data: any) => {
            const response = await fetch(`${API_URL}/superadmin/companies`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
                },
                body: JSON.stringify(data),
            });
            if (!response.ok) throw new Error("Erro ao criar empresa");
            return response.json();
        },
        onSuccess: () => {
            toast({ title: "Sucesso", description: "Empresa criada com sucesso" });
            queryClient.invalidateQueries({ queryKey: ["super-companies"] });
            setIsCompanyDialogOpen(false);
        },
    });

    const updateCompanyMutation = useMutation({
        mutationFn: async ({ id, data }: { id: string; data: any }) => {
            const response = await fetch(`${API_URL}/superadmin/companies/${id}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
                },
                body: JSON.stringify(data),
            });
            if (!response.ok) throw new Error("Erro ao atualizar empresa");
            return response.json();
        },
        onSuccess: () => {
            toast({ title: "Sucesso", description: "Empresa atualizada" });
            queryClient.invalidateQueries({ queryKey: ["super-companies"] });
            setIsEditCompanyDialogOpen(false);
        },
    });

    const deleteCompanyMutation = useMutation({
        mutationFn: async (id: string) => {
            const response = await fetch(`${API_URL}/superadmin/companies/${id}`, {
                method: "DELETE",
                headers: {
                    Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
                },
            });

            const contentType = response.headers.get("content-type");
            if (contentType && contentType.includes("application/json")) {
                const result = await response.json();
                if (!response.ok) throw new Error(result.message || "Erro ao excluir empresa");
                return result;
            } else {
                const text = await response.text();
                console.error("Non-JSON response:", text);
                if (!response.ok) throw new Error(`Erro do servidor (${response.status})`);
                return { message: "Empresa excluída com sucesso (sem resposta JSON)" };
            }
        },
        onSuccess: (data) => {
            toast({ title: "Excluída", description: data.message });
            queryClient.invalidateQueries({ queryKey: ["super-companies"] });
        },
        onError: (error: any) => {
            toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" });
        }
    });

    const deleteUserMutation = useMutation({
        mutationFn: async (userId: string) => {
            const response = await fetch(`${API_URL}/superadmin/users/${userId}`, {
                method: "DELETE",
                headers: {
                    Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
                },
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.message || "Erro ao remover usuário");
            return result;
        },
        onSuccess: () => {
            toast({ title: "Removido", description: "Usuário removido da empresa" });
            queryClient.invalidateQueries({ queryKey: ["company-users"] });
        },
        onError: (error: any) => {
            toast({ title: "Erro", description: error.message, variant: "destructive" });
        }
    });

    const updateUserMutation = useMutation({
        mutationFn: async ({ id, data }: { id: string; data: any }) => {
            const response = await fetch(`${API_URL}/superadmin/users/${id}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
                },
                body: JSON.stringify(data),
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.message || "Erro ao atualizar usuário");
            return result;
        },
        onSuccess: () => {
            toast({ title: "Sucesso", description: "Usuário atualizado com sucesso!" });
            queryClient.invalidateQueries({ queryKey: ["company-users"] });
            setIsEditUserDialogOpen(false);
        },
        onError: (error: any) => {
            toast({
                title: "Falha ao Salvar",
                description: error.message,
                variant: "destructive"
            });
        }
    });

    const createAccountMutation = useMutation({
        mutationFn: async (data: any) => {
            const response = await fetch(`${API_URL}/superadmin/accounts`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
                },
                body: JSON.stringify(data),
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.message || "Erro ao criar conta");
            return result;
        },
        onSuccess: () => {
            toast({ title: "Sucesso", description: "Conta administrativa criada" });
            queryClient.invalidateQueries({ queryKey: ["company-users"] });
            setIsAccountDialogOpen(false);
        },
        onError: (error: any) => {
            toast({ title: "Erro", description: error.message, variant: "destructive" });
        }
    });

    const handleCreateCompany = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const data = {
            ...Object.fromEntries(formData),
            modules: selectedModules
        };
        createCompanyMutation.mutate(data);
    };

    const handleCreateAccount = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const data = {
            ...Object.fromEntries(formData),
            company_id: selectedCompanyId,
        };
        createAccountMutation.mutate(data);
    };

    const handleUpdateCompany = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!editingCompany) return;
        const formData = new FormData(e.currentTarget);
        const data = Object.fromEntries(formData);
        updateCompanyMutation.mutate({
            id: editingCompany.id,
            data: {
                ...data,
                active: data.active === "true",
                modules: editModules
            }
        });
    };

    const handleUpdateUser = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!editingUser) return;

        try {
            const formData = new FormData(e.currentTarget);
            const data = Object.fromEntries(formData);
            await updateUserMutation.mutateAsync({ id: editingUser.id, data });
        } catch (err) {
            // Erro já tratado pelo onError da mutation
        }
    };

    return (
        <div className="container mx-auto p-6 space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Painel Super Admin</h1>
                    <p className="text-muted-foreground">Gerenciamento de empresas e acessos do software</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => refetch()} disabled={isLoading}>
                        <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
                        Atualizar
                    </Button>
                    <Dialog open={isCompanyDialogOpen} onOpenChange={setIsCompanyDialogOpen}>
                        <DialogTrigger asChild>
                            <Button>
                                <Plus className="mr-2 h-4 w-4" />
                                Nova Empresa
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <form onSubmit={handleCreateCompany}>
                                <DialogHeader>
                                    <DialogTitle>Cadastrar Nova Empresa</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4 py-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="name">Nome da Empresa</Label>
                                        <Input id="name" name="name" required placeholder="Ex: Bebidas 24h" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="cnpj">CNPJ</Label>
                                        <Input id="cnpj" name="cnpj" placeholder="00.000.000/0000-00" />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="email">E-mail</Label>
                                            <Input id="email" name="email" type="email" placeholder="empresa@exemplo.com" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="phone">Telefone</Label>
                                            <Input id="phone" name="phone" placeholder="(00) 00000-0000" />
                                        </div>
                                    </div>

                                    <div className="space-y-3 pt-2">
                                        <Label>Módulos Ativos</Label>
                                        <div className="grid grid-cols-2 gap-3 border rounded-md p-3 bg-muted/30">
                                            {availableModules.map((module) => (
                                                <div key={module.id} className="flex items-center space-x-2">
                                                    <Checkbox
                                                        id={`new-mod-${module.module_key}`}
                                                        checked={selectedModules.includes(module.module_key)}
                                                        onCheckedChange={(checked) => {
                                                            if (checked) {
                                                                setSelectedModules([...selectedModules, module.module_key]);
                                                            } else {
                                                                setSelectedModules(selectedModules.filter(m => m !== module.module_key));
                                                            }
                                                        }}
                                                    />
                                                    <label
                                                        htmlFor={`new-mod-${module.module_key}`}
                                                        className="text-sm font-medium leading-none cursor-pointer"
                                                    >
                                                        {module.name}
                                                    </label>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button type="submit" disabled={createCompanyMutation.isPending}>
                                        {createCompanyMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        Criar Empresa
                                    </Button>
                                </DialogFooter>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total de Empresas</CardTitle>
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{companies.length}</div>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Listagem de Empresas</CardTitle>
                    <CardDescription>Gerencie o acesso de cada cliente cadastrado no sistema</CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex justify-center p-8">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Empresa</TableHead>
                                    <TableHead>CNPJ</TableHead>
                                    <TableHead>E-mail / Contato</TableHead>
                                    <TableHead>Link Delivery</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Criada em</TableHead>
                                    <TableHead className="text-right">Ações</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {companies.map((company) => (
                                    <TableRow key={company.id}>
                                        <TableCell className="font-medium">{company.name}</TableCell>
                                        <TableCell>{company.cnpj || "—"}</TableCell>
                                        <TableCell>
                                            <div className="text-xs">{company.email}</div>
                                            <div className="text-xs text-muted-foreground">{company.phone}</div>
                                        </TableCell>

                                        <TableCell>
                                            {company.delivery_slug ? (
                                                <a
                                                    href={`${window.location.origin}/delivery/${company.delivery_slug}`}
                                                    target="_blank"
                                                    className="flex items-center text-xs text-primary hover:underline"
                                                >
                                                    <Globe className="h-3 w-3 mr-1" />
                                                    /{company.delivery_slug}
                                                    <ExternalLink className="h-2 w-2 ml-1" />
                                                </a>
                                            ) : (
                                                <span className="text-muted-foreground italic text-xs">—</span>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {company.active ? (
                                                <Badge className="bg-emerald-500 hover:bg-emerald-600">Ativa</Badge>
                                            ) : (
                                                <Badge variant="destructive">Bloqueada</Badge>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-xs">
                                            {company.created_at ? new Date(company.created_at).toLocaleDateString("pt-BR") : "—"}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => {
                                                        setEditingCompany(company);
                                                        setEditModules(company.modules || []);
                                                        setIsEditCompanyDialogOpen(true);
                                                    }}
                                                >
                                                    <Settings className="h-4 w-4 mr-1" />
                                                    Editar
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => {
                                                        queryClient.removeQueries({ queryKey: ["company-users"] });
                                                        setSelectedCompanyId(company.id);
                                                        setIsUsersDialogOpen(true);
                                                    }}
                                                >
                                                    <Users className="h-4 w-4 mr-1" />
                                                    Usuários
                                                </Button>
                                                <Button
                                                    variant="default"
                                                    size="sm"
                                                    onClick={() => {
                                                        setSelectedCompanyId(company.id);
                                                        setIsAccountDialogOpen(true);
                                                    }}
                                                >
                                                    <UserPlus className="h-4 w-4 mr-1" />
                                                    Novo Acesso
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                                    onClick={() => {
                                                        if (confirm(`AVISO CRÍTICO: Isso excluirá PERMANENTEMENTE a empresa "${company.name}" e TODOS os seus usuários, produtos, vendas e configurações. Deseja continuar?`)) {
                                                            deleteCompanyMutation.mutate(company.id);
                                                        }
                                                    }}
                                                    disabled={deleteCompanyMutation.isPending}
                                                >
                                                    <X className="h-4 w-4 mr-1" />
                                                    Excluir
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            <Dialog open={isAccountDialogOpen} onOpenChange={setIsAccountDialogOpen}>
                <DialogContent>
                    <form onSubmit={handleCreateAccount}>
                        <DialogHeader>
                            <DialogTitle>Gerar Conta Administrativa</DialogTitle>
                            <DialogDescription>
                                Crie o login inicial para a empresa gerenciar seu próprio sistema.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label htmlFor="admin_name">Nome Completo</Label>
                                <Input id="admin_name" name="full_name" required placeholder="João da Silva" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="admin_email">E-mail de Login</Label>
                                <Input id="admin_email" name="email" type="email" required placeholder="admin@empresa.com" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="admin_password">Senha Inicial</Label>
                                <Input id="admin_password" name="password" type="password" required />
                            </div>
                            <div className="space-y-2 border-t pt-4">
                                <Label htmlFor="admin_discount" className="text-blue-600 font-bold">Desconto Máximo (%)</Label>
                                <Input id="admin_discount" name="max_discount" type="number" step="0.1" defaultValue={100} />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="submit" disabled={createAccountMutation.isPending}>
                                {createAccountMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Criar Conta de Acesso
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <Dialog open={isEditCompanyDialogOpen} onOpenChange={setIsEditCompanyDialogOpen}>
                <DialogContent>
                    <form onSubmit={handleUpdateCompany}>
                        <DialogHeader>
                            <DialogTitle>Editar Empresa</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label htmlFor="edit_name">Nome da Empresa</Label>
                                <Input id="edit_name" name="name" defaultValue={editingCompany?.name} required />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="edit_cnpj">CNPJ</Label>
                                <Input id="edit_cnpj" name="cnpj" defaultValue={editingCompany?.cnpj} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="edit_status">Status</Label>
                                <select
                                    name="active"
                                    id="edit_status"
                                    className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm"
                                    defaultValue={editingCompany?.active ? "true" : "false"}
                                >
                                    <option value="true">Ativa</option>
                                    <option value="false">Bloqueada</option>
                                </select>
                            </div>

                            <div className="space-y-3 pt-2">
                                <Label>Módulos Ativos</Label>
                                <div className="grid grid-cols-2 gap-3 border rounded-md p-3 bg-muted/30">
                                    {availableModules.map((module) => (
                                        <div key={module.id} className="flex items-center space-x-2">
                                            <Checkbox
                                                id={`edit-mod-${module.module_key}`}
                                                checked={editModules.includes(module.module_key)}
                                                onCheckedChange={(checked) => {
                                                    if (checked) {
                                                        setEditModules([...editModules, module.module_key]);
                                                    } else {
                                                        setEditModules(editModules.filter(m => m !== module.module_key));
                                                    }
                                                }}
                                            />
                                            <label
                                                htmlFor={`edit-mod-${module.module_key}`}
                                                className="text-sm font-medium leading-none cursor-pointer"
                                            >
                                                {module.name}
                                            </label>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="submit" disabled={updateCompanyMutation.isPending}>
                                {updateCompanyMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Salvar Alterações
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <Dialog open={isUsersDialogOpen} onOpenChange={setIsUsersDialogOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Usuários da Empresa</DialogTitle>
                        <DialogDescription>Gerencie quem tem acesso a esta empresa</DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        {isLoadingUsers ? (
                            <div className="flex justify-center p-4"><Loader2 className="h-6 w-6 animate-spin" /></div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Nome</TableHead>
                                        <TableHead>E-mail</TableHead>
                                        <TableHead>Nível</TableHead>
                                        <TableHead className="text-right">Ação</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {companyUsers.map((user) => (
                                        <TableRow key={user.id}>
                                            <TableCell className="text-sm">{user.full_name || "—"}</TableCell>
                                            <TableCell className="text-sm">{user.email}</TableCell>
                                            <TableCell><Badge variant="outline">{user.roles || "Operador"}</Badge></TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-1">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-7 w-7 p-0"
                                                        onClick={() => {
                                                            setEditingUser(user);
                                                            setIsEditUserDialogOpen(true);
                                                        }}
                                                    >
                                                        <Settings className="h-3.5 w-3.5" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="text-destructive h-7 w-7 p-0"
                                                        onClick={() => {
                                                            if (confirm("Remover este acesso permanentemente?")) {
                                                                deleteUserMutation.mutate(user.id);
                                                            }
                                                        }}
                                                    >
                                                        <X className="h-3.5 w-3.5" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {companyUsers.length === 0 && (
                                        <TableRow><TableCell colSpan={4} className="text-center py-4 text-muted-foreground">Nenhum usuário cadastrado.</TableCell></TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog open={isEditUserDialogOpen} onOpenChange={setIsEditUserDialogOpen}>
                <DialogContent>
                    <form onSubmit={handleUpdateUser}>
                        <DialogHeader>
                            <DialogTitle>Editar Usuário</DialogTitle>
                            <DialogDescription>Altere os dados de acesso do usuário selecionado.</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label htmlFor="edit_user_name">Nome Completo</Label>
                                <Input id="edit_user_name" name="full_name" defaultValue={editingUser?.full_name} required />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="edit_user_email">E-mail</Label>
                                <Input id="edit_user_email" name="email" type="email" defaultValue={editingUser?.email} required />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="edit_user_phone">Telefone</Label>
                                <Input id="edit_user_phone" name="phone" defaultValue={editingUser?.phone} />
                            </div>
                            <div className="space-y-2 border-t pt-4">
                                <Label htmlFor="edit_user_pass">Nova Senha (deixe vazio para manter)</Label>
                                <Input id="edit_user_pass" name="password" type="password" />
                            </div>
                            <div className="space-y-2 border-t pt-4">
                                <Label htmlFor="edit_user_discount" className="text-blue-600 font-bold">Desconto Máximo (%)</Label>
                                <Input id="edit_user_discount" name="max_discount" type="number" step="0.1" defaultValue={editingUser?.max_discount || 100} />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="submit" disabled={updateUserMutation.isPending}>
                                {updateUserMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Salvar Usuário
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
