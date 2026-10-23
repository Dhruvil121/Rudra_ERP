import { useState, useMemo } from 'react';
import {
    FileText, Calendar, Download, Printer, TrendingUp, Package,
    Cog, Loader2, Search, Factory, IndianRupee, Layers, Archive, RefreshCw, AlertTriangle
} from 'lucide-react';
import { useReports } from '../hooks/useReportsData';
import { useOrders } from '../hooks/useOrderData';
import { useInventory } from '../hooks/useInventoryData';
import { useFeedback } from '../context/FeedbackContext';

export default function ReportsModule() {
    const [reportType, setReportType] = useState('monthly'); // 'daily' | 'monthly' | 'all'
    const [activeTab, setActiveTab] = useState('logs'); // 'logs' | 'stages' | 'inventory'
    const [priorityFilter, setPriorityFilter] = useState('all'); // 'all' | 'urgent' | 'mixed' | 'normal'
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));

    const activeDate = reportType === 'daily' ? selectedDate : reportType === 'monthly' ? selectedMonth : '';
    const { data, isLoading, refetch, isFetching } = useReports(reportType, activeDate);
    const { data: liveOrders = [] } = useOrders();
    const { data: liveInventory = [] } = useInventory();
    const { showToast } = useFeedback();

    // Map order priorities by piNo / orderId so logs always carry live priority & size variants
    const orderMetaMap = useMemo(() => {
        const map = new Map();
        liveOrders.forEach(o => {
            const meta = {
                orderPriority: o.orderPriority || 'normal',
                status: o.status || 'Pending',
                sizes: (o.items || []).map(i => `${i.rudraCode}${i.size ? ` (${i.size})` : ''}`).join(', ')
            };
            map.set(o._id, meta);
            if (o.piNo) map.set(o.piNo, meta);
        });
        return map;
    }, [liveOrders]);

    const fallbackLogs = useMemo(() => {
        return liveOrders
            .filter(o => {
                if (reportType === 'all' || !activeDate) return true;
                const d = o.date || o.createdAt || '';
                return String(d).startsWith(activeDate);
            })
            .map(o => {
                const sets = (o.items || []).reduce((acc, i) => acc + Number(i.qty || 0), 0);
                return {
                    id: o._id,
                    batchNo: o.piNo || 'N/A',
                    partyCode: o.partyCode || '-',
                    customerName: o.name || '-',
                    rudraCode: (o.items || []).map(i => `${i.rudraCode}${i.size ? ` (${i.size})` : ''}`).filter(Boolean).join(', ') || '-',
                    orderPriority: o.orderPriority || 'normal',
                    orderSets: sets,
                    stepsCount: 0,
                    stage: o.status === 'Dispatched' ? 'Dispatched' : o.status === 'Approved' ? 'Approved for Production' : 'Order Created',
                    inputQty: sets,
                    outputQty: 0,
                    extraQty: 0,
                    rejectionQty: 0,
                    rawKg: 0,
                    boxes: 0,
                    totalCost: 0,
                    status: o.status || 'Pending',
                    date: o.date || o.createdAt
                };
            });
    }, [liveOrders, reportType, activeDate]);

    const fallbackInventory = useMemo(() => {
        return liveInventory.flatMap(g =>
            (g.subItems || []).map(item => ({
                id: item._id || item.itemCode,
                itemCode: item.itemCode,
                name: item.name,
                groupName: g.groupName,
                category: item.category || 'Raw Material',
                inventoryType: item.inventoryType || 'process',
                stock: Number(item.stock || 0),
                reservedInProcess: Number(item.reservedInProcess || 0),
                uom: item.uom || 'Pcs',
                unitCost: Number(item.unitCost || 0),
                totalValue: Number(item.stock || 0) * Number(item.unitCost || 0)
            }))
        );
    }, [liveInventory]);

    const rawLogs = useMemo(() => {
        const base = data?.logs || fallbackLogs;
        return base.map(l => {
            const meta = orderMetaMap.get(l.orderId) || orderMetaMap.get(l.batchNo);
            return {
                ...l,
                orderPriority: l.orderPriority || meta?.orderPriority || 'normal',
                rudraCode: meta?.sizes || l.rudraCode,
                status: meta?.status === 'Dispatched' ? 'Dispatched' : l.status
            };
        });
    }, [data?.logs, fallbackLogs, orderMetaMap]);

    const rawStages = data?.stageBreakdown || [];
    const rawInventory = fallbackInventory.length > 0 ? fallbackInventory : (data?.inventoryReport || []);

    const filteredLogs = useMemo(() => {
        const term = searchTerm.toLowerCase();
        return rawLogs
            .filter(l => {
                const matchesTerm =
                    !term ||
                    l.batchNo?.toLowerCase().includes(term) ||
                    l.customerName?.toLowerCase().includes(term) ||
                    l.partyCode?.toLowerCase().includes(term) ||
                    l.rudraCode?.toLowerCase().includes(term) ||
                    l.stage?.toLowerCase().includes(term);
                const matchesPriority =
                    priorityFilter === 'all' || l.orderPriority === priorityFilter;
                return matchesTerm && matchesPriority;
            })
            .sort((a, b) => {
                const p = { urgent: 0, mixed: 1, normal: 2 };
                return (p[a.orderPriority] ?? 2) - (p[b.orderPriority] ?? 2);
            });
    }, [rawLogs, searchTerm, priorityFilter]);

    const filteredStages = useMemo(() => {
        const term = searchTerm.toLowerCase();
        return rawStages.filter(s => !term || s.stageName?.toLowerCase().includes(term));
    }, [rawStages, searchTerm]);

    const filteredInventory = useMemo(() => {
        const term = searchTerm.toLowerCase();
        return rawInventory.filter(
            i =>
                !term ||
                i.itemCode?.toLowerCase().includes(term) ||
                i.name?.toLowerCase().includes(term) ||
                i.groupName?.toLowerCase().includes(term) ||
                i.category?.toLowerCase().includes(term)
        );
    }, [rawInventory, searchTerm]);

    const computedSummary = useMemo(() => {
        if (data?.summary && !searchTerm && priorityFilter === 'all') return data.summary;
        let input = 0,
            output = 0,
            extra = 0,
            waste = 0,
            boxes = 0,
            cost = 0;

        filteredLogs.forEach(l => {
            input += Number(l.inputQty || 0);
            output += Number(l.outputQty || 0);
            extra += Number(l.extraQty || 0);
            waste += Number(l.rejectionQty || 0);
            boxes += Number(l.boxes || 0);
            cost += Number(l.totalCost || 0);
        });

        const scrapRate = input > 0 ? ((waste / input) * 100).toFixed(1) : '0.0';

        return {
            production: `${input} Pcs`,
            goodOutput: `${output} Pcs`,
            extraInventory: `${extra} Pcs`,
            assembly: `${Number(boxes.toFixed(2))} Boxes`,
            waste: `${waste} Pcs`,
            scrapRate: `${scrapRate}%`,
            totalCost: cost
        };
    }, [data?.summary, filteredLogs, searchTerm, priorityFilter]);

    const handleExportCSV = () => {
        let headers = [];
        let rows = [];

        if (activeTab === 'logs') {
            headers = [
                'Order ID (PI No)',
                'Priority',
                'Party Code',
                'Customer Name',
                'Rudra Code & Sizes',
                'Order Sets',
                'Latest Stage',
                'Input Qty (Pcs)',
                'Good Output (Pcs)',
                'Extra To Inventory (Pcs)',
                'Rejection / Scrap (Pcs)',
                'Final Boxes',
                'Process Cost (INR)',
                'Status',
                'Date'
            ];
            rows = filteredLogs.map(l => [
                l.batchNo,
                (l.orderPriority || 'normal').toUpperCase(),
                l.partyCode,
                `"${(l.customerName || '').replace(/"/g, '""')}"`,
                `"${(l.rudraCode || '').replace(/"/g, '""')}"`,
                l.orderSets,
                `"${(l.stage || '').replace(/"/g, '""')}"`,
                l.inputQty,
                l.outputQty,
                l.extraQty,
                l.rejectionQty,
                l.boxes,
                l.totalCost,
                l.status,
                l.date ? new Date(l.date).toLocaleDateString('en-IN') : '-'
            ]);
        } else if (activeTab === 'stages') {
            headers = [
                'Process Stage Name',
                'Orders Count',
                'Total Input (Pcs)',
                'Total Output (Pcs)',
                'Extra To Inventory (Pcs)',
                'Rejection (Pcs)',
                'Raw Material (Kg)',
                'Total Stage Cost (INR)'
            ];
            rows = filteredStages.map(s => [
                `"${s.stageName}"`,
                s.ordersCount,
                s.inputPcs,
                s.outputPcs,
                s.extraPcs,
                s.rejectionPcs,
                s.rawKg,
                s.totalCost
            ]);
        } else {
            headers = [
                'SKU / Item Code',
                'Material Name',
                'Inventory Group',
                'Category',
                'Physical Stock',
                'Reserved In Process',
                'Net Available',
                'UOM',
                'Unit Cost (INR)',
                'Total Valuation (INR)'
            ];
            rows = filteredInventory.map(i => [
                i.itemCode,
                `"${(i.name || '').replace(/"/g, '""')}"`,
                `"${(i.groupName || '').replace(/"/g, '""')}"`,
                i.category,
                i.stock,
                i.reservedInProcess || 0,
                Math.max(0, Number(i.stock || 0) - Number(i.reservedInProcess || 0)),
                i.uom,
                i.unitCost,
                i.totalValue
            ]);
        }

        if (rows.length === 0) {
            showToast('No records available to export.', 'warning');
            return;
        }

        const csvContent =
            '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute(
            'download',
            `Rudra_ERP_${activeTab.toUpperCase()}_Report_${activeDate || 'All_Time'}.csv`
        );
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        showToast('Report exported to CSV (Excel) successfully!', 'success');
    };

    const handlePrintOrPDF = () => {
        window.print();
    };

    return (
        <div className="w-full">
            <div className="space-y-4 max-w-7xl mx-auto pb-16">
                <div className="flex flex-wrap justify-between items-center gap-4 pb-4 border-b border-slate-200">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-indigo-100 text-indigo-600 rounded-xl">
                            <FileText className="w-6 h-6" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-slate-800">Production & Inventory Reports</h1>
                            <p className="text-sm text-slate-500">
                                Priority-sorted manufacturing logs, multi-size tracking, soft-reserved rework stock & valuation
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <button
                            onClick={() => refetch()}
                            disabled={isFetching}
                            className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 text-slate-600 text-xs font-bold rounded-lg hover:bg-slate-50 shadow-sm"
                        >
                            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin text-indigo-600' : ''}`} />
                            Refresh
                        </button>
                        <button
                            onClick={handlePrintOrPDF}
                            className="flex items-center gap-1.5 px-4 py-2 bg-white border border-slate-200 text-slate-700 text-sm font-semibold rounded-lg hover:bg-slate-50 shadow-sm"
                        >
                            <Printer className="w-4 h-4 text-slate-500" />
                            Print / Save PDF
                        </button>
                        <button
                            onClick={handleExportCSV}
                            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 shadow-sm"
                        >
                            <Download className="w-4 h-4" />
                            Export Excel (CSV)
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <ReportKpiCard
                        title="Total Processed (Input)"
                        value={computedSummary.production}
                        subtitle="Initial Pieces Entered"
                        icon={<Cog className="w-5 h-5 text-blue-600" />}
                        bgColor="bg-blue-50"
                    />
                    <ReportKpiCard
                        title="Good Output To Next Stage"
                        value={computedSummary.goodOutput || '0 Pcs'}
                        subtitle={`Extra to Inv: ${computedSummary.extraInventory || '0 Pcs'}`}
                        icon={<Factory className="w-5 h-5 text-emerald-600" />}
                        bgColor="bg-emerald-50"
                    />
                    <ReportKpiCard
                        title="Final Packed Assembly"
                        value={computedSummary.assembly}
                        subtitle="Ready for Dispatch"
                        icon={<Archive className="w-5 h-5 text-indigo-600" />}
                        bgColor="bg-indigo-50"
                    />
                    <ReportKpiCard
                        title="Material Loss / Rejection"
                        value={computedSummary.waste}
                        subtitle={`Scrap Rate: ${computedSummary.scrapRate || '0%'}`}
                        icon={<TrendingUp className="w-5 h-5 text-red-600" />}
                        bgColor="bg-red-50"
                    />
                    <ReportKpiCard
                        title="Total Process Labor Cost"
                        value={`₹${Number(computedSummary.totalCost || 0).toLocaleString('en-IN')}`}
                        subtitle="Accumulated Stage Rates"
                        icon={<IndianRupee className="w-5 h-5 text-amber-600" />}
                        bgColor="bg-amber-50"
                    />
                    <ReportKpiCard
                        title="Total Inventory Valuation"
                        value={`₹${Number(
                            data?.summary?.inventoryValuation ||
                            rawInventory.reduce((a, b) => a + b.totalValue, 0)
                        ).toLocaleString('en-IN')}`}
                        subtitle={`${rawInventory.length} Active SKUs`}
                        icon={<Package className="w-5 h-5 text-purple-600" />}
                        bgColor="bg-purple-50"
                    />
                </div>

                <div className="bg-white p-3 rounded-xl shadow-sm border border-slate-200 flex flex-wrap justify-between items-center gap-4">
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="relative w-64">
                            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search PI No, Party, Rudra Code..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-9 pr-3 py-1.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500"
                            />
                        </div>

                        {activeTab === 'logs' && (
                            <select
                                value={priorityFilter}
                                onChange={(e) => setPriorityFilter(e.target.value)}
                                className="px-3 py-1.5 text-xs font-bold bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
                            >
                                <option value="all">All Priorities</option>
                                <option value="urgent">🔴 Urgent Only</option>
                                <option value="mixed">⚡ Mixed (Urgent Split)</option>
                                <option value="normal">Normal Only</option>
                            </select>
                        )}

                        <div className="flex gap-1 p-1 bg-slate-100 rounded-lg">
                            {[
                                { id: 'daily', label: 'Daily' },
                                { id: 'monthly', label: 'Monthly' },
                                { id: 'all', label: 'All Time' }
                            ].map(t => (
                                <button
                                    key={t.id}
                                    onClick={() => setReportType(t.id)}
                                    className={`px-3 py-1 rounded-md font-semibold text-xs transition-all ${reportType === t.id
                                            ? 'bg-white text-indigo-600 shadow-sm'
                                            : 'text-slate-500 hover:text-slate-700'
                                        }`}
                                >
                                    {t.label}
                                </button>
                            ))}
                        </div>

                        {reportType === 'daily' && (
                            <div className="flex items-center gap-1.5">
                                <Calendar className="w-4 h-4 text-slate-400" />
                                <input
                                    type="date"
                                    value={selectedDate}
                                    onChange={(e) => setSelectedDate(e.target.value)}
                                    className="px-2.5 py-1 text-sm bg-slate-50 border border-slate-200 rounded-lg font-medium text-slate-700"
                                />
                            </div>
                        )}
                        {reportType === 'monthly' && (
                            <div className="flex items-center gap-1.5">
                                <Calendar className="w-4 h-4 text-slate-400" />
                                <input
                                    type="month"
                                    value={selectedMonth}
                                    onChange={(e) => setSelectedMonth(e.target.value)}
                                    className="px-2.5 py-1 text-sm bg-slate-50 border border-slate-200 rounded-lg font-medium text-slate-700"
                                />
                            </div>
                        )}
                    </div>

                    <div className="flex gap-1 p-1 bg-slate-100 rounded-lg">
                        <button
                            onClick={() => setActiveTab('logs')}
                            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-md font-semibold text-xs transition-all ${activeTab === 'logs'
                                    ? 'bg-white text-indigo-600 shadow-sm'
                                    : 'text-slate-500 hover:text-slate-700'
                                }`}
                        >
                            <FileText className="w-3.5 h-3.5" />
                            Order Logs ({filteredLogs.length})
                        </button>
                        <button
                            onClick={() => setActiveTab('stages')}
                            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-md font-semibold text-xs transition-all ${activeTab === 'stages'
                                    ? 'bg-white text-indigo-600 shadow-sm'
                                    : 'text-slate-500 hover:text-slate-700'
                                }`}
                        >
                            <Layers className="w-3.5 h-3.5" />
                            Stage Breakdown ({filteredStages.length})
                        </button>
                        <button
                            onClick={() => setActiveTab('inventory')}
                            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-md font-semibold text-xs transition-all ${activeTab === 'inventory'
                                    ? 'bg-white text-indigo-600 shadow-sm'
                                    : 'text-slate-500 hover:text-slate-700'
                                }`}
                        >
                            <Package className="w-3.5 h-3.5" />
                            Stock Valuation ({filteredInventory.length})
                        </button>
                    </div>
                </div>

                {isLoading ? (
                    <div className="bg-white rounded-xl border border-slate-200 p-12 flex justify-center">
                        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
                    </div>
                ) : activeTab === 'logs' ? (
                    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse min-w-[950px]">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                                        <th className="p-4">Batch / PI No.</th>
                                        <th className="p-4">Priority</th>
                                        <th className="p-4">Customer & Party</th>
                                        <th className="p-4">Rudra Code & Sizes</th>
                                        <th className="p-4">Latest Stage</th>
                                        <th className="p-4 text-center">Input</th>
                                        <th className="p-4 text-center">Output</th>
                                        <th className="p-4 text-center">Extra</th>
                                        <th className="p-4 text-center">Rejection</th>
                                        <th className="p-4 text-right">Cost (₹)</th>
                                        <th className="p-4">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filteredLogs.map((log) => {
                                        const isUrg = log.orderPriority === 'urgent';
                                        const isMix = log.orderPriority === 'mixed';
                                        return (
                                            <tr
                                                key={log.id}
                                                className={`hover:bg-slate-50 transition-colors ${isUrg
                                                        ? 'border-l-4 border-red-500 bg-red-50/20'
                                                        : isMix
                                                            ? 'border-l-4 border-amber-400 bg-amber-50/15'
                                                            : ''
                                                    }`}
                                            >
                                                <td className="p-4 font-bold text-indigo-600">{log.batchNo}</td>
                                                <td className="p-4">
                                                    {isUrg ? (
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-700 text-[10px] font-bold rounded-full uppercase">
                                                            <AlertTriangle className="w-3 h-3" /> Urgent
                                                        </span>
                                                    ) : isMix ? (
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-bold rounded-full uppercase">
                                                            ⚡ Mixed
                                                        </span>
                                                    ) : (
                                                        <span className="text-xs text-slate-400 font-medium">Normal</span>
                                                    )}
                                                </td>
                                                <td className="p-4">
                                                    <div className="text-sm font-semibold text-slate-800">{log.customerName}</div>
                                                    {log.partyCode && log.partyCode !== '-' && (
                                                        <div className="text-xs font-bold text-slate-400">{log.partyCode}</div>
                                                    )}
                                                </td>
                                                <td className="p-4 text-xs font-bold text-blue-600">{log.rudraCode}</td>
                                                <td className="p-4 text-sm font-medium text-slate-700">{log.stage}</td>
                                                <td className="p-4 text-center font-semibold text-slate-700">{log.inputQty}</td>
                                                <td className="p-4 text-center">
                                                    <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-full">
                                                        {log.outputQty} Pcs
                                                    </span>
                                                </td>
                                                <td className="p-4 text-center">
                                                    <span className="px-2.5 py-1 bg-orange-50 text-orange-700 text-xs font-bold rounded-full">
                                                        +{log.extraQty || 0}
                                                    </span>
                                                </td>
                                                <td className="p-4 text-center">
                                                    <span className="px-2.5 py-1 bg-red-50 text-red-600 text-xs font-bold rounded-full">
                                                        {log.rejectionQty || 0}
                                                    </span>
                                                </td>
                                                <td className="p-4 text-right text-sm font-bold text-slate-800">
                                                    ₹{Number(log.totalCost || 0).toLocaleString('en-IN')}
                                                </td>
                                                <td className="p-4">
                                                    <span
                                                        className={`px-2.5 py-1 text-xs font-bold rounded-full uppercase ${log.status === 'Dispatched'
                                                                ? 'bg-blue-100 text-blue-700'
                                                                : log.status === 'Completed' || log.status === 'Approved'
                                                                    ? 'bg-green-100 text-green-700'
                                                                    : 'bg-orange-100 text-orange-700'
                                                            }`}
                                                    >
                                                        {log.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {filteredLogs.length === 0 && (
                                        <tr>
                                            <td colSpan={11} className="p-12 text-center text-slate-400">
                                                No production logs found for this filter.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ) : activeTab === 'stages' ? (
                    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse min-w-[800px]">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                                        <th className="p-4">Process Stage / Department</th>
                                        <th className="p-4 text-center">Batches Handled</th>
                                        <th className="p-4 text-center">Total Input</th>
                                        <th className="p-4 text-center">Good Output</th>
                                        <th className="p-4 text-center">Extra (To Inv)</th>
                                        <th className="p-4 text-center">Rejection / Scrap</th>
                                        <th className="p-4 text-center">Raw Material (KG)</th>
                                        <th className="p-4 text-right">Department Cost (₹)</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filteredStages.map((st) => (
                                        <tr key={st.stageName} className="hover:bg-slate-50">
                                            <td className="p-4 font-bold text-indigo-600">{st.stageName}</td>
                                            <td className="p-4 text-center font-semibold text-slate-700">{st.ordersCount}</td>
                                            <td className="p-4 text-center font-semibold text-slate-800">{st.inputPcs} Pcs</td>
                                            <td className="p-4 text-center">
                                                <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-full">
                                                    {st.outputPcs} Pcs
                                                </span>
                                            </td>
                                            <td className="p-4 text-center">
                                                <span className="px-2.5 py-1 bg-orange-50 text-orange-700 text-xs font-bold rounded-full">
                                                    +{st.extraPcs} Pcs
                                                </span>
                                            </td>
                                            <td className="p-4 text-center">
                                                <span className="px-2.5 py-1 bg-red-50 text-red-600 text-xs font-bold rounded-full">
                                                    {st.rejectionPcs} Pcs
                                                </span>
                                            </td>
                                            <td className="p-4 text-center text-sm font-semibold text-slate-600">
                                                {st.rawKg} Kg
                                            </td>
                                            <td className="p-4 text-right font-bold text-slate-800">
                                                ₹{Number(st.totalCost || 0).toLocaleString('en-IN')}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ) : (
                    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse min-w-[750px]">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                                        <th className="p-4">SKU / Code</th>
                                        <th className="p-4">Material / Part Name</th>
                                        <th className="p-4">Inventory Group</th>
                                        <th className="p-4 text-center">Category</th>
                                        <th className="p-4 text-right">Physical Stock</th>
                                        <th className="p-4 text-right">Reserved (In Process)</th>
                                        <th className="p-4 text-right">Total Valuation (₹)</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filteredInventory.map((item) => (
                                        <tr key={item.id} className="hover:bg-slate-50">
                                            <td className="p-4 font-bold text-indigo-600">{item.itemCode}</td>
                                            <td className="p-4 text-sm font-semibold text-slate-800">{item.name}</td>
                                            <td className="p-4 text-sm text-slate-600">{item.groupName}</td>
                                            <td className="p-4 text-center">
                                                <span className={`px-2.5 py-1 text-xs font-bold rounded-full ${item.category === 'Rejected' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-700'
                                                    }`}>
                                                    {item.category}
                                                </span>
                                            </td>
                                            <td className="p-4 text-right font-bold text-slate-800">
                                                {item.stock} {item.uom}
                                            </td>
                                            <td className="p-4 text-right">
                                                {item.reservedInProcess > 0 ? (
                                                    <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-xs font-bold rounded-full">
                                                        🟡 {item.reservedInProcess} {item.uom}
                                                    </span>
                                                ) : (
                                                    <span className="text-xs text-slate-400">-</span>
                                                )}
                                            </td>
                                            <td className="p-4 text-right text-sm font-bold text-indigo-600">
                                                ₹{Number(item.totalValue || 0).toLocaleString('en-IN')}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

const ReportKpiCard = ({ title, value, subtitle, icon, bgColor }) => (
    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
        <div className={`w-12 h-12 rounded-xl ${bgColor} flex items-center justify-center shrink-0`}>
            {icon}
        </div>
        <div className="min-w-0">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-0.5">{title}</h3>
            <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-slate-800 truncate">{value}</span>
                {subtitle && <span className="text-xs text-slate-500 font-medium truncate">{subtitle}</span>}
            </div>
        </div>
    </div>
);