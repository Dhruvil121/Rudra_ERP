import { useState } from 'react';
import { FileText, Calendar, Download, Printer, TrendingUp, Package, Cog, Loader2 } from 'lucide-react';
import { FormInput } from '../components/forms/FormInputs';
import { useReports } from '../hooks/useReportsData';

export default function ReportsModule() {
    const [reportType, setReportType] = useState('daily'); // 'daily' or 'monthly'
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); // e.g., '2026-09'

    const activeDate = reportType === 'daily' ? selectedDate : selectedMonth;
    const { data, isLoading, isError } = useReports(reportType, activeDate);

    // Fallback data if loading or empty
    const currentStats = data?.summary || { production: '0 Pcs', assembly: '0 Boxes', waste: '0 Pcs' };
    const logs = data?.logs || [];

    return (
        <div className="max-w-7xl mx-auto space-y-6">

            {/* MODULE HEADER & CONTROLS */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-red-100 text-red-600 rounded-xl">
                        <FileText className="w-6 h-6" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800">Production Reports</h1>
                        <p className="text-sm text-slate-500 font-medium">View Daily & Monthly manufacturing insights</p>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
                    {/* Daily / Monthly Toggle */}
                    <div className="flex p-1 bg-slate-100 rounded-lg w-full sm:w-auto">
                        <button
                            onClick={() => setReportType('daily')}
                            className={`flex-1 sm:flex-none px-6 py-2 rounded-md font-semibold text-sm transition-all ${reportType === 'daily' ? 'bg-white text-red-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            Daily
                        </button>
                        <button
                            onClick={() => setReportType('monthly')}
                            className={`flex-1 sm:flex-none px-6 py-2 rounded-md font-semibold text-sm transition-all ${reportType === 'monthly' ? 'bg-white text-red-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            Monthly
                        </button>
                    </div>

                    <div className="w-[1px] h-8 bg-slate-200 hidden sm:block"></div>

                    {/* Export Actions */}
                    <div className="flex gap-2 w-full sm:w-auto">
                        <button className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-800 font-medium rounded-lg transition-colors">
                            <Printer className="w-4 h-4" />
                            <span className="hidden sm:inline">Print</span>
                        </button>
                        <button className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-red-50 border border-red-100 text-red-600 hover:bg-red-100 font-medium rounded-lg transition-colors">
                            <Download className="w-4 h-4" />
                            <span className="hidden sm:inline">Export PDF</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* FILTER SECTION */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 flex items-end gap-6">
                <div className="w-full md:w-64">
                    {reportType === 'daily' ? (
                        <FormInput
                            label="Select Date"
                            name="dailyDate"
                            type="date"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            className="mb-0"
                        />
                    ) : (
                        <FormInput
                            label="Select Month"
                            name="monthlyDate"
                            type="month"
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(e.target.value)}
                            className="mb-0"
                        />
                    )}
                </div>
                {isLoading && (
                    <div className="flex items-center gap-2 text-slate-500 font-medium mb-4">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Fetching data...
                    </div>
                )}
            </div>

            {/* SUMMARY CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
                    <div className="p-4 bg-orange-50 text-orange-600 rounded-full">
                        <Cog className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-slate-500 mb-1">Total Processed (Input)</p>
                        <h3 className="text-2xl font-bold text-slate-800">{currentStats.production}</h3>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
                    <div className="p-4 bg-blue-50 text-blue-600 rounded-full">
                        <Package className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-slate-500 mb-1">Final Assembly</p>
                        <h3 className="text-2xl font-bold text-slate-800">{currentStats.assembly}</h3>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
                    <div className="p-4 bg-red-50 text-red-500 rounded-full">
                        <TrendingUp className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-slate-500 mb-1">Material Loss / Waste</p>
                        <h3 className="text-2xl font-bold text-slate-800">{currentStats.waste}</h3>
                    </div>
                </div>
            </div>

            {/* DETAILED DATA TABLE */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-slate-400" />
                        <h2 className="text-lg font-bold text-slate-700">
                            {reportType === 'daily' ? `Log for ${selectedDate}` : `Summary for ${selectedMonth}`}
                        </h2>
                    </div>
                    <span className="text-sm font-medium text-slate-500">{logs.length} process(es) found</span>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-slate-200 text-sm font-semibold text-slate-600 bg-white">
                                <th className="p-4">Batch No. (Order)</th>
                                <th className="p-4">Latest Process Stage</th>
                                <th className="p-4">Input Qty</th>
                                <th className="p-4">Output Qty</th>
                                <th className="p-4">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {isLoading ? (
                                <tr>
                                    <td colSpan="5" className="p-8 text-center text-slate-500">
                                        <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                                        Loading logs...
                                    </td>
                                </tr>
                            ) : logs.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="p-8 text-center text-slate-500 font-medium">
                                        No process data available for the selected timeframe.
                                    </td>
                                </tr>
                            ) : (
                                logs.map((log) => (
                                    <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="p-4 font-medium text-slate-800">{log.batchNo || '-'}</td>
                                        <td className="p-4 text-slate-600">{log.stage || 'N/A'}</td>
                                        <td className="p-4 text-slate-600">{log.inputQty}</td>
                                        <td className="p-4 text-slate-600">{log.outputQty}</td>
                                        <td className="p-4">
                                            <span className={`px-3 py-1 text-xs font-bold rounded-full ${
                                                log.status === 'Completed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                                            }`}>
                                                {log.status || 'In Progress'}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}