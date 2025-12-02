import React, { useRef, useEffect } from 'react';
import { Bold, Italic } from 'lucide-react';

interface RichTextTextareaProps {
    label?: string;
    value: string;
    onChangeValue: (value: string) => void;
    placeholder?: string;
    className?: string;
}

export const RichTextTextarea: React.FC<RichTextTextareaProps> = ({
    label,
    value,
    onChangeValue,
    placeholder,
    className = ''
}) => {
    const contentRef = useRef<HTMLDivElement>(null);

    // Sync external value to contentEditable (only if different to avoid cursor jumps)
    useEffect(() => {
        if (contentRef.current && contentRef.current.innerHTML !== value) {
            // Only update if the content is truly different (and not just focused)
            // This is tricky with contentEditable.
            // A simple approach: only set if empty or completely different,
            // but usually we don't want to reset innerHTML while typing.
            // We'll assume this is a controlled component but we only sync IN
            // if the user is NOT typing (e.g. initial load or external reset).
            // For now, let's just set it if it's empty in the ref but has value.
            if (contentRef.current.innerHTML === '' && value) {
                contentRef.current.innerHTML = value;
            } else if (document.activeElement !== contentRef.current) {
                contentRef.current.innerHTML = value;
            }
        }
    }, [value]);

    const handleInput = () => {
        if (contentRef.current) {
            onChangeValue(contentRef.current.innerHTML);
        }
    };

    const execCommand = (command: string) => {
        document.execCommand(command, false);
        if (contentRef.current) {
            contentRef.current.focus();
            onChangeValue(contentRef.current.innerHTML);
        }
    };

    return (
        <div className="w-full">
            <div className="flex justify-between items-end mb-2">
                {label && (
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
                        {label}
                    </label>
                )}
                <div className="flex gap-1">
                    <button
                        type="button"
                        onClick={() => execCommand('bold')}
                        className="p-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg text-slate-600 dark:text-slate-300 transition-colors shadow-sm"
                        title="Gras"
                    >
                        <Bold className="w-4 h-4" />
                    </button>
                    <button
                        type="button"
                        onClick={() => execCommand('italic')}
                        className="p-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg text-slate-600 dark:text-slate-300 transition-colors shadow-sm"
                        title="Italique"
                    >
                        <Italic className="w-4 h-4" />
                    </button>
                </div>
            </div>

            <div
                ref={contentRef}
                contentEditable
                onInput={handleInput}
                className={`w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green outline-none transition-all min-h-[100px] overflow-y-auto ${className}`}
                style={{ whiteSpace: 'pre-wrap' }} // Preserve newlines
                role="textbox"
                aria-multiline="true"
                aria-placeholder={placeholder}
            />
            {/* Placeholder simulation if needed, or just rely on CSS empty pseudo-class if we added it, but simple is fine */}
            {!value && (
                <div
                    className="absolute pointer-events-none text-slate-400 px-4 py-3 mt-[-100px] hidden" // Hidden for now as positioning is tricky without relative wrapper
                >
                    {placeholder}
                </div>
            )}
        </div>
    );
};
