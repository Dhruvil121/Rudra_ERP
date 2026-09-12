import { useState } from 'react';
import { FormInput, FormSelect } from '../components/forms/FormInputs';
import { Cog, Scale, Hammer, Droplets, BookOpen } from 'lucide-react';

const INITIAL_PROCESS_STATE = {
    batchNo: '',
    rawMaterial: 'casting',
    turningWeightBefore: '',
    turningWeightAfter: '',
    buffingType: '',
    platingType: '',
};

const PLATING_OPTIONS = [
    { value: 'nickel', label: 'Nickle' },
    { value: 'nickel_mate', label: 'Nickle + Mate' },
    { value: 'glossy', label: 'Glossy' },
    { value: 'antic_brass', label: 'Antic Brass' },
    { value: 'pvd', label: 'PVD' },
    { value: 'bn_mate', label: 'BN Mate' },
    { value: 'direct_antic', label: 'Direct Antic' },
    { value: 'direct_zed_black', label: 'Direct Zed Black' },
    { value: 'other', label: 'Other Color Process' },
];

export default function ProcessModule() {
    const [formData, setFormData] = useState(INITIAL_PROCESS_STATE);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleSave = (e) => {
        e.preventDefault();
        console.log('Saving Process Data:', formData);
    };

    return (
        <div className="max-w-5xl mx-auto space-y-6">
            <div className="flex items-center gap-4 mb-8">
                <div className="p-3 bg-green-100 text-green-600 rounded-xl">
                    <Cog className="w-6 h-6 animate-[spin_4s_linear_infinite]" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Manufacturing Process</h1>
                    <p className="text-sm text-slate-500 font-medium">Track batches through Turning, Buffing, and Plating</p>
                </div>
            </div>

            <form onSubmit={handleSave} className="space-y-6">
                {/* BATCH INFO */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 flex gap-6 items-end">
                    <div className="flex-1">
                        <FormInput label="Batch / Lot No." name="batchNo" value={formData.batchNo} onChange={handleInputChange} placeholder="e.g., LOT-2026-09" />
                    </div>
                    <div className="flex-1">
                        <FormSelect label="Raw Material Base" name="rawMaterial" value={formData.rawMaterial} onChange={handleInputChange} options={[{ value: 'casting', label: 'Casting' }]} />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* STAGE 1: TURNING */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                        <div className="flex items-center gap-2 mb-6 pb-4 border-b border-slate-100">
                            <Scale className="w-5 h-5 text-green-500" />
                            <h2 className="text-lg font-bold text-slate-800">1. Turning</h2>
                        </div>
                        <FormInput
                            label="Weight Before (kg)"
                            name="turningWeightBefore"
                            type="number"
                            value={formData.turningWeightBefore}
                            onChange={handleInputChange}
                        />
                        <FormInput
                            label="After Machine Process (kg)"
                            name="turningWeightAfter"
                            type="number"
                            value={formData.turningWeightAfter}
                            onChange={handleInputChange}
                        />
                        {formData.turningWeightBefore && formData.turningWeightAfter && (
                            <div className="mt-4 p-3 bg-slate-50 rounded-lg text-sm text-slate-600 flex justify-between">
                                <span>Material Loss:</span>
                                <span className="font-bold text-red-500">
                                    {(formData.turningWeightBefore - formData.turningWeightAfter).toFixed(2)} kg
                                </span>
                            </div>
                        )}
                    </div>

                    {/* STAGE 2: BUFFING */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                        <div className="flex items-center gap-2 mb-6 pb-4 border-b border-slate-100">
                            <Hammer className="w-5 h-5 text-green-500" />
                            <h2 className="text-lg font-bold text-slate-800">2. Buffing</h2>
                        </div>
                        <FormSelect
                            label="Buffing Process"
                            name="buffingType"
                            value={formData.buffingType}
                            onChange={handleInputChange}
                            options={[
                                { value: 'ambridel', label: 'Ambridel' },
                                { value: 'buff', label: 'Buff' },
                                { value: 'both', label: 'Ambridel & Buff' }
                            ]}
                        />
                    </div>

                    {/* STAGE 3: PLATING & BOM */}
                    <div className="bg-white rounded-2xl shadow-sm border border-green-200 p-6 relative overflow-hidden">
                        <div className="absolute top-0 right-0 bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-bl-lg">
                            BOM Linked
                        </div>
                        <div className="flex items-center gap-2 mb-6 pb-4 border-b border-slate-100">
                            <Droplets className="w-5 h-5 text-green-500" />
                            <h2 className="text-lg font-bold text-slate-800">3. Plating</h2>
                        </div>
                        <FormSelect
                            label="Plating / Color Process"
                            name="platingType"
                            value={formData.platingType}
                            onChange={handleInputChange}
                            options={PLATING_OPTIONS}
                        />

                        <button type="button" className="w-full mt-4 flex items-center justify-center gap-2 px-4 py-2 bg-green-50 text-green-700 hover:bg-green-100 font-semibold rounded-lg transition-colors border border-green-200">
                            <BookOpen className="w-4 h-4" />
                            View Linked BOM
                        </button>
                    </div>
                </div>

                <div className="flex justify-end pt-4">
                    <button type="submit" className="px-8 py-3 rounded-lg font-semibold text-white bg-green-600 hover:bg-green-700 transition-colors shadow-sm">
                        Update Process Tracking
                    </button>
                </div>
            </form>
        </div>
    );
}