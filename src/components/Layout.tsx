import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Sidebar, SidebarBody, SidebarLink, useSidebar } from '@/components/ui/sidebar';
import { AnimatedThemeToggler } from '@/components/ui/animated-theme-toggler';
import {
  LayoutDashboard,
  Calculator,
  PieChart,
  History,
  Settings,
  Sparkles,
  Sun,
  Moon,
  LogOut,
  Shield,
  CloudLightning,
  FileText,
  BookOpen,
  Activity,
  Grid3X3
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'motion/react';
import { isUserAdmin } from '@/lib/constants';

interface LayoutProps {
  children: React.ReactNode;
}

const SidebarSection = ({ title, children }: { title: string; children: React.ReactNode }) => {
  const { open, animate } = useSidebar();
  return (
    <div className="mb-4">
      <motion.div
        animate={{
          opacity: animate ? (open ? 1 : 0) : 1,
          height: animate ? (open ? "auto" : 0) : "auto",
          marginBottom: animate ? (open ? 8 : 0) : 8
        }}
        className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-2 overflow-hidden truncate h-6"
      >
        {title}
      </motion.div>
      <div className="flex flex-col gap-1">
        {children}
      </div>
    </div>
  );
};

const Logo = () => {
  return (
    <div className="flex items-center gap-2 font-normal text-sm text-black py-1 relative z-20">
      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-green to-emerald-600 flex items-center justify-center shadow-lg shadow-brand-green/20 overflow-hidden relative shrink-0">
        <Sparkles className="w-5 h-5 text-white" />
      </div>
      <motion.span
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="font-bold text-slate-900 dark:text-white whitespace-pre"
      >
        CleanDevis
      </motion.span>
    </div>
  );
};

const LogoIcon = () => {
  return (
    <div className="flex items-center gap-2 font-normal text-sm text-black py-1 relative z-20">
      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-green to-emerald-600 flex items-center justify-center shadow-lg shadow-brand-green/20 overflow-hidden relative shrink-0">
        <Sparkles className="w-5 h-5 text-white" />
      </div>
    </div>
  );
};

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [open, setOpen] = useState(false);
  const location = useLocation();

  // Theme logic is handled by AnimatedThemeToggler

  /* Structured Link Groups */
  const linkGroups = [
    {
      title: "Navigation",
      items: [
        { label: "Accueil", href: "/", icon: <LayoutDashboard className="h-5 w-5 shrink-0" /> },
        { label: "Historique", href: "/history", icon: <History className="h-5 w-5 shrink-0" /> },
      ]
    },
    {
      title: "Chiffrage",
      items: [
        { label: "Calculateur", href: "/calculator", icon: <Calculator className="h-5 w-5 shrink-0" /> },
        { label: "Matrices", href: "/matrix", icon: <Grid3X3 className="h-5 w-5 shrink-0" /> },
        { label: "Devis", href: "/devis", icon: <CloudLightning className="h-5 w-5 shrink-0" /> },
        { label: "Modèles", href: "/templates", icon: <FileText className="h-5 w-5 shrink-0" /> },
      ]
    },
    {
      title: "Paramètres",
      items: [
        { label: "Configuration", href: "/settings", icon: <Settings className="h-5 w-5 shrink-0" /> },
        { label: "Guide", href: "/guide", icon: <BookOpen className="h-5 w-5 shrink-0" /> },
        { label: "Journal", href: "/changelog", icon: <Activity className="h-5 w-5 shrink-0" /> },
      ]
    }
  ];

  // Add Admin link if user is admin
  const [isAdmin, setIsAdmin] = useState(false);

  React.useEffect(() => {
    const checkAdmin = async () => {
      const { supabase } = await import('@/lib/supabaseClient');
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.email) {
        if (isUserAdmin(session.user.email)) {
          setIsAdmin(true);
        }
      }
    };
    checkAdmin();
  }, []);

  if (isAdmin) {
    linkGroups[2].items.push({
      label: "Administration",
      href: "/admin",
      icon: <Shield className="text-red-500 h-5 w-5 shrink-0" />
    });
  }

  return (
    <div className={cn(
      "flex flex-col md:flex-row bg-slate-50 dark:bg-brand-dark w-full flex-1 mx-auto overflow-hidden",
      "h-screen"
    )}>
      <Sidebar open={open} setOpen={setOpen}>
        <SidebarBody className="justify-between gap-10">
          <div className="flex flex-1 flex-col overflow-x-hidden overflow-y-auto">
            {open ? <Logo /> : <LogoIcon />}
            <div className="mt-8 flex flex-col gap-6">
              {linkGroups.map((group, idx) => (
                <SidebarSection key={idx} title={group.title}>
                  {group.items.map(link => (
                    <SidebarLink key={link.href} link={link} />
                  ))}
                </SidebarSection>
              ))}
            </div>
          </div>
          <div>
            <div className="flex items-center justify-start gap-2 group/sidebar py-2">
              <AnimatedThemeToggler />
              <motion.span
                animate={{
                  display: open ? "inline-block" : "none",
                  opacity: open ? 1 : 0,
                }}
                className="text-neutral-700 dark:text-neutral-200 text-sm transition duration-150 whitespace-pre inline-block !p-0 !m-0"
              >
                Changer de Thème
              </motion.span>
            </div>

            <SidebarLink
              link={{
                label: "Déconnexion",
                href: "#",
                icon: (
                  <LogOut className="h-5 w-5 shrink-0" />
                ),
                onClick: async () => {
                  const { supabase } = await import('@/lib/supabaseClient');
                  await supabase.auth.signOut();
                  // The ProtectedRoute will detect the session change and redirect
                }
              }}
            />
          </div>
        </SidebarBody>
      </Sidebar>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        <div className="flex-1 overflow-y-auto p-4 lg:p-8 scroll-smooth">
          <div className="max-w-7xl mx-auto pb-20">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
};