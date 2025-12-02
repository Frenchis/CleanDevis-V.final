import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { Loader2 } from 'lucide-react';
import { useToast } from './ui/Toast';

export const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
    const [loading, setLoading] = useState(true);
    const [authenticated, setAuthenticated] = useState(false);
    const location = useLocation();
    const toast = useToast();

    useEffect(() => {
        const checkAuth = async () => {
            const { data: { session } } = await supabase.auth.getSession();

            if (session?.user) {
                const email = session.user.email || '';
                // Check for allowed domains/emails
                if (email.endsWith('@clean-concept.fr') || email === 'jules.boullier@gmail.com' || email === 'jules.boullier@audencia.com' || email === 'jules.boullier@gmal.com') {
                    setAuthenticated(true);
                } else {
                    // User logged in but not authorized
                    await supabase.auth.signOut();
                    setAuthenticated(false);
                    toast.error("Accès non autorisé. Seuls les emails @clean-concept.fr sont acceptés.");
                }
            } else {
                setAuthenticated(false);
            }
            setLoading(false);
        };

        checkAuth();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
            if (session?.user) {
                const email = session.user.email || '';
                if (email.endsWith('@clean-concept.fr') || email === 'jules.boullier@gmail.com' || email === 'jules.boullier@audencia.com') {
                    setAuthenticated(true);
                } else {
                    setAuthenticated(false);
                }
            } else {
                setAuthenticated(false);
            }
            setLoading(false);
        });

        return () => subscription.unsubscribe();
    }, []);

    if (loading) {
        return (
            <div className="h-screen w-full flex items-center justify-center bg-slate-50 dark:bg-slate-950">
                <Loader2 className="w-8 h-8 animate-spin text-brand-blue" />
            </div>
        );
    }

    if (!authenticated) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    return <>{children}</>;
};
