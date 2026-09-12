import { useState } from 'react';
import { useInventory } from '../hooks/useInventoryData';
import { Plus, ChevronDown, ChevronRight, Loader2, Package, Search } from 'lucide-react';

export default function InventoryModule() {
    const { data: inventoryData, isLoading, isError } = useInventory();
    const [expandedGroups, setExpandedGroups] = useState(new Set());
    const [searchTerm, setSearchTerm] = useState('');

    // Toggle group expansion for the hierarchical view
    const toggleGroup = (groupId) => {
        setExpandedGroups((prev) => {
            const next = new Set(prev);
            if (next.has(groupId)) {
                next.delete(groupId);
            } else {
                next.add(groupId);
            }
            return next;
        });
    };

    return (
        <div className="max-w-7xl mx-auto space-y-6">

            {/* HEADER: Items, Details, Add (+) */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-4 w-full md:w-auto">
                    <div className="p-3 bg-orange-100 text-orange-600 rounded-xl">
                        <Package className="w-6 h-6" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800">Inventory Management</h1>
                        <p className="text-sm text-slate-500 font-medium">Manage Groups, Sub-items, and Stock GV</p>
                    </div>
                </div>

                <div className="flex items-center gap-4 w-full md:w-auto">
                    <div className="relative w-full md:w-64">
                        <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search items..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all"
                        />
                    </div>

                    {/* The Add (+) Button from your sketch */}
                    <button className="flex items-center gap-2 px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-lg transition-colors shadow-sm shrink-0">
                        <Plus className="w-5 h-5" />
                        Add Item
                    </button>
                </div>
            </div>

            {/* INVENTORY TREE VIEW */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">

                {/* Column Headers */}
                <div className="grid grid-cols-12 gap-4 p-4 bg-slate-50 border-b border-slate-200 text-sm font-bold text-slate-700">
                    <div className="col-span-5 pl-2">Items / Group (Particular)</div>
                    <div className="col-span-4">Details</div>
                    <div className="col-span-3 text-right pr-4">Stock GV</div>
                </div>

                {/* Data Loading State */}
                {isLoading && (
                    <div className="p-12 flex justify-center items-center text-orange-500">
                        <Loader2 className="w-8 h-8 animate-spin" />
                    </div>
                )}

                {isError && (
                    <div className="p-8 text-center text-red-500 font-medium">
                        Failed to load inventory data.
                    </div>
                )}

                {/* Hierarchical List */}
                <div className="divide-y divide-slate-100">
                    {inventoryData?.map((group) => {
                        const isExpanded = expandedGroups.has(group.groupId);

                        return (
                            <div key={group.groupId} className="flex flex-col transition-colors">

                                {/* LEVEL 1: Group Row */}
                                <div
                                    onClick={() => toggleGroup(group.groupId)}
                                    className="grid grid-cols-12 gap-4 p-4 items-center cursor-pointer hover:bg-orange-50/30 group"
                                >
                                    <div className="col-span-5 flex items-center gap-2 font-semibold text-slate-800">
                                        <button className="p-1 text-slate-400 group-hover:text-orange-500 transition-colors">
                                            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                        </button>
                                        {group.groupName}
                                    </div>
                                    <div className="col-span-4 text-sm text-slate-500 truncate">
                                        {group.details}
                                    </div>
                                    <div className="col-span-3 text-right pr-4 font-bold text-slate-700">
                                        {group.stockGv}
                                    </div>
                                </div>

                                {/* LEVEL 2: Sub-items (Expands when clicked) */}
                                {isExpanded && (
                                    <div className="bg-slate-50/50 border-t border-slate-100 divide-y divide-slate-100/80">
                                        {group.subItems.map((item) => (
                                            <div key={item.id} className="grid grid-cols-12 gap-4 py-3 px-4 items-center hover:bg-white transition-colors">
                                                <div className="col-span-5 pl-10 flex items-center gap-3">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-orange-300"></div>
                                                    <span className="text-sm font-medium text-slate-700">{item.name}</span>
                                                </div>
                                                <div className="col-span-4 text-sm text-slate-500">
                                                    {item.details}
                                                </div>
                                                <div className="col-span-3 text-right pr-4 text-sm font-semibold text-slate-600">
                                                    {item.stock} Units
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}