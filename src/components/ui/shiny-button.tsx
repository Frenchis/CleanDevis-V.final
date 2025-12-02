import React from 'react';
import { cn } from '@/lib/utils';

export interface ButtonProps extends React.ComponentProps<'button'> {
    children: React.ReactNode;
    className?: string;
}

export const EyeCatchingButton_v2 = ({ className, children, ...props }: ButtonProps) => {
    return (
        <button
            {...props}
            className={cn(
                'animate-bg-shine border-[1px] rounded-xl shadow bg-[length:200%_100%] tracking-wide duration-[2200ms] px-6 py-3 font-bold transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-2',
                'dark:text-zinc-200 dark:border-zinc-800',
                'text-zinc-800 border-zinc-300',
                // Default gradients (can be overridden by className)
                'dark:bg-[linear-gradient(110deg,#09090B,45%,#27272A,55%,#09090B)]',
                'bg-[linear-gradient(110deg,#FFF,45%,#E4E4E7,55%,#FFF)]',
                className
            )}
        >
            {children}
        </button>
    );
};
