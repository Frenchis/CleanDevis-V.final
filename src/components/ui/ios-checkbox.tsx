import React from 'react';
import styles from './ios-checkbox.module.css';
import { cn } from '@/lib/utils';

interface IosCheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
    variant?: 'blue' | 'red' | 'green';
    className?: string;
}

export const IosCheckbox = ({ className, variant = 'blue', ...props }: IosCheckboxProps) => {
    return (
        <div className={styles.checkboxContainer}>
            <label className={cn(styles.iosCheckbox, styles[variant], className)}>
                <input type="checkbox" {...props} />
                <div className={styles.checkboxWrapper}>
                    <div className={styles.checkboxBg} />
                    <svg className={styles.checkboxIcon} viewBox="0 0 24 24" fill="none">
                        <path
                            className={styles.checkPath}
                            d="M4 12L10 18L20 6"
                            stroke="currentColor"
                            strokeWidth={3}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    </svg>
                </div>
            </label>
        </div>
    );
};
