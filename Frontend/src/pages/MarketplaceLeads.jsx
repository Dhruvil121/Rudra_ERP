import { useState } from 'react';
import { Search, Loader2, Globe, CheckCircle, XCircle, Phone, ArrowLeft, Building2, User } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { leadApi } from '../services/api/leadApi';
import { useFeedback } from '../context/FeedbackContext';

export default function MarketplaceLeads() {
    const [view, setView] = useState('list'); // 'list' | 'detail'
    const [selectedLead, setSelectedLead] = useState(null);

    const handleNavigate = (newView, lead = null) => {
        setSelectedLead(lead);
        setView(newView);
    };

    return (
        <div className="w-full">
            {view === 'list' && <LeadList onNavigate={handleNavigate} />}
            {view === 'detail' && <LeadDetail lead={selectedLead} onNavigate={handleNavigate} />}
        </div>
    );
}

function LeadList({ onNavigate }) {
    const [searchTerm, setSearchTerm] = useState('');
    const [filterSource, setFilterSource] = useState('All');
    const [filterStatus, setFilterStatus] = useState('All');

    const {
        data: leads = [],
        isLoading,
        isError,
        error
    } = useQuery({
        queryKey: [
            'leads',
            {
                search: searchTerm,
                source: filterSource,
                status: filterStatus
            }
        ],
        queryFn: () =>
            leadApi.getLeads({
                search: searchTerm,
                source: filterSource,
                status: filterStatus
            })
    });

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center pb-4 border-b border-slate-200">
                <div>
                    <h1 className="text-xl font-bold text-slate-800">Marketplace Leads</h1>
                    <p className="text-sm text-slate-500">Incoming inquiries from external platforms</p>
                </div>
            </div>

            <div className="flex flex-wrap gap-4 items-center bg-white p-3 rounded-md shadow-sm border border-slate-100">
                <div className="relative w-72">
                    <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search Customer or Product..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-3 py-1.5 text-sm bg-slate-50 border border-slate-200 rounded focus:outline-none focus:border-slate-400"
                    />
                </div>

                <select
                    value={filterSource}
                    onChange={(e) => setFilterSource(e.target.value)}
                    className="py-1.5 px-3 text-sm bg-slate-50 border border-slate-200 rounded focus:outline-none focus:border-slate-400"
                >
                    <option value="All">All Sources</option>
                    <option value="INDIAMART">IndiaMART</option>
                    <option value="JUSTDIAL">Justdial</option>
                    <option value="TRADEINDIA">TradeIndia</option>
                    <option value="WEBSITE">Website</option>
                    <option value="WHATSAPP">WhatsApp</option>
                </select>

                <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="py-1.5 px-3 text-sm bg-slate-50 border border-slate-200 rounded focus:outline-none focus:border-slate-400"
                >
                    <option value="All">All Statuses</option>
                    <option value="NEW">New</option>
                    <option value="CONTACTED">Contacted</option>
                    <option value="FOLLOW_UP">Follow Up</option>
                    <option value="QUOTED">Quoted</option>
                    <option value="WON">Won</option>
                    <option value="LOST">Lost</option>
                </select>
            </div>

            {isLoading && (
                <div className="flex justify-center items-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
                </div>
            )}

            {isError && (
                <div className="p-6 text-center text-red-500 font-medium bg-red-50 rounded-md">
                    Failed to load leads. Make sure the backend is running.
                </div>
            )}

            {!isLoading && !isError && (
                <div className="bg-white rounded-md shadow-sm border border-slate-100 overflow-hidden">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead className="bg-slate-50 border-b border-slate-100 text-slate-500">
                            <tr>
                                <th className="px-4 py-3 font-medium">Customer</th>
                                <th className="px-4 py-3 font-medium">Source</th>
                                <th className="px-4 py-3 font-medium">Product</th>
                                <th className="px-4 py-3 font-medium">Status</th>
                                <th className="px-4 py-3 font-medium">Date</th>
                                <th className="px-4 py-3 font-medium text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {(leads || []).map(lead => (
                                <tr key={lead._id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-4 py-3">
                                        <div className="font-medium text-slate-800">{lead.customerName}</div>
                                        <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                                            <Phone className="w-3 h-3" /> {lead.mobile}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`px-2 py-0.5 rounded text-xs font-medium border ${lead.source === 'INDIAMART' ? 'bg-teal-50 text-teal-700 border-teal-200' :
                                            lead.source === 'JUSTDIAL' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                                                'bg-blue-50 text-blue-700 border-blue-200'
                                            }`}>
                                            {lead.source}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-slate-600 truncate max-w-[200px]">
                                        {lead.product || 'N/A'}
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`px-2 py-0.5 rounded-sm text-[10px] uppercase font-bold tracking-wide ${lead.status === 'NEW' ? 'bg-green-100 text-green-700' :
                                            lead.status === 'WON' ? 'bg-purple-100 text-purple-700' :
                                                lead.status === 'LOST' ? 'bg-red-100 text-red-700' :
                                                    'bg-slate-100 text-slate-700'
                                            }`}>
                                            {lead.status}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-slate-500 text-xs">
                                        {new Date(lead.createdAt).toLocaleDateString()}
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <button
                                            onClick={() => onNavigate('detail', lead)}
                                            className="text-purple-600 hover:text-purple-800 font-medium text-sm"
                                        >
                                            View
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {(!leads || leads.length === 0) && (
                                <tr>
                                    <td colSpan="6" className="px-4 py-12 text-center text-slate-500">
                                        No leads found matching your filters.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

function LeadDetail({ lead, onNavigate }) {
    const queryClient = useQueryClient();
    const { showToast } = useFeedback();

    const updateLeadMutation = useMutation({
        mutationFn: (newStatus) => leadApi.updateLead(lead._id, { status: newStatus }),
        onSuccess: () => {
            queryClient.invalidateQueries(['leads']);
            showToast('Lead status updated', 'success');
        },
        onError: (error) => {
            showToast('Failed to update status: ' + error.message, 'error');
        }
    });

    if (!lead) return null;

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-4 pb-4 border-b border-slate-200">
                <button
                    onClick={() => onNavigate('list')}
                    className="p-2 -ml-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                    <h1 className="text-xl font-bold text-slate-800">Lead Details</h1>
                    <p className="text-sm text-slate-500">#{lead.externalLeadId} • {lead.source}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column - Details */}
                <div className="lg:col-span-2 space-y-4">
                    <div className="bg-white p-6 rounded-md shadow-sm border border-slate-100">
                        <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
                            <User className="w-4 h-4" /> Customer Information
                        </h3>
                        <div className="grid grid-cols-2 gap-y-4 gap-x-6 text-sm">
                            <div>
                                <label className="text-slate-500 block mb-1">Name</label>
                                <div className="font-medium text-slate-800">{lead.customerName}</div>
                            </div>
                            <div>
                                <label className="text-slate-500 block mb-1">Phone</label>
                                <div className="font-medium text-slate-800">{lead.mobile}</div>
                            </div>
                            <div>
                                <label className="text-slate-500 block mb-1">Email</label>
                                <div className="font-medium text-slate-800">{lead.email || '-'}</div>
                            </div>
                            <div>
                                <label className="text-slate-500 block mb-1">Company</label>
                                <div className="font-medium text-slate-800">{lead.company || '-'}</div>
                            </div>
                            <div>
                                <label className="text-slate-500 block mb-1">Location</label>
                                <div className="font-medium text-slate-800">
                                    {[lead.city, lead.state, lead.country].filter(Boolean).join(', ') || '-'}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-md shadow-sm border border-slate-100">
                        <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
                            <Globe className="w-4 h-4" /> Enquiry Details
                        </h3>
                        <div className="space-y-4 text-sm">
                            <div>
                                <label className="text-slate-500 block mb-1">Product</label>
                                <div className="font-medium text-slate-800">{lead.product || '-'}</div>
                            </div>
                            <div>
                                <label className="text-slate-500 block mb-1">Message</label>
                                <div className="p-3 bg-slate-50 rounded border border-slate-100 text-slate-700 whitespace-pre-wrap">
                                    {lead.message || 'No message provided.'}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column - Actions */}
                <div className="space-y-4">
                    <div className="bg-white p-6 rounded-md shadow-sm border border-slate-100">
                        <h3 className="font-semibold text-slate-800 mb-4">Current Status</h3>

                        <select
                            value={lead.status}
                            onChange={(e) => updateLeadMutation.mutate(e.target.value)}
                            disabled={updateLeadMutation.isPending}
                            className="w-full p-2 text-sm bg-slate-50 border border-slate-200 rounded focus:outline-none focus:border-purple-400 mb-4"
                        >
                            <option value="NEW">NEW</option>
                            <option value="CONTACTED">CONTACTED</option>
                            <option value="FOLLOW_UP">FOLLOW_UP</option>
                            <option value="QUOTED">QUOTED</option>
                            <option value="WON">WON</option>
                            <option value="LOST">LOST</option>
                        </select>

                        <div className="text-xs text-slate-500 space-y-2 mt-6">
                            <div className="flex justify-between">
                                <span>Created:</span>
                                <span>{new Date(lead.createdAt).toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Last Updated:</span>
                                <span>{new Date(lead.updatedAt).toLocaleString()}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
