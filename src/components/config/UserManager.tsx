import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2, Edit2, Loader2, UserPlus, Shield, Lock } from "lucide-react";
import { toast } from "sonner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface User {
    id: string;
    email: string;
    full_name: string;
    phone: string | null;
    roles: string[];
    permissions: string[];
    created_at: string;
}

export function UserManager() {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(false);
    const [formOpen, setFormOpen] = useState(false);
    const [permOpen, setPermOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);

    // Form states
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [fullName, setFullName] = useState("");
    const [phone, setPhone] = useState("");
    const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
    const [selectedPerms, setSelectedPerms] = useState<string[]>([]);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL}/users`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
            });
            if (response.ok) {
                setUsers(await response.json());
            }
        } catch (error) {
            toast.error("Erro ao carregar usuários");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const handleOpenForm = (user?: User) => {
        if (user) {
            setEditingUser(user);
            setEmail(user.email);
            setPassword("");
            setFullName(user.full_name);
            setPhone(user.phone || "");
            setSelectedRoles(user.roles);
        } else {
            setEditingUser(null);
            setEmail("");
            setPassword("");
            setFullName("");
            setPhone("");
            setSelectedRoles(["operador_caixa"]);
        }
        setFormOpen(true);
    };

    const handleOpenPerms = (user: User) => {
        setEditingUser(user);
        setSelectedPerms(user.permissions || []);
        setPermOpen(true);
    };

    const handleSaveUser = async () => {
        if (!email || !fullName || (!editingUser && !password)) {
            toast.error("Preencha todos os campos obrigatórios");
            return;
        }

        setLoading(true);
        const method = editingUser ? "PUT" : "POST";
        const url = editingUser
            ? `${import.meta.env.VITE_API_URL}/users/${editingUser.id}`
            : `${import.meta.env.VITE_API_URL}/users`;

        try {
            const response = await fetch(url, {
                method,
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    email,
                    password: password || undefined,
                    full_name: fullName,
                    phone,
                    roles: selectedRoles
                })
            });

            if (response.ok) {
                toast.success(editingUser ? "Usuário atualizado!" : "Usuário criado!");
                setFormOpen(false);
                fetchUsers();
            } else {
                const data = await response.json();
                toast.error(data.message || "Erro ao salvar usuário");
            }
        } catch (error) {
            toast.error("Erro na requisição");
        } finally {
            setLoading(false);
        }
    };

    const handleSavePermissions = async () => {
        if (!editingUser) return;
        setLoading(true);
        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL}/users/${editingUser.id}`, {
                method: "PUT",
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    full_name: editingUser.full_name,
                    permissions: selectedPerms
                })
            });

            if (response.ok) {
                toast.success("Permissões atualizadas!");
                setPermOpen(false);
                fetchUsers();
            } else {
                toast.error("Erro ao atualizar permissões");
            }
        } catch (error) {
            toast.error("Erro na requisição");
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteUser = async (id: string) => {
        if (!window.confirm("Tem certeza que deseja remover este usuário?")) return;

        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL}/users/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
            });

            if (response.ok) {
                toast.success("Usuário removido");
                fetchUsers();
            } else {
                toast.error("Erro ao remover");
            }
        } catch (error) {
            toast.error("Erro na requisição");
        }
    };

    const toggleRole = (role: string) => {
        setSelectedRoles(prev =>
            prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role]
        );
    };

    const togglePerm = (module: string) => {
        setSelectedPerms(prev =>
            prev.includes(module) ? prev.filter(m => m !== module) : [...prev, module]
        );
    };

    const roleLabels: Record<string, string> = {
        admin: "Administrador",
        operador_caixa: "Operador de Caixa",
        estoquista: "Estoquista"
    };

    const moduleLabels: Record<string, string> = {
        dashboard: "Dashboard / Resumo",
        pdv: "PDV (Vendas)",
        comandas: "Comandas",
        produtos: "Produtos",
        estoque: "Estoque",
        caixa: "Caixa Financeiro",
        clientes: "Clientes",
        fornecedores: "Fornecedores",
        compras: "Compras / Entrada",
        relatorios: "Relatórios",
        configuracoes: "Configurações"
    };

    return (
        <>
            <Card className="flex flex-col flex-1">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <div className="space-y-1">
                        <CardTitle className="flex items-center gap-2">
                            <Shield className="h-5 w-5 text-primary" />
                            Gerenciamento de Usuários
                        </CardTitle>
                        <CardDescription>
                            Adicione, edite e remova usuários do sistema, além de controlar suas permissões.
                        </CardDescription>
                    </div>
                    <Button onClick={() => handleOpenForm()} size="sm">
                        <UserPlus className="mr-2 h-4 w-4" /> Novo Usuário
                    </Button>
                </CardHeader>

                <CardContent className="flex-1 overflow-auto py-4">
                    {loading && users.length === 0 ? (
                        <div className="flex justify-center py-12">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Nome</TableHead>
                                    <TableHead>Email</TableHead>
                                    <TableHead>Papéis</TableHead>
                                    <TableHead className="text-right">Ações</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {users.map((u) => (
                                    <TableRow key={u.id}>
                                        <TableCell className="font-medium">{u.full_name}</TableCell>
                                        <TableCell className="text-muted-foreground">{u.email}</TableCell>
                                        <TableCell>
                                            <div className="flex flex-wrap gap-1">
                                                {u.roles.map(role => (
                                                    <Badge key={role} variant="secondary" className="text-[10px] uppercase">
                                                        {roleLabels[role] || role}
                                                    </Badge>
                                                ))}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-1">
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-primary" onClick={() => handleOpenPerms(u)} title="Editar Acessos">
                                                    <Lock className="h-4 w-4" />
                                                </Button>
                                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleOpenForm(u)} title="Editar Cadastro">
                                                    <Edit2 className="h-4 w-4" />
                                                </Button>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDeleteUser(u.id)} title="Excluir">
                                                    <Trash2 className="h-4 w-4" />
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

            <Dialog open={formOpen} onOpenChange={setFormOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>{editingUser ? "Editar Usuário" : "Novo Usuário"}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Nome Completo *</Label>
                            <Input id="name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="email">Email *</Label>
                            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password">Senha {editingUser && "(deixe em branco para não alterar)"}</Label>
                            <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="phone">Telefone</Label>
                            <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
                        </div>
                        <div className="space-y-3">
                            <Label>Papéis Principais</Label>
                            <div className="grid grid-cols-1 gap-2">
                                {Object.entries(roleLabels).map(([role, label]) => (
                                    <div key={role} className="flex items-center space-x-2">
                                        <Checkbox
                                            id={`role-${role}`}
                                            checked={selectedRoles.includes(role)}
                                            onCheckedChange={() => toggleRole(role)}
                                        />
                                        <label htmlFor={`role-${role}`} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                            {label}
                                        </label>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setFormOpen(false)}>Cancelar</Button>
                        <Button onClick={handleSaveUser} disabled={loading}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Salvar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={permOpen} onOpenChange={setPermOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Lock className="h-5 w-5" />
                            Acessos de {editingUser?.full_name}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Módulos habilitados</p>
                        <div className="grid grid-cols-1 gap-3 max-h-[50vh] overflow-auto pr-2">
                            {Object.entries(moduleLabels).map(([key, label]) => (
                                <div key={key} className="flex items-center space-x-2 rounded-lg border p-3 hover:bg-muted/50 transition-colors">
                                    <Checkbox
                                        id={`perm-${key}`}
                                        checked={selectedPerms.includes(key)}
                                        onCheckedChange={() => togglePerm(key)}
                                    />
                                    <Label htmlFor={`perm-${key}`} className="flex-1 cursor-pointer">
                                        {label}
                                    </Label>
                                </div>
                            ))}
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setPermOpen(false)}>Cancelar</Button>
                        <Button onClick={handleSavePermissions} disabled={loading}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Salvar Acessos
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
