import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { Loader2 } from 'lucide-react';
import { isUserAdmin } from '../lib/constants';

export const AdminRoute = ({ children }: { children: React.ReactNode }) => {
    const [loading, setLoading] = useState(true);
    const [isAdmin, setIsAdmin] = useState(false);
    const location = useLocation();

    useEffect(() => {
        const checkAuth = async () => {
            const { data: { session } } = await supabase.auth.getSession();

            if (session?.user) {
                setIsAdmin(isUserAdmin(session.user.email));
            } else {
                setIsAdmin(false);
            }
            setLoading(false);
        };

        checkAuth();
    }, []);

    if (loading) {
        return (
            <div className="h-screen w-full flex items-center justify-center bg-slate-50 dark:bg-slate-950">
                <Loader2 className="w-8 h-8 animate-spin text-brand-blue" />
            </div>
        );
    }

    if (!isAdmin) {
        // Redirect non-admins to dashboard (if logged in) or login (if not)
        // For simplicity, we redirect to home, which is protected, so it handles both cases gracefully
        return <Navigate to="/" replace />;
    }

    return <>{children}</>;
};
