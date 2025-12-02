import React, { ReactNode } from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    description?: string;
    errorMessage?: string;
    labelPlacement?: 'inside' | 'outside' | 'outside-left';
    startContent?: ReactNode;
    endContent?: ReactNode;
    isInvalid?: boolean;
}

export const Input: React.FC<InputProps> = ({
    label,
    description,
    errorMessage,
    labelPlacement = 'outside',
    startContent,
    endContent,
    isInvalid,
    className = '',
    id,
    ...props
}) => {
    const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;

    const baseInputClasses = `
    w-full bg-slate-50 dark:bg-slate-800 
    border border-slate-200 dark:border-slate-600 
    rounded-xl px-3 py-2 
    text-slate-900 dark:text-white 
    focus:ring-2 focus:ring-brand-blue focus:border-transparent 
    outline-none transition-all
    disabled:opacity-50 disabled:cursor-not-allowed
    ${isInvalid ? 'border-red-500 focus:ring-red-500' : ''}
    ${startContent ? 'pl-10' : ''}
    ${endContent ? 'pr-10' : ''}
    ${labelPlacement === 'inside' ? 'pt-6 pb-2' : ''}
  `;

    const renderLabel = () => {
        if (!label) return null;

        if (labelPlacement === 'inside') {
            return (
                <label
                    htmlFor={inputId}
                    className="absolute left-3 top-2 text-xs text-slate-500 dark:text-slate-400 font-medium pointer-events-none transition-all"
                >
                    {label}
                </label>
            );
        }

        return (
            <label
                htmlFor={inputId}
                className={`block text-sm font-medium text-slate-500 dark:text-slate-400 ${labelPlacement === 'outside-left' ? 'w-32 pt-2' : 'mb-2'}`}
            >
                {label}
            </label>
        );
    };

    const renderInput = () => (
        <div className={`relative ${labelPlacement === 'outside-left' ? 'flex-1' : 'w-full'}`}>
            {labelPlacement === 'inside' && renderLabel()}

            {startContent && (
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                    {startContent}
                </div>
            )}

            <input
                id={inputId}
                className={`${baseInputClasses} ${className}`}
                {...props}
            />

            {endContent && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                    {endContent}
                </div>
            )}

            {description && !errorMessage && (
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{description}</p>
            )}

            {errorMessage && (
                <p className="mt-1 text-xs text-red-500">{errorMessage}</p>
            )}
        </div>
    );

    if (labelPlacement === 'outside-left') {
        return (
            <div className="flex items-start gap-4">
                {renderLabel()}
                {renderInput()}
            </div>
        );
    }

    return (
        <div className="w-full">
            {labelPlacement === 'outside' && renderLabel()}
            {renderInput()}
        </div>
    );
};
