import React, { useState, useEffect } from 'react';
import {
    DndContext,
    DragOverlay,
    closestCorners,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragStartEvent,
    DragOverEvent,
    DragEndEvent,
    useDraggable,
    useDroppable,
    defaultDropAnimationSideEffects,
    DropAnimation
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Search, GripVertical, Trash2, Save, Plus, FileText, ShoppingCart, Package, Wrench, ArrowRight, Split, MessageSquare, Calculator, CloudLightning, Loader2, CheckCircle, FolderOpen, X } from 'lucide-react';
import { EyeCatchingButton_v2 } from '@/components/ui/shiny-button';
import { ClientSearch } from '../components/ClientSearch';
import { createEstimateFromTemplate, searchItems } from '../services/sellsyService';
import { SellsyClient } from '../types';
import { supabase } from '../lib/supabaseClient';

// --- Mock Data ---
interface Product {
    id: string;
    name: string;
    category: 'service' | 'supply' | 'equipment' | 'special';
    price: number;
    unit: string;
    type?: 'break-page' | 'comment' | 'sub-total' | 'product';
}

const SPECIAL_ITEMS: Product[] = [
    { id: 's1', name: 'Saut de Page', category: 'special', price: 0, unit: '', type: 'break-page' },
    { id: 's2', name: 'Commentaire', category: 'special', price: 0, unit: '', type: 'comment' },
    { id: 's3', name: 'Sous-Total', category: 'special', price: 0, unit: '', type: 'sub-total' },
];

const MOCK_CATALOG: Product[] = [
    { id: '1', name: 'Nettoyage Vitrerie', category: 'service', price: 45, unit: 'h', type: 'product' },
    { id: '2', name: 'Remise en état', category: 'service', price: 55, unit: 'h', type: 'product' },
    { id: '3', name: 'Shampoing Moquette', category: 'service', price: 12, unit: 'm²', type: 'product' },
    { id: '4', name: 'Décapage Sols', category: 'service', price: 8, unit: 'm²', type: 'product' },
    { id: '5', name: 'Kit Hygiène', category: 'supply', price: 15, unit: 'u', type: 'product' },
    { id: '6', name: 'Sac Poubelle 100L', category: 'supply', price: 25, unit: 'carton', type: 'product' },
    { id: '7', name: 'Produit Multi-surfaces', category: 'supply', price: 12, unit: 'L', type: 'product' },
    { id: '8', name: 'Location Monobrosse', category: 'equipment', price: 80, unit: 'j', type: 'product' },
    { id: '9', name: 'Location Injecteur/Extracteur', category: 'equipment', price: 95, unit: 'j', type: 'product' },
];

interface TemplateItem extends Product {
    quantity: number;
    text?: string;
    tempId: string;
}

interface SavedTemplate {
    id?: string; // Supabase ID
    name: string;
    items: TemplateItem[];
    updatedAt?: string;
}

// --- Components ---

const DraggableCatalogItem = ({ product, addItem }: { product: Product, addItem: (p: Product) => void }) => {
    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
        id: `catalog-${product.id}`,
        data: { product, type: 'catalog' }
    });

    const getCategoryIcon = (cat: string) => {
        switch (cat) {
            case 'service': return <Wrench className="w-4 h-4 text-blue-500" />;
            case 'supply': return <Package className="w-4 h-4 text-amber-500" />;
            case 'equipment': return <ShoppingCart className="w-4 h-4 text-purple-500" />;
            case 'special': return <Split className="w-4 h-4 text-slate-500" />;
            default: return <FileText className="w-4 h-4" />;
        }
    };

    if (product.category === 'special') {
        return (
            <div
                ref={setNodeRef}
                {...listeners}
                {...attributes}
                className={`flex flex-col items-center justify-center p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl hover:border-brand-blue hover:bg-brand-blue/5 cursor-grab active:cursor-grabbing transition-all text-center gap-2 ${isDragging ? 'opacity-50' : ''}`}
            >
                {product.type === 'break-page' && <Split className="w-5 h-5 text-slate-400" />}
                {product.type === 'comment' && <MessageSquare className="w-5 h-5 text-slate-400" />}
                {product.type === 'sub-total' && <Calculator className="w-5 h-5 text-slate-400" />}
                <span className="text-xs font-medium text-slate-600 dark:text-slate-300">{product.name}</span>
            </div>
        );
    }

    return (
        <div
            ref={setNodeRef}
            {...listeners}
            {...attributes}
            className={`group flex items-center justify-between p-3 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl hover:border-brand-blue/50 hover:shadow-md cursor-grab active:cursor-grabbing transition-all ${isDragging ? 'opacity-50' : ''}`}
        >
            <div className="flex items-center gap-3">
                <div className="p-2 bg-slate-100 dark:bg-slate-700 rounded-lg">
                    {getCategoryIcon(product.category)}
                </div>
                <div>
                    <p className="font-medium text-slate-700 dark:text-slate-200 text-sm">{product.name}</p>
                    <p className="text-xs text-slate-400">{product.price}€ / {product.unit}</p>
                </div>
            </div>
            <button
                onClick={(e) => { e.stopPropagation(); addItem(product); }}
                className="p-1.5 text-slate-400 hover:text-brand-blue hover:bg-brand-blue/10 rounded-lg transition-colors"
            >
                <Plus className="w-4 h-4" />
            </button>
        </div>
    );
};

const SortableBuilderItem = ({
    item,
    updateQuantity,
    updatePrice,
    updateComment,
    removeItem
}: {
    item: TemplateItem,
    updateQuantity: (id: string, d: number) => void,
    updatePrice: (id: string, p: number) => void,
    updateComment: (id: string, t: string) => void,
    removeItem: (id: string) => void
}) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: item.tempId, data: { item, type: 'builder' } });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    const getCategoryIcon = (cat: string) => {
        switch (cat) {
            case 'service': return <Wrench className="w-4 h-4 text-blue-500" />;
            case 'supply': return <Package className="w-4 h-4 text-amber-500" />;
            case 'equipment': return <ShoppingCart className="w-4 h-4 text-purple-500" />;
            case 'special': return <Split className="w-4 h-4 text-slate-500" />;
            default: return <FileText className="w-4 h-4" />;
        }
    };

    const renderContent = () => {
        if (item.type === 'break-page') {
            return (
                <div className="flex-grow flex items-center justify-center gap-2 text-slate-400 font-mono text-sm uppercase tracking-widest border-t-2 border-dashed border-slate-300 dark:border-slate-600 py-2">
                    <Split className="w-4 h-4" /> Saut de Page
                </div>
            );
        }

        if (item.type === 'comment') {
            return (
                <div className="flex-grow">
                    <div className="flex items-center gap-2 text-slate-500 mb-2">
                        <MessageSquare className="w-4 h-4" />
                        <span className="text-xs font-bold uppercase">Commentaire</span>
                    </div>
                    <textarea
                        value={item.text}
                        onChange={(e) => updateComment(item.tempId, e.target.value)}
                        onPointerDown={(e) => e.stopPropagation()} // Prevent drag when interacting with textarea
                        onKeyDown={(e) => e.stopPropagation()}
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-3 text-sm text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-brand-blue outline-none resize-none"
                        rows={2}
                    />
                </div>
            );
        }

        if (item.type === 'sub-total') {
            return (
                <div className="flex-grow flex items-center justify-between bg-slate-100 dark:bg-slate-800/80 px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200 font-bold">
                        <Calculator className="w-4 h-4" /> Sous-Total
                    </div>
                    <span className="text-xs text-slate-400 italic">Calculé automatiquement</span>
                </div>
            );
        }

        return (
            <>
                <div className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
                    {getCategoryIcon(item.category)}
                </div>

                <div className="flex-grow">
                    <h4 className="font-bold text-slate-800 dark:text-slate-200">{item.name}</h4>
                    <div className="flex items-center gap-1 mt-1">
                        <input
                            type="number"
                            value={item.price}
                            onChange={(e) => updatePrice(item.tempId, parseFloat(e.target.value) || 0)}
                            onPointerDown={(e) => e.stopPropagation()}
                            onKeyDown={(e) => e.stopPropagation()}
                            className="w-20 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded px-2 py-0.5 text-xs text-right font-mono focus:ring-1 focus:ring-brand-blue outline-none"
                        />
                        <span className="text-xs text-slate-400">€ / {item.unit}</span>
                    </div>
                </div>

                <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-900 rounded-lg p-1">
                    <button onClick={() => updateQuantity(item.tempId, -1)} className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-white dark:hover:bg-slate-700 text-slate-500 font-bold transition-colors">-</button>
                    <span className="w-8 text-center font-bold text-slate-900 dark:text-white">{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.tempId, 1)} className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-white dark:hover:bg-slate-700 text-slate-500 font-bold transition-colors">+</button>
                </div>

                <div className="w-24 text-right font-bold text-slate-700 dark:text-slate-300">
                    {(item.price * item.quantity).toLocaleString()} €
                </div>
            </>
        );
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`flex items-center gap-4 p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm group ${item.type === 'break-page' ? 'bg-slate-50/50 border-dashed' : ''} ${isDragging ? 'opacity-30' : ''}`}
        >
            <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-500 outline-none">
                <GripVertical className="w-5 h-5" />
            </div>

            {renderContent()}

            <button
                onClick={() => removeItem(item.tempId)}
                className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
            >
                <Trash2 className="w-5 h-5" />
            </button>
        </div>
    );
};

