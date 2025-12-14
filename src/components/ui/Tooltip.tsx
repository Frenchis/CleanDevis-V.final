import React, { useState, useRef, useEffect, ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface TooltipProps {
    children: ReactNode;
    content: ReactNode;
    className?: string;
}

export const Tooltip: React.FC<TooltipProps> = ({ children, content, className = '' }) => {
    const [isVisible, setIsVisible] = useState(false);
    const [coords, setCoords] = useState({ top: 0, left: 0 });
    const triggerRef = useRef<HTMLDivElement>(null);

    const updatePosition = () => {
        if (triggerRef.current) {
            const rect = triggerRef.current.getBoundingClientRect();
            // Position above the element centered horizontally
            setCoords({
                top: rect.top - 10, // 10px spacing
                left: rect.left + rect.width / 2
            });
        }
    };

    const handleMouseEnter = () => {
        updatePosition();
        setIsVisible(true);
    };

    const handleMouseLeave = () => {
        setIsVisible(false);
    };

    useEffect(() => {
        if (isVisible) {
            window.addEventListener('scroll', updatePosition);
            window.addEventListener('resize', updatePosition);
        }
        return () => {
            window.removeEventListener('scroll', updatePosition);
            window.removeEventListener('resize', updatePosition);
        };
    }, [isVisible]);

    const tooltipContent = isVisible && (
        <div
            className="fixed z-[9999] pointer-events-none"
            style={{
                top: coords.top,
                left: coords.left,
                transform: 'translate(-50%, -100%)' // Center horizontally, position above
            }}
        >
            <div className={`bg-slate-900 text-white text-xs rounded-lg shadow-xl p-3 border border-slate-700/50 backdrop-blur-sm animate-in fade-in zoom-in-95 duration-150 ${className}`}>
                {content}
                {/* Arrow */}
                <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-slate-900/90" />
            </div>
        </div>
    );

    return (
        <>
            <div
                ref={triggerRef}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
                className="w-full h-full"
            >
                {children}
            </div>
            {typeof document !== 'undefined'
                ? createPortal(tooltipContent, document.body)
                : null}
        </>
    );
};
