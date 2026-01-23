import * as React from "react";
import { useState, useMemo } from "react";
import { Search, ChevronDown, Plus, Loader2, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";

export interface SearchableSelectProps<T> {
    items: T[];
    value?: string | number;
    onSelect: (value: string | number) => void;
    onCreate?: (name: string) => Promise<void>;
    placeholder?: string;
    searchPlaceholder?: string;
    icon?: React.ReactNode;
    getLabel: (item: T) => string;
    getValue: (item: T) => string | number;
    className?: string;
    emptyMessage?: string;
}

export function SearchableSelect<T>({
    items,
    value,
    onSelect,
    onCreate,
    placeholder = "选择选项...",
    searchPlaceholder = "搜索或输入新名称...",
    icon = <Search className="w-3.5 h-3.5" />,
    getLabel,
    getValue,
    className,
    emptyMessage = "未找到匹配项",
}: SearchableSelectProps<T>) {
    const [open, setOpen] = useState(false);
    const [searchValue, setSearchValue] = useState("");
    const [isAdding, setIsAdding] = useState(false);

    const filteredItems = useMemo(() => {
        const trimmedSearch = searchValue.trim().toLowerCase();
        if (!trimmedSearch) return items;
        return items.filter((item) =>
            getLabel(item).toLowerCase().includes(trimmedSearch)
        );
    }, [items, searchValue, getLabel]);

    const exactMatch = useMemo(() => {
        const trimmedSearch = searchValue.trim().toLowerCase();
        return items.find(
            (item) => getLabel(item).toLowerCase() === trimmedSearch
        );
    }, [items, searchValue, getLabel]);

    const handleCreate = async () => {
        const trimmedSearch = searchValue.trim();
        if (!trimmedSearch || isAdding || !onCreate) return;
        setIsAdding(true);
        try {
            await onCreate(trimmedSearch);
            setSearchValue("");
            setOpen(false);
        } finally {
            setIsAdding(false);
        }
    };

    const selectedItem = items.find((item) => getValue(item) === value);

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <button
                    className={cn(
                        "w-full h-12 flex items-center justify-between px-4 rounded-md bg-gray-100 hover:bg-gray-200 active:scale-[0.98] transition-all duration-200 group",
                        className
                    )}
                >
                    <div className="flex items-center gap-3 overflow-hidden">
                        <span className="text-gray-400 group-hover:text-primary-500 transition-colors">
                            {icon}
                        </span>
                        <span
                            className={cn(
                                "text-sm truncate transition-colors",
                                selectedItem ? "text-gray-900 font-bold" : "text-gray-500 group-hover:text-gray-700"
                            )}
                        >
                            {selectedItem ? getLabel(selectedItem) : placeholder}
                        </span>
                    </div>
                    <ChevronDown
                        className={cn(
                            "w-4 h-4 text-gray-400 transition-all duration-300",
                            open ? "rotate-180 text-primary-500" : "group-hover:text-gray-600"
                        )}
                    />
                </button>
            </PopoverTrigger>
            <PopoverContent
                className="w-[var(--radix-popover-trigger-width)] p-0 border border-gray-100  rounded-lg overflow-hidden z-[1001]"
                align="start"
                asChild
            >
                <motion.div
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                >
                    <div className="p-2.5 border-b border-gray-50 bg-gray-50">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                            <Input
                                value={searchValue}
                                onChange={(e) => setSearchValue(e.target.value)}
                                placeholder={searchPlaceholder}
                                className="h-10 pl-9 text-sm border-none bg-white focus:ring-2 focus:ring-primary-500/10 transition-all placeholder:text-gray-300"
                                onKeyDown={(e) => {
                                    if (e.key === "Enter" && !exactMatch && searchValue.trim() && onCreate) {
                                        handleCreate();
                                    }
                                }}
                                autoFocus
                            />
                        </div>
                    </div>
                    <div className="max-h-72 overflow-y-auto p-1.5 scrollbar-hide">
                        <AnimatePresence mode="popLayout">
                            {onCreate && searchValue.trim() && !exactMatch && (
                                <motion.button
                                    layout
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: "auto" }}
                                    exit={{ opacity: 0, height: 0 }}
                                    onClick={handleCreate}
                                    disabled={isAdding}
                                    className="w-full flex items-center justify-between px-3 py-3 text-xs font-black uppercase tracking-wider text-primary-600 bg-primary-50 hover:bg-primary-50 rounded-md mb-1.5 transition-all group overflow-hidden"
                                >
                                    <div className="flex items-center gap-2">
                                        <Plus className="w-4 h-4 transform group-hover:rotate-90 transition-transform" />
                                        <span>创建 "{searchValue.trim()}"</span>
                                    </div>
                                    {isAdding && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                                </motion.button>
                            )}
                        </AnimatePresence>

                        <div className="grid gap-0.5">
                            {filteredItems.length > 0 ? (
                                filteredItems.map((item) => {
                                    const isSelected = getValue(item) === value;
                                    return (
                                        <button
                                            key={getValue(item)}
                                            onClick={() => {
                                                onSelect(getValue(item));
                                                setOpen(false);
                                                setSearchValue("");
                                            }}
                                            className={cn(
                                                "w-full flex items-center justify-between px-3 py-2.5 text-sm rounded-md transition-all text-left group/item",
                                                isSelected
                                                    ? "bg-primary-100 text-primary-700 font-bold"
                                                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                                            )}
                                        >
                                            <span className="truncate group-hover/item:translate-x-0.5 transition-transform duration-200">
                                                {getLabel(item)}
                                            </span>
                                            {isSelected && <Check className="w-4 h-4 shrink-0 text-primary-500" />}
                                        </button>
                                    );
                                })
                            ) : (
                                !(searchValue.trim() && onCreate) && (
                                    <div className="px-3 py-10 text-center">
                                        <div className="w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3">
                                            <Search className="w-5 h-5 text-gray-300" />
                                        </div>
                                        <p className="text-xs text-gray-400 font-medium">{emptyMessage}</p>
                                    </div>
                                )
                            )}
                        </div>
                    </div>
                </motion.div>
            </PopoverContent>
        </Popover>
    );
}
