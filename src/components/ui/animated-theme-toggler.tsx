"use client";

import { Moon, Sun } from "lucide-react";
import { motion } from "motion/react";
import { useState, useEffect } from "react";

export function AnimatedThemeToggler() {
    const [isDarkMode, setIsDarkMode] = useState(false);

    useEffect(() => {
        if (typeof window !== "undefined") {
            const isDark = document.documentElement.classList.contains("dark");
            setIsDarkMode(isDark);
        }
    }, []);

    const toggleTheme = () => {
        const newMode = !isDarkMode;
        setIsDarkMode(newMode);
        if (newMode) {
            document.documentElement.classList.add("dark");
            localStorage.setItem("theme", "dark");
        } else {
            document.documentElement.classList.remove("dark");
            localStorage.setItem("theme", "light");
        }
    };

    return (
        <button
            onClick={toggleTheme}
            className="relative inline-flex items-center justify-center p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            aria-label="Toggle Theme"
        >
            <div className="relative w-6 h-6">
                <motion.div
                    initial={false}
                    animate={{
                        scale: isDarkMode ? 0 : 1,
                        rotate: isDarkMode ? 90 : 0,
                        opacity: isDarkMode ? 0 : 1,
                    }}
                    transition={{ duration: 0.2, ease: "easeInOut" }}
                    className="absolute inset-0 flex items-center justify-center"
                >
                    <Sun className="w-6 h-6 text-orange-500 fill-orange-500" />
                </motion.div>
                <motion.div
                    initial={false}
                    animate={{
                        scale: isDarkMode ? 1 : 0,
                        rotate: isDarkMode ? 0 : -90,
                        opacity: isDarkMode ? 1 : 0,
                    }}
                    transition={{ duration: 0.2, ease: "easeInOut" }}
                    className="absolute inset-0 flex items-center justify-center"
                >
                    <Moon className="w-6 h-6 text-brand-blue fill-brand-blue" />
                </motion.div>
            </div>
        </button>
    );
}
