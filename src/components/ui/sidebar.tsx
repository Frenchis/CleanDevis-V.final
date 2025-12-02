"use client";
import { cn } from "@/lib/utils";
import React, { useState, createContext, useContext } from "react";
import { AnimatePresence, motion } from "motion/react";
import { IconMenu2, IconX } from "@tabler/icons-react";

interface Links {
    label: string;
    href: string;
    icon: React.JSX.Element | React.ReactNode;
    onClick?: () => void;
}

interface SidebarContextProps {
    open: boolean;
    setOpen: React.Dispatch<React.SetStateAction<boolean>>;
    animate: boolean;
}

const SidebarContext = createContext<SidebarContextProps | undefined>(
    undefined
);

export const useSidebar = () => {
    const context = useContext(SidebarContext);
    if (!context) {
        throw new Error("useSidebar must be used within a SidebarProvider");
    }
    return context;
};

export const SidebarProvider = ({
    children,
    open: openProp,
    setOpen: setOpenProp,
    animate = true,
}: {
    children: React.ReactNode;
    open?: boolean;
    setOpen?: React.Dispatch<React.SetStateAction<boolean>>;
    animate?: boolean;
}) => {
    const [openState, setOpenState] = useState(false);

    const open = openProp !== undefined ? openProp : openState;
    const setOpen = setOpenProp !== undefined ? setOpenProp : setOpenState;

    return (
        <SidebarContext.Provider value={{ open, setOpen, animate: animate }}>
            {children}
        </SidebarContext.Provider>
    );
};

export const Sidebar = ({
    children,
    open,
    setOpen,
    animate,
}: {
    children: React.ReactNode;
    open?: boolean;
    setOpen?: React.Dispatch<React.SetStateAction<boolean>>;
    animate?: boolean;
}) => {
    return (
        <SidebarProvider open={open} setOpen={setOpen} animate={animate}>
            {children}
        </SidebarProvider>
    );
};

export const SidebarBody = (props: React.ComponentProps<typeof motion.div>) => {
    return (
        <>
            <DesktopSidebar {...props} />
            <MobileSidebar {...(props as unknown as React.ComponentProps<"div">)} />
        </>
    );
};

export const DesktopSidebar = ({
    className,
    children,
    ...props
}: React.ComponentProps<typeof motion.div>) => {
    const { open, setOpen, animate } = useSidebar();
    return (
        <>
            <motion.div
                className={cn(
                    "h-full px-4 py-4 hidden  md:flex md:flex-col bg-slate-50 dark:bg-slate-950 border-r border-slate-200 dark:border-slate-800 w-[300px] shrink-0",
                    className
                )}
                animate={{
                    width: animate ? (open ? "300px" : "80px") : "300px",
                }}
                onMouseEnter={() => setOpen(true)}
                onMouseLeave={() => setOpen(false)}
                {...props}
            >
                {children}
            </motion.div>
        </>
    );
};

export const MobileSidebar = ({
    className,
    children,
    ...props
}: React.ComponentProps<"div">) => {
    const { open, setOpen } = useSidebar();
    return (
        <>
            <div
                className={cn(
                    "h-10 px-4 py-4 flex flex-row md:hidden  items-center justify-between bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 w-full"
                )}
                {...props}
            >
                <div className="flex justify-end z-20 w-full">
                    <IconMenu2
                        className="text-neutral-800 dark:text-neutral-200"
                        onClick={() => setOpen(!open)}
                    />
                </div>
                <AnimatePresence>
                    {open && (
                        <motion.div
                            initial={{ x: "-100%", opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            exit={{ x: "-100%", opacity: 0 }}
                            transition={{
                                duration: 0.3,
                                ease: "easeInOut",
                            }}
                            className={cn(
                                "fixed h-full w-full inset-0 bg-white dark:bg-slate-950 p-10 z-[100] flex flex-col justify-between",
                                className
                            )}
                        >
                            <div
                                className="absolute right-10 top-10 z-50 text-neutral-800 dark:text-neutral-200"
                                onClick={() => setOpen(!open)}
                            >
                                <IconX />
                            </div>
                            {children}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </>
    );
};

import { Link, useLocation } from "react-router-dom";

export const SidebarLink = ({
    link,
    className,
    ...props
}: {
    link: Links;
    className?: string;
} & Omit<React.ComponentProps<typeof Link>, "to">) => {
    const { open, animate } = useSidebar();
    const location = useLocation();
    const isActive = location.pathname === link.href;

    return (
        <Link
            to={link.href}
            className={cn(
                "flex items-center justify-start gap-3 group/sidebar py-3 px-3 rounded-xl transition-all duration-200",
                isActive
                    ? "bg-brand-blue/10 dark:bg-brand-blue/20 text-brand-blue dark:text-brand-blue font-semibold shadow-sm"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200",
                className
            )}
            onClick={link.onClick}
            {...props}
        >
            <div className={cn(
                "shrink-0 transition-colors duration-200",
                isActive ? "text-brand-blue" : "text-slate-500 dark:text-slate-400 group-hover/sidebar:text-slate-700 dark:group-hover/sidebar:text-slate-200"
            )}>
                {link.icon}
            </div>

            <motion.span
                animate={{
                    display: animate ? (open ? "inline-block" : "none") : "inline-block",
                    opacity: animate ? (open ? 1 : 0) : 1,
                }}
                className="text-sm whitespace-pre inline-block !p-0 !m-0 transition-colors duration-200"
            >
                {link.label}
            </motion.span>
        </Link>
    );
};
