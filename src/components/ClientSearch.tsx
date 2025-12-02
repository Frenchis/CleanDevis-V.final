import React, { useState, useEffect } from 'react';
import { Search, Loader2, Check } from 'lucide-react';
import { Input } from './Input';
import { searchClients } from '../services/sellsyService';
import { SellsyClient } from '../types';

interface ClientSearchProps {
    onSelect: (client: SellsyClient | string) => void;
    initialValue: string;
    clearOnSelect?: boolean;
    label?: string;
}

export const ClientSearch = ({ onSelect, initialValue, clearOnSelect = false, label }: ClientSearchProps) => {
    const [query, setQuery] = useState(initialValue);
    const [results, setResults] = useState<SellsyClient[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        setQuery(initialValue);
    }, [initialValue]);

    useEffect(() => {
        const delayDebounceFn = setTimeout(async () => {
            if (query.length > 2) {
                setLoading(true);
                const clients = await searchClients(query);
                setResults(clients);
                setLoading(false);
                setIsOpen(true);
            } else {
                setResults([]);
                setIsOpen(false);
            }
        }, 500);

        return () => clearTimeout(delayDebounceFn);
    }, [query]);

    const handleSelect = (client: SellsyClient) => {
        console.log("Client selected:", client);
        if (!client) return;

        const name = client.name || "Client sans nom";

        if (clearOnSelect) {
            setQuery("");
        } else {
            setQuery(name);
        }
        onSelect(client);
        setIsOpen(false);
    };

    return (
        <div className="relative">
            <div className="relative">
                <Input
                    label={label !== undefined ? label : "Client / Projet"}
                    labelPlacement="outside"
                    value={query}
                    onChange={(e) => {
                        setQuery(e.target.value);
                        onSelect(e.target.value);
                    }}
                    onFocus={() => query.length > 2 && setIsOpen(true)}
                    startContent={<Search className="w-4 h-4 text-slate-400" />}
                    endContent={loading ? <Loader2 className="w-4 h-4 text-brand-blue animate-spin" /> : null}
                />
            </div>

            {isOpen && results.length > 0 && (
                <div className="absolute z-50 w-full mt-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl max-h-60 overflow-y-auto">
                    {results.map((client) => (
                        <button
                            key={client.id}
                            onClick={() => handleSelect(client)}
                            className="w-full text-left px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 flex items-center justify-between group transition-colors"
                        >
                            <div>
                                <p className="font-bold text-slate-900 dark:text-white text-sm">{client.name}</p>
                                <p className="text-xs text-slate-500 dark:text-slate-400">{client.city} • {client.email}</p>
                            </div>
                            <div className="opacity-0 group-hover:opacity-100 text-brand-blue">
                                <Check className="w-4 h-4" />
                            </div>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};