// Dedicated Droppable for the append zone
const AppendDroppable = ({ isOver }: { isOver: boolean }) => {
    const { setNodeRef } = useDroppable({
        id: 'append-zone',
        data: { type: 'append-zone' }
    });

    return (
        <div
            ref={setNodeRef}
            className={`h-16 mt-2 rounded-xl border-2 border-dashed flex items-center justify-center text-sm transition-all duration-200 ${isOver ? 'bg-brand-blue/10 border-brand-blue text-brand-blue scale-[1.02]' : 'border-slate-300 dark:border-slate-700 text-slate-400 bg-transparent hover:border-brand-blue/50'}`}
        >
            <div className="flex items-center gap-2 pointer-events-none">
                <Plus className={`w-5 h-5 ${isOver ? 'animate-pulse' : ''}`} />
                <span className="font-medium">Glisser ici pour ajouter à la fin</span>
            </div>
        </div>
    );
};

// Separated component to use useDroppable
const BuilderDroppable = ({
    items,
    updateQuantity,
    updatePrice,
    updateComment,
    removeItem,
    dragOverId,
    activeDragItem
}: {
    items: TemplateItem[],
    updateQuantity: (id: string, d: number) => void,
    updatePrice: (id: string, p: number) => void,
    updateComment: (id: string, t: string) => void,
    removeItem: (id: string) => void,
    dragOverId: string | null,
    activeDragItem: Product | TemplateItem | null
}) => {
    const { setNodeRef } = useDroppable({
        id: 'builder-droppable',
        data: { type: 'builder' }
    });

    // Check if we are dragging a catalog item
    const isDraggingCatalogItem = activeDragItem && !('tempId' in activeDragItem);

    return (
        <div
            ref={setNodeRef}
            className="flex-grow bg-slate-100 dark:bg-slate-900/50 rounded-3xl border-2 border-dashed border-slate-300 dark:border-slate-700 p-6 overflow-y-auto custom-scrollbar min-h-[700px] flex flex-col"
        >
            {items.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400">
                    <div className="w-16 h-16 bg-slate-200 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
                        <Plus className="w-8 h-8" />
                    </div>
                    <p className="font-medium">Glissez des éléments ici</p>
                    <p className="text-sm">pour construire votre modèle</p>
                </div>
            ) : (
                <>
                    <SortableContext
                        items={items.map(i => i.tempId)}
                        strategy={verticalListSortingStrategy}
                    >
                        <div className="space-y-3">
                            {items.map((item) => (
                                <React.Fragment key={item.tempId}>
                                    {/* Drop Indicator */}
                                    {isDraggingCatalogItem && dragOverId === item.tempId && (
                                        <div className="h-1 w-full bg-brand-blue rounded-full my-1 animate-pulse shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
                                    )}
                                    <SortableBuilderItem
                                        item={item}
                                        updateQuantity={updateQuantity}
                                        updatePrice={updatePrice}
                                        updateComment={updateComment}
                                        removeItem={removeItem}
                                    />
                                </React.Fragment>
                            ))}
                        </div>
                    </SortableContext>

                    {/* Explicit Append Zone */}
                    {isDraggingCatalogItem && (
                        <AppendDroppable isOver={dragOverId === 'append-zone'} />
                    )}
                </>
            )}
        </div>
    );
};

// --- Main Component ---

import { useToast } from '@/components/ui/Toast';
import { useConfirm } from '@/components/ui/ConfirmModal';
import { RichTextTextarea } from '@/components/ui/RichTextTextarea';

// ... (rest of imports)

export const QuoteTemplates = () => {
    // ... (state declarations)
    const [searchQuery, setSearchQuery] = useState('');
    const [templateItems, setTemplateItems] = useState<TemplateItem[]>([]);
    const [templateName, setTemplateName] = useState('Nouveau Modèle');
    const [subject, setSubject] = useState('');
    const [savedTemplates, setSavedTemplates] = useState<SavedTemplate[]>([]);
    const [activeDragItem, setActiveDragItem] = useState<Product | TemplateItem | null>(null);

    const [sellsyCatalog, setSellsyCatalog] = useState<Product[]>([]);
    const [isSearchingSellsy, setIsSearchingSellsy] = useState(false);

    const [selectedClient, setSelectedClient] = useState<SellsyClient | null>(null);
    const [isExporting, setIsExporting] = useState(false);

    const [dragOverId, setDragOverId] = useState<string | null>(null);

    const toast = useToast();
    const confirm = useConfirm();

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 5,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    // ... (useEffect hooks remain same)
    // Load from Supabase on mount
    useEffect(() => {
        const fetchTemplates = async () => {
            const { data, error } = await supabase
                .from('quote_templates')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) {
                console.error("Error fetching templates:", error);
            } else if (data) {
                setSavedTemplates(data);
            }
        };

        fetchTemplates();
    }, []);

    // Fetch Sellsy items when search query changes
    useEffect(() => {
        const fetchSellsyItems = async () => {
            setIsSearchingSellsy(true);
            try {
                const results = await searchItems(searchQuery);
                const mappedItems: Product[] = results.map((item: any) => ({
                    id: `sellsy-${item.id}`,
                    name: item.name || item.reference || "Produit sans nom",
                    category: item.type === 'service' ? 'service' : 'supply', // Simple mapping
                    price: parseFloat(item.reference_price || item.price_excl_tax || 0),
                    unit: item.unit?.name || 'u',
                    type: 'product'
                }));
                setSellsyCatalog(mappedItems);
            } catch (error) {
                console.error("Failed to fetch Sellsy items", error);
            } finally {
                setIsSearchingSellsy(false);
            }
        };

        const timeoutId = setTimeout(() => {
            fetchSellsyItems();
        }, 500); // Debounce 500ms

        return () => clearTimeout(timeoutId);
    }, [searchQuery]);

    // Combine Mock and Sellsy catalogs
    const filteredMockCatalog = MOCK_CATALOG.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const displayCatalog = [...filteredMockCatalog, ...sellsyCatalog];

    // -- Logic --
    const addItem = (product: Product, index?: number) => {
        setTemplateItems(prev => {
            const newItem = {
                ...product,
                quantity: 1,
                tempId: crypto.randomUUID(),
                text: product.type === 'comment' ? 'Nouveau commentaire...' : undefined
            };

            // If index is provided, insert at that specific position (no merging)
            if (typeof index === 'number') {
                const newItems = [...prev];
                newItems.splice(index, 0, newItem);
                return newItems;
            }

            // Default behavior: append or merge
            if (product.category === 'special') {
                return [...prev, newItem];
            }

            const existing = prev.find(item => item.id === product.id && item.type === 'product');
            if (existing) {
                return prev.map(item =>
                    item.tempId === existing.tempId ? { ...item, quantity: item.quantity + 1 } : item
                );
            }
            return [...prev, newItem];
        });
    };

    const updateQuantity = (tempId: string, delta: number) => {
        setTemplateItems(prev => prev.map(item => {
            if (item.tempId === tempId) {
                const newQ = Math.max(1, item.quantity + delta);
                return { ...item, quantity: newQ };
            }
            return item;
        }));
    };

    const updatePrice = (tempId: string, newPrice: number) => {
        setTemplateItems(prev => prev.map(item => {
            if (item.tempId === tempId) {
                return { ...item, price: newPrice };
            }
            return item;
        }));
    };

    const updateComment = (tempId: string, newText: string) => {
        setTemplateItems(prev => prev.map(item => {
            if (item.tempId === tempId) {
                return { ...item, text: newText };
            }
            return item;
        }));
    };

    const removeItem = (tempId: string) => {
        setTemplateItems(prev => prev.filter(item => item.tempId !== tempId));
    };

    const total = templateItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    const handleSave = async () => {
        if (!templateName.trim()) {
            toast.error("Veuillez donner un nom au modèle.");
            return;
        }

        const existingTemplate = savedTemplates.find(t => t.name === templateName);

        if (existingTemplate) {
            if (!await confirm({
                title: 'Modèle existant',
                message: `Un modèle nommé "${templateName}" existe déjà. Voulez-vous l'écraser ?`,
                confirmText: 'Écraser',
                type: 'warning'
            })) {
                return;
            }

            const { data, error } = await supabase
                .from('quote_templates')
                .update({
                    items: templateItems,
                    updated_at: new Date().toISOString()
                })
                .eq('id', existingTemplate.id)
                .select()
                .single();

            if (error) {
                console.error("Error updating template:", error);
                toast.error("Erreur lors de la mise à jour du modèle.");
                return;
            }

            if (data) {
                setSavedTemplates(prev => prev.map(t => t.id === data.id ? data : t));
                toast.success(`Modèle "${templateName}" mis à jour !`);
            }

        } else {
            const { data, error } = await supabase
                .from('quote_templates')
                .insert([{
                    name: templateName,
                    items: templateItems
                }])
                .select()
                .single();

            if (error) {
                console.error("Error creating template:", error);
                toast.error("Erreur lors de la création du modèle.");
                return;
            }

            if (data) {
                setSavedTemplates(prev => [data, ...prev]);
                toast.success(`Modèle "${templateName}" sauvegardé !`);
            }
        }
    };

    const handleLoad = async (template: SavedTemplate) => {
        if (templateItems.length > 0) {
            if (!await confirm({
                title: 'Charger un modèle',
                message: "Charger ce modèle remplacera votre travail actuel. Continuer ?",
                confirmText: 'Charger',
                type: 'warning'
            })) {
                return;
            }
        }
        setTemplateName(template.name);
        setTemplateItems(template.items);
    };

    const handleDelete = async (template: SavedTemplate) => {
        if (!await confirm({
            title: 'Supprimer le modèle',
            message: `Êtes-vous sûr de vouloir supprimer le modèle "${template.name}" ?`,
            confirmText: 'Supprimer',
            type: 'danger'
        })) return;

        const { error } = await supabase
            .from('quote_templates')
            .delete()
            .eq('id', template.id);

        if (error) {
            console.error("Error deleting template:", error);
            toast.error("Erreur lors de la suppression du modèle.");
            return;
        }

        setSavedTemplates(prev => prev.filter(t => t.id !== template.id));
        toast.success("Modèle supprimé");
    };

    const handleCreateQuote = async () => {
        if (!selectedClient) {
            toast.error("Veuillez sélectionner un client avant de créer le devis.");
            return;
        }

        if (templateItems.length === 0) {
            toast.error("Le modèle est vide. Ajoutez des éléments avant de créer un devis.");
            return;
        }

        if (!selectedClient.id) {
            toast.error("Erreur : Le client sélectionné n'a pas d'ID valide.");
            return;
        }

        // Cast to required type since we checked id
        const clientForService = {
            id: selectedClient.id,
            type: selectedClient.type === 'person' ? 'individual' : selectedClient.type as 'corporation' | 'individual'
        };

        if (!await confirm({
            title: 'Créer un devis Sellsy',
            message: `Créer un devis Sellsy pour ${selectedClient.name} basé sur ce modèle ?`,
            confirmText: 'Créer le devis',
            type: 'info'
        })) return;

        setIsExporting(true);
        try {
            const result = await createEstimateFromTemplate(clientForService, templateItems, templateName, subject);

            if (result) {
                const backOfficeLink = `https://www.sellsy.com/?_f=estimateOverview&id=${result.id}`;
                toast.success(`Devis créé avec succès ! ID: ${result.id}`);
                window.open(backOfficeLink, '_blank');
            } else {
                throw new Error("Pas de réponse de l'API Sellsy");
            }
        } catch (error) {
            console.error(error);
            toast.error("Erreur lors de la création du devis.");
        } finally {
            setIsExporting(false);
        }
    };

    // -- DnD Handlers --
    const handleDragStart = (event: DragStartEvent) => {
        const { active } = event;
        if (active.data.current?.type === 'catalog') {
            setActiveDragItem(active.data.current.product);
        } else if (active.data.current?.type === 'builder') {
            setActiveDragItem(active.data.current.item);
        }
    };

    const handleDragOver = (event: DragOverEvent) => {
        const { over } = event;
        setDragOverId(over ? (over.id as string) : null);
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveDragItem(null);
        setDragOverId(null);

        if (!over) return;

        // Dropping Catalog Item into Builder
        if (active.data.current?.type === 'catalog') {
            if (over.id === 'builder-droppable' || over.id === 'append-zone') {
                // Dropped on the container or explicit append zone -> append
                addItem(active.data.current.product);
            } else if (over.data.current?.type === 'builder') {
                // Dropped on a specific item -> insert before
                const overIndex = templateItems.findIndex(item => item.tempId === over.id);
                if (overIndex !== -1) {
                    addItem(active.data.current.product, overIndex);
                } else {
                    addItem(active.data.current.product);
                }
            }
            return;
        }

        // Reordering Builder Items
        if (active.data.current?.type === 'builder' && over.data.current?.type === 'builder') {
            if (active.id !== over.id) {
                setTemplateItems((items) => {
                    const oldIndex = items.findIndex((item) => item.tempId === active.id);
                    const newIndex = items.findIndex((item) => item.tempId === over.id);
                    return arrayMove(items, oldIndex, newIndex);
                });
            }
        }
    };

    const dropAnimation: DropAnimation = {
        sideEffects: defaultDropAnimationSideEffects({
            styles: {
                active: {
                    opacity: '0.5',
                },
            },
        }),
    };

    // Check if we are dragging a catalog item
    const isDraggingCatalogItem = activeDragItem && !('tempId' in activeDragItem);

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
        >
            <div className="p-6 max-w-[1600px] mx-auto h-[calc(100vh-2rem)] flex flex-col">

                {/* Header */}
                <div className="flex flex-col gap-6 mb-8">
                    <div className="flex justify-between items-start">
                        <div>
                            <h2 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                                <FileText className="w-8 h-8 text-brand-blue" />
                                Modèles de Devis
                            </h2>
                            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                                Créez des modèles réutilisables en glissant-déposant des produits.
                            </p>
                        </div>

                        <div className="flex gap-2">
                            <EyeCatchingButton_v2
                                onClick={handleCreateQuote}
                                disabled={isExporting || !selectedClient}
                                className={`text-white shadow-brand-blue/20 border-brand-blue bg-[linear-gradient(110deg,#2563eb,45%,#60a5fa,55%,#2563eb)] ${(!selectedClient || isExporting) ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CloudLightning className="w-4 h-4" />}
                                <span className="hidden sm:inline">Créer le Devis</span>
                            </EyeCatchingButton_v2>

                            <EyeCatchingButton_v2 onClick={handleSave} className="text-white shadow-brand-green/20 border-brand-green bg-[linear-gradient(110deg,#4D9805,45%,#65c206,55%,#4D9805)]">
                                <Save className="w-4 h-4" />
                                <span className="hidden sm:inline">Enregistrer</span>
                            </EyeCatchingButton_v2>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-12 gap-6 bg-white dark:bg-slate-800/50 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm">
                        {/* Left Column: Template Name & Client */}
                        <div className="md:col-span-5 space-y-5">
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Nom du Modèle</label>
                                <input
                                    type="text"
                                    value={templateName}
                                    onChange={(e) => setTemplateName(e.target.value)}
                                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-brand-blue/20 transition-all"
                                    placeholder="Ex: Nettoyage Bureaux Type A"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Client / Projet</label>
                                <ClientSearch
                                    label=""
                                    initialValue=""
                                    clearOnSelect={false}
                                    onSelect={(client) => {
                                        if (typeof client !== 'string') {
                                            setSelectedClient(client);
                                        }
                                    }}
                                />
                                {selectedClient && (
                                    <div className="mt-2 text-xs text-brand-green flex items-center gap-1">
                                        <CheckCircle className="w-3 h-3" />
                                        Client sélectionné : <b>{selectedClient.name}</b>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Right Column: Subject (Tall) */}
                        <div className="md:col-span-7">
                            <RichTextTextarea
                                label="Objet du Devis (Sellsy)"
                                value={subject}
                                onChangeValue={setSubject}
                                placeholder="Ex: Nettoyage complet - Bureaux&#10;Prestation mensuelle..."
                                className="h-full min-h-[140px]"
                            />
                        </div>
                    </div>
                </div>

                <div className="flex-grow grid grid-cols-12 gap-6 min-h-0">

                    {/* LEFT: CATALOG */}
                    <div className="col-span-4 flex flex-col gap-4 overflow-hidden">

                        {/* Saved Templates */}
                        <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm max-h-[200px] flex flex-col">
                            <h3 className="font-bold text-slate-700 dark:text-slate-200 mb-3 text-sm uppercase tracking-wider flex items-center gap-2">
                                <FolderOpen className="w-4 h-4" /> Mes Modèles
                            </h3>
                            <div className={`flex-grow custom-scrollbar space-y-2 ${isDraggingCatalogItem ? 'overflow-hidden' : 'overflow-y-auto'}`}>
                                {savedTemplates.length === 0 ? (
                                    <p className="text-xs text-slate-400 italic text-center py-4">Aucun modèle enregistré</p>
                                ) : (
                                    savedTemplates.map((template, idx) => (
                                        <div key={idx} className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-900 rounded-lg group hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                                            <button
                                                onClick={() => handleLoad(template)}
                                                className="flex-grow text-left text-sm font-medium text-slate-700 dark:text-slate-300 truncate"
                                            >
                                                {template.name}
                                            </button>
                                            <button
                                                onClick={() => handleDelete(template)}
                                                className="p-1 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                <X className="w-3 h-3" />
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* Special Items */}
                        <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm">
                            <h3 className="font-bold text-slate-700 dark:text-slate-200 mb-3 text-sm uppercase tracking-wider">Structure</h3>
                            <div className="grid grid-cols-3 gap-2">
                                {SPECIAL_ITEMS.map(item => (
                                    <DraggableCatalogItem key={item.id} product={item} addItem={addItem} />
                                ))}
                            </div>
                        </div>

                        {/* Product Catalog */}
                        <div className="flex-grow bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 flex flex-col overflow-hidden shadow-lg">
                            <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50">
                                <h3 className="font-bold text-slate-700 dark:text-slate-200 mb-3">Catalogue Sellsy</h3>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <input
                                        type="text"
                                        placeholder="Rechercher un produit..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-4 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-blue/20"
                                    />
                                </div>
                            </div>

                            <div className={`flex-grow p-4 space-y-2 custom-scrollbar ${isDraggingCatalogItem ? 'overflow-hidden' : 'overflow-y-auto'}`}>
                                {isSearchingSellsy && (
                                    <div className="flex items-center justify-center py-4 text-slate-400 gap-2">
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        <span className="text-xs">Recherche Sellsy...</span>
                                    </div>
                                )}
                                {displayCatalog.map(product => (
                                    <DraggableCatalogItem key={product.id} product={product} addItem={addItem} />
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* RIGHT: BUILDER */}
                    <div className="col-span-8 flex flex-col gap-6">

                        {/* Template Info */}
                        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 flex items-center gap-4 shadow-sm">
                            <div className="flex-grow">
                                <label className="text-xs font-bold text-slate-400 uppercase ml-1">Nom du modèle</label>
                                <input
                                    type="text"
                                    value={templateName}
                                    onChange={(e) => setTemplateName(e.target.value)}
                                    className="w-full text-xl font-bold bg-transparent outline-none text-slate-900 dark:text-white placeholder-slate-300"
                                />
                            </div>
                            <div className="text-right px-4 border-l border-slate-200 dark:border-slate-700">
                                <p className="text-xs text-slate-400 font-bold uppercase">Total Estimé</p>
                                <p className="text-2xl font-bold text-brand-green">{total.toLocaleString()} €</p>
                            </div>
                        </div>

                        {/* Drop Zone */}
                        <BuilderDroppable
                            items={templateItems}
                            updateQuantity={updateQuantity}
                            updatePrice={updatePrice}
                            updateComment={updateComment}
                            removeItem={removeItem}
                            dragOverId={dragOverId}
                            activeDragItem={activeDragItem}
                        />

                    </div>
                </div>

                <DragOverlay dropAnimation={dropAnimation}>
                    {activeDragItem ? (
                        <div className="opacity-90 rotate-3 cursor-grabbing pointer-events-none">
                            {/* Simple representation for overlay */}
                            <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-brand-blue shadow-2xl w-80 flex items-center gap-3">
                                <div className="p-2 bg-brand-blue/10 rounded-lg">
                                    <FileText className="w-5 h-5 text-brand-blue" />
                                </div>
                                <span className="font-bold text-slate-800 dark:text-white">
                                    {activeDragItem.name}
                                </span>
                            </div>
                        </div>
                    ) : null}
                </DragOverlay>

            </div>
        </DndContext>
    );
};
