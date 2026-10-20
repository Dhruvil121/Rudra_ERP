import { useState, useMemo } from 'react';
import {
    FileText, Calendar, Download, Printer, TrendingUp, Package,
    Cog, Loader2, Search, Factory, IndianRupee, Layers, Archive, RefreshCw
} from 'lucide-react';
import { useReports } from '../hooks/useReportsData';
import { useOrders } from '../hooks/useOrderData';
import { useInventory } from '../hooks/useInventoryData';
import { useFeedback } from '../context/FeedbackContext';

export default function ReportsModule() {
    // Default to 'all' or 'monthly' so the user immediately sees their active factory data
    const [reportType, setReportType] = useState('monthly'); // 'daily' | 'monthly' | 'all'
    const [activeTab, setActiveTab] = useState('logs'); // 'logs' | 'stages' | 'inventory'
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));

    const activeDate = reportType === 'daily' ? selectedDate : reportType === 'monthly' ? selectedMonth : '';
    const { data, isLoading, refetch, isFetching } = useReports(reportType, activeDate);
    const { data: liveOrders = [] } = useOrders();
    const { data: liveInventory = [] } = useInventory();
    const { showToast } = useFeedback();

    // Build real fallback logs from liveOrders if the backend /api/reports route hasn't been restarted yet
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
                    rudraCode: (o.items || []).map(i => i.rudraCode).filter(Boolean).join(', ') || '-',
                    orderSets: sets,
                    stepsCount: 0,
                    stage: o.status === 'Approved' ? 'Approved for Production' : 'Order Created',
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
                stock: Number(item.stock || 0),
                uom: item.uom || 'Pcs',
                unitCost: Number(item.unitCost || 0),
                totalValue: Number(item.stock || 0) * Number(item.unitCost || 0)
            }))
        );
    }, [liveInventory]);

    const rawLogs = data?.logs || fallbackLogs;
    const rawStages = data?.stageBreakdown || [];
    const rawInventory = data?.inventoryReport?.length > 0 ? data.inventoryReport : fallbackInventory;

    // Filter datasets by Search Term
    const filteredLogs = useMemo(() => {
        const term = searchTerm.toLowerCase();
        return rawLogs.filter(
            l =>
                !term ||
                l.batchNo?.toLowerCase().includes(term) ||
                l.customerName?.toLowerCase().includes(term) ||
                l.partyCode?.toLowerCase().includes(term) ||
                l.rudraCode?.toLowerCase().includes(term) ||
                l.stage?.toLowerCase().includes(term)
        );
    }, [rawLogs, searchTerm]);

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

    // Calculate live summary stats from the active filtered logs so cards always match the table
    const computedSummary = useMemo(() => {
        if (data?.summary && !searchTerm) return data.summary;
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
    }, [data?.summary, filteredLogs, searchTerm]);

    // ==========================================
    // EXPORT TO CSV (EXCEL)
    // ==========================================
    const handleExportCSV = () => {
        let headers = [];
        let rows = [];

        if (activeTab === 'logs') {
            headers = [
                'Order ID (PI No)',
                'Party Code',
                'Customer Name',
                'Rudra Code',
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
                'In Stock',
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

    // ==========================================
    // EXPORT PDF / PRINT REPORT
    // ==========================================
    const handlePrintOrPDF = () => {
        const timeframeLabel =
            reportType === 'daily'
                ? `Daily Report (${selectedDate})`
                : reportType === 'monthly'
                    ? `Monthly Report (${selectedMonth})`
                    : 'All-Time Cumulative Report';

        const tableHtml =
            activeTab === 'logs'
                ? `
                <table>
                    <thead>
                        <tr>
                            <th>PI No.</th>
                            <th>Customer (Party)</th>
                            <th>Rudra Code</th>
                            <th>Latest Stage</th>
                            <th style="text-align:right">Input</th>
                            <th style="text-align:right">Output</th>
                            <th style="text-align:right">Extra</th>
                            <th style="text-align:right">Reject</th>
                            <th style="text-align:right">Boxes</th>
                            <th style="text-align:right">Cost (₹)</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${filteredLogs
                    .map(
                        l => `
                            <tr>
                                <td><strong>${l.batchNo}</strong></td>
                                <td>${l.customerName}${l.partyCode !== '-' ? `(${l.partyCode})` : ''}</td>
                                <td><strong>${l.rudraCode}</strong></td>
                                <td>${l.stage}</td>
                                <td style="text-align:right">${l.inputQty}</td>
                                <td style="text-align:right">${l.outputQty}</td>
                                <td style="text-align:right">${l.extraQty}</td>
                                <td style="text-align:right">${l.rejectionQty}</td>
                                <td style="text-align:right">${l.boxes}</td>
                                <td style="text-align:right">₹${Number(l.totalCost || 0).toLocaleString('en-IN')}</td>
                                <td>${l.status}</td>
                            </tr>
                        `
                    )
                    .join('')}
                    </tbody>
                </table>`
                : activeTab === 'stages'
                    ? `
                <table>
                    <thead>
                        <tr>
                            <th>Process Stage</th>
                            <th style="text-align:right">Batches</th>
                            <th style="text-align:right">Total Input</th>
                            <th style="text-align:right">Good Output</th>
                            <th style="text-align:right">Extra (Inv)</th>
                            <th style="text-align:right">Rejection</th>
                            <th style="text-align:right">Raw Material</th>
                            <th style="text-align:right">Total Cost (₹)</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${filteredStages
                        .map(
                            s => `
                            <tr>
                                <td><strong>${s.stageName}</strong></td>
                                <td style="text-align:right">${s.ordersCount}</td>
                                <td style="text-align:right">${s.inputPcs} Pcs</td>
                                <td style="text-align:right">${s.outputPcs} Pcs</td>
                                <td style="text-align:right">${s.extraPcs} Pcs</td>
                                <td style="text-align:right">${s.rejectionPcs} Pcs</td>
                                <td style="text-align:right">${s.rawKg} Kg</td>
                                <td style="text-align:right">₹${Number(s.totalCost || 0).toLocaleString('en-IN')}</td>
                            </tr>
                        `
                        )
                        .join('')}
                    </tbody>
                </table>`
                    : `
                <table>
                    <thead>
                        <tr>
                            <th>SKU Code</th>
                            <th>Material Name</th>
                            <th>Group</th>
                            <th>Category</th>
                            <th style="text-align:right">In Stock</th>
                            <th style="text-align:right">Unit Cost (₹)</th>
                            <th style="text-align:right">Valuation (₹)</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${filteredInventory
                        .map(
                            i => `
                            <tr>
                                <td><strong>${i.itemCode}</strong></td>
                                <td>${i.name}</td>
                                <td>${i.groupName}</td>
                                <td>${i.category}</td>
                                <td style="text-align:right">${i.stock}${i.uom}</td>
                                <td style="text-align:right">₹${Number(i.unitCost || 0).toLocaleString('en-IN')}</td>
                                <td style="text-align:right"><strong>₹${Number(i.totalValue || 0).toLocaleString('en-IN')}</strong></td>
                            </tr>
                        `
                        )
                        .join('')}
                    </tbody>
                </table>`;

        const printWindow = window.open('', '_blank', 'width=1100,height=800');
        if (!printWindow) {
            window.print();
            return;
        }

        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Rudra ERP - ${timeframeLabel}</title>
                <style>
                    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #1e293b; padding: 28px; }
                    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #e2e8f0; padding-bottom: 16px; margin-bottom: 20px; }
                    .header h1 { margin: 0; font-size: 22px; color: #0f172a; }
                    .header p { margin: 4px 0 0; font-size: 12px; color: #64748b; }
                    .kpis { display: grid; grid-template-columns: repeat(5, 1fr); gap: 12px; margin-bottom: 24px; }
                    .kpi { border: 1px solid #cbd5e1; border-radius: 8px; padding: 10px 14px; background: #f8fafc; }
                    .kpi span { font-size: 10px; text-transform: uppercase; color: #64748b; font-weight: 700; display: block; }
                    .kpi strong { font-size: 16px; color: #0f172a; margin-top: 4px; display: block; }
                    table { width: 100%; border-collapse: collapse; font-size: 12px; }
                    th { background: #f1f5f9; color: #475569; text-transform: uppercase; font-size: 10px; padding: 10px 8px; border-bottom: 2px solid #cbd5e1; text-align: left; }
                    td { padding: 9px 8px; border-bottom: 1px solid #e2e8f0; }
                    @media print { body { padding: 0; } }
                </style>
            </head>
            <body>
                <div class="header">
                    <div>
                        <h1>RUDRA HARDWARE ERP — PRODUCTION & INVENTORY REPORT</h1>
                        <p>${timeframeLabel} • Generated on ${new Date().toLocaleString('en-IN')}</p>
                    </div>
                </div>
                <div class="kpis">
                    <div class="kpi"><span>Total Input</span><strong>${computedSummary.production}</strong></div>
                    <div class="kpi"><span>Good Output</span><strong>${computedSummary.goodOutput || '0 Pcs'}</strong></div>
                    <div class="kpi"><span>Extra To Inv.</span><strong>${computedSummary.extraInventory || '0 Pcs'}</strong></div>
                    <div class="kpi"><span>Scrap / Loss</span><strong>${computedSummary.waste} (${computedSummary.scrapRate || '0%'})</strong></div>
                    <div class="kpi"><span>Final Assembly</span><strong>${computedSummary.assembly}</strong></div>
                </div>
                ${tableHtml}
                <script>
                    window.onload = function() { window.print(); };
                </script>
            </body>
            </html>
        `);
        printWindow.document.close();
    };

    return (
        <div className="w-full">
            <div className="space-y-4 max-w-7xl mx-auto pb-16">
                {/* Top Header — Matches BOM Layout */}
                <div className="flex flex-wrap justify-between items-center gap-4 pb-4 border-b border-slate-200">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-indigo-100 text-indigo-600 rounded-xl">
                            <FileText className="w-6 h-6" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-slate-800">Production & Inventory Reports</h1>
                            <p className="text-sm text-slate-500">
                                Live manufacturing batch logs, stage-wise efficiency, scrap tracking & stock valuation
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <button
                            onClick={() => refetch()}
                            disabled={isFetching}
                            className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 text-slate-600 text-xs font-bold rounded-lg hover:bg-slate-50 shadow-sm transition-colors"
                        >
                            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin text-indigo-600' : ''}`} />
                            Refresh
                        </button>
                        <button
                            onClick={handlePrintOrPDF}
                            className="flex items-center gap-1.5 px-4 py-2 bg-white border border-slate-200 text-slate-700 text-sm font-semibold rounded-lg hover:bg-slate-50 shadow-sm transition-colors"
                        >
                            <Printer className="w-4 h-4 text-slate-500" />
                            Print / Save PDF
                        </button>
                        <button
                            onClick={handleExportCSV}
                            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 shadow-sm transition-colors"
                        >
                            <Download className="w-4 h-4" />
                            Export Excel (CSV)
                        </button>
                    </div>
                </div>

                {/* 6 KPI Summary Cards — Matches Dashboard & BOM Layout */}
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

                {/* Full-Width White Filter, Search & View Bar — Matches BOM Layout */}
                <div className="bg-white p-3 rounded-xl shadow-sm border border-slate-200 flex flex-wrap justify-between items-center gap-4">
                    <div className="flex flex-wrap items-center gap-3">
                        {/* Search Input */}
                        <div className="relative w-72">
                            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search PI No, Party, Rudra Code, Stage..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-9 pr-3 py-1.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500"
                            />
                        </div>

                        {/* Timeframe Selector (Daily / Monthly / All-Time) */}
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

                        {/* Date or Month Picker */}
                        {reportType === 'daily' && (
                            <div className="flex items-center gap-1.5">
                                <Calendar className="w-4 h-4 text-slate-400" />
                                <input
                                    type="date"
                                    value={selectedDate}
                                    onChange={(e) => setSelectedDate(e.target.value)}
                                    className="px-2.5 py-1 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 font-medium text-slate-700"
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
                                    className="px-2.5 py-1 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 font-medium text-slate-700"
                                />
                            </div>
                        )}
                    </div>

                    {/* Report Dataset Tabs */}
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

                {/* Full-Width Data Tables — Matches BOM Layout */}
                {isLoading ? (
                    <div className="bg-white rounded-xl border border-slate-200 p-12 flex justify-center">
                        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
                    </div>
                ) : activeTab === 'logs' ? (
                    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                                    <th className="p-4">Batch / PI No.</th>
                                    <th className="p-4">Customer & Party Code</th>
                                    <th className="p-4">Rudra Code</th>
                                    <th className="p-4">Latest Stage</th>
                                    <th className="p-4 text-center">Input</th>
                                    <th className="p-4 text-center">Output</th>
                                    <th className="p-4 text-center">Extra (Inv)</th>
                                    <th className="p-4 text-center">Rejection</th>
                                    <th className="p-4 text-center">Boxes</th>
                                    <th className="p-4 text-right">Cost (₹)</th>
                                    <th className="p-4">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredLogs.map((log) => (
                                    <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="p-4 font-bold text-indigo-600">{log.batchNo}</td>
                                        <td className="p-4">
                                            <div className="text-sm font-semibold text-slate-800">{log.customerName}</div>
                                            {log.partyCode && log.partyCode !== '-' && (
                                                <div className="text-xs font-bold text-slate-400">{log.partyCode}</div>
                                            )}
                                        </td>
                                        <td className="p-4 text-sm font-bold text-blue-600">{log.rudraCode}</td>
                                        <td className="p-4">
                                            <span className="text-sm font-medium text-slate-700">{log.stage}</span>
                                            {log.stepsCount > 0 && (
                                                <span className="block text-[11px] text-slate-400">
                                                    {log.stepsCount} step(s) active
                                                </span>
                                            )}
                                        </td>
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
                                        <td className="p-4 text-center font-bold text-blue-600">{log.boxes || 0}</td>
                                        <td className="p-4 text-right text-sm font-bold text-slate-800">
                                            ₹{Number(log.totalCost || 0).toLocaleString('en-IN')}
                                        </td>
                                        <td className="p-4">
                                            <span
                                                className={`px-2.5 py-1 text-xs font-bold rounded-full uppercase ${log.status === 'Completed' || log.status === 'Approved'
                                                        ? 'bg-green-100 text-green-700'
                                                        : log.status === 'In Progress'
                                                            ? 'bg-blue-100 text-blue-700'
                                                            : 'bg-orange-100 text-orange-700'
                                                    }`}
                                            >
                                                {log.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                                {filteredLogs.length === 0 && (
                                    <tr>
                                        <td colSpan={11} className="p-12 text-center text-slate-400">
                                            No production logs found for this timeframe. Switch to "All Time" to view all historical records.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                ) : activeTab === 'stages' ? (
                    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                        <table className="w-full text-left border-collapse">
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
                                {filteredStages.length === 0 && (
                                    <tr>
                                        <td colSpan={8} className="p-12 text-center text-slate-400">
                                            No process stage data recorded for this timeframe.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                                    <th className="p-4">SKU / Code</th>
                                    <th className="p-4">Material / Part Name</th>
                                    <th className="p-4">Inventory Group</th>
                                    <th className="p-4 text-center">Category</th>
                                    <th className="p-4 text-right">In Stock</th>
                                    <th className="p-4 text-right">Unit Cost (₹)</th>
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
                                            <span className="px-2.5 py-1 bg-slate-100 text-slate-700 text-xs font-bold rounded-full">
                                                {item.category}
                                            </span>
                                        </td>
                                        <td className="p-4 text-right">
                                            <span
                                                className={`px-2.5 py-1 text-xs font-bold rounded-full ${item.stock <= 10
                                                        ? 'bg-red-100 text-red-700'
                                                        : 'bg-emerald-50 text-emerald-700'
                                                    }`}
                                            >
                                                {item.stock} {item.uom}
                                            </span>
                                        </td>
                                        <td className="p-4 text-right text-sm font-semibold text-slate-600">
                                            ₹{Number(item.unitCost || 0).toLocaleString('en-IN')}
                                        </td>
                                        <td className="p-4 text-right text-sm font-bold text-indigo-600">
                                            ₹{Number(item.totalValue || 0).toLocaleString('en-IN')}
                                        </td>
                                    </tr>
                                ))}
                                {filteredInventory.length === 0 && (
                                    <tr>
                                        <td colSpan={7} className="p-12 text-center text-slate-400">
                                            No inventory items found.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
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