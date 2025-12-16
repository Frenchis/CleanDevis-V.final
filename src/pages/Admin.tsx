import React, { useState, useEffect } from 'react';
import { EyeCatchingButton_v2 } from '../components/ui/shiny-button';
import { Shield, Users, Plus, Trash2, Loader2, X, Check, LogOut } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { Input } from '../components/Input';
import { useToast } from '../components/ui/Toast';
import { useConfirm } from '../components/ui/ConfirmModal';

interface User {
    id: string;
    email?: string;
    created_at: string;
    last_sign_in_at?: string;
}

export const Admin = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(false);
    const [showAddUser, setShowAddUser] = useState(false);
    const [newUserEmail, setNewUserEmail] = useState('');
    const [newUserPassword, setNewUserPassword] = useState('');
    const [creatingUser, setCreatingUser] = useState(false);

    const toast = useToast();
    const confirm = useConfirm();

    const fetchUsers = async () => {
        setLoading(true);

        // Supabase functions.invoke automatically stringifies the body if it's an object
        const { data, error } = await supabase.functions.invoke('admin-users', {
            method: 'POST',
            body: { action: 'list' }
        });

        if (error) {
            console.error('Error fetching users:', error);
            toast.error("Erreur lors du chargement des utilisateurs");
        } else if (data && data.users) {
            setUsers(data.users);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const handleDeleteUser = async (userId: string, email: string) => {
        if (!await confirm({
            title: 'Supprimer un utilisateur',
            message: `Êtes-vous sûr de vouloir supprimer l'utilisateur ${email} ?`,
            confirmText: 'Supprimer',
            type: 'danger'
        })) return;

        const { error } = await supabase.functions.invoke('admin-users', {
            method: 'DELETE',
            body: { userId }
        });

        if (error) {
            toast.error("Erreur lors de la suppression");
            console.error(error);
        } else {
            toast.success("Utilisateur supprimé");
            setUsers(prev => prev.filter(u => u.id !== userId));
        }
    };

    const handleLogoutUser = async (userId: string, email: string) => {
        if (!await confirm({
            title: 'Déconnecter un utilisateur',
            message: `Êtes-vous sûr de vouloir déconnecter l'utilisateur ${email} ? Il devra se reconnecter.`,
            confirmText: 'Déconnecter',
            type: 'warning'
        })) return;

        const { error } = await supabase.functions.invoke('admin-users', {
            method: 'POST',
            body: { action: 'logout', userId }
        });

        if (error) {
            toast.error("Erreur lors de la déconnexion");
            console.error(error);
        } else {
            toast.success("Utilisateur déconnecté (Session invalidée)");
            // Refresh info if needed, though last_sign_in won't change immediately
            fetchUsers();
        }
    };

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newUserEmail || !newUserPassword) return;

        setCreatingUser(true);
        const { data, error } = await supabase.functions.invoke('admin-users', {
            method: 'POST',
            body: { action: 'create', email: newUserEmail, password: newUserPassword }
        });

        if (error) {
            toast.error("Erreur lors de la création : " + error.message);
        } else if (data && data.error) {
            toast.error("Erreur : " + data.error);
        } else {
            toast.success("Utilisateur créé avec succès !");
            setShowAddUser(false);
            setNewUserEmail('');
            setNewUserPassword('');
            fetchUsers();
        }
        setCreatingUser(false);
    };

    return (
        <div className="p-6 max-w-[1600px] mx-auto pb-20">
            <div className="flex items-center gap-4 mb-8">
                <div className="p-3 bg-red-500/10 rounded-2xl border border-red-500/20">
                    <Shield className="w-8 h-8 text-red-500" />
                </div>
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Administration</h1>
                    <p className="text-slate-500 dark:text-slate-400">Gestion des accès et des utilisateurs</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* User Management Card */}
                <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200 dark:border-slate-700/50 rounded-3xl p-8 shadow-lg col-span-1 md:col-span-2">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <Users className="w-6 h-6 text-brand-blue" />
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Gestion des Utilisateurs</h2>
                        </div>
                        <EyeCatchingButton_v2 onClick={() => setShowAddUser(true)} className="text-white bg-brand-blue shadow-brand-blue/20">
                            <Plus className="w-4 h-4" /> Ajouter
                        </EyeCatchingButton_v2>
                    </div>

                    {loading ? (
                        <div className="flex justify-center py-10">
                            <Loader2 className="w-8 h-8 animate-spin text-brand-blue" />
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-slate-200 dark:border-slate-700 text-xs uppercase text-slate-500 font-semibold">
                                        <th className="py-3 px-4">Email</th>
                                        <th className="py-3 px-4">Créé le</th>
                                        <th className="py-3 px-4">Dernière connexion</th>
                                        <th className="py-3 px-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="text-sm">
                                    {users.map((user) => (
                                        <tr key={user.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                            <td className="py-3 px-4 font-medium text-slate-700 dark:text-slate-200">
                                                {user.email}
                                            </td>
                                            <td className="py-3 px-4 text-slate-500">
                                                {new Date(user.created_at).toLocaleDateString()}
                                            </td>
                                            <td className="py-3 px-4 text-slate-500">
                                                {user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleDateString() : '-'}
                                            </td>
                                            <td className="py-3 px-4 text-right flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => handleLogoutUser(user.id, user.email || '')}
                                                    className="p-2 text-slate-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-lg transition-colors"
                                                    title="Déconnecter (Forcer Reconnexion)"
                                                >
                                                    <LogOut className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteUser(user.id, user.email || '')}
                                                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                                    title="Supprimer"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {users.length === 0 && (
                                        <tr>
                                            <td colSpan={4} className="py-8 text-center text-slate-400 italic">
                                                Aucun utilisateur trouvé.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Stats / Info Card (Placeholder) */}
                <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200 dark:border-slate-700/50 rounded-3xl p-8 shadow-lg flex flex-col justify-center items-center text-center">
                    <div className="w-16 h-16 bg-brand-green/10 rounded-full flex items-center justify-center mb-4">
                        <Shield className="w-8 h-8 text-brand-green" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Zone Sécurisée</h3>
                    <p className="text-slate-500 dark:text-slate-400 max-w-xs">
                        Cette page est visible uniquement par <strong>jules.boullier@audencia.com</strong> et <strong>jules.boullier@gmail.com</strong>.
                    </p>
                </div>
            </div>

            {/* Add User Modal */}
            {showAddUser && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md border border-slate-200 dark:border-slate-700 p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white">Ajouter un utilisateur</h3>
                            <button onClick={() => setShowAddUser(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <form onSubmit={handleCreateUser} className="flex flex-col gap-4">
                            <Input
                                label="Email"
                                type="email"
                                value={newUserEmail}
                                onChange={(e) => setNewUserEmail(e.target.value)}
                                placeholder="exemple@clean-concept.fr"
                                required
                            />
                            <Input
                                label="Mot de passe"
                                type="password"
                                value={newUserPassword}
                                onChange={(e) => setNewUserPassword(e.target.value)}
                                placeholder="••••••••"
                                required
                                minLength={6}
                            />

                            <div className="flex justify-end gap-3 mt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowAddUser(false)}
                                    className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                                >
                                    Annuler
                                </button>
                                <EyeCatchingButton_v2 type="submit" disabled={creatingUser} className="text-white bg-brand-blue shadow-brand-blue/20">
                                    {creatingUser ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                    Créer l'utilisateur
                                </EyeCatchingButton_v2>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
