import { useState } from 'react';
import { FormInput, FormSelect } from '../components/forms/FormInputs';
import { Layers } from 'lucide-react';

export default function AssemblingModule() {
    const [assemblyData, setAssemblyData] = useState({
        productId: '',
        quantity: '',
        stockSource: '',
    });

    const handleInputChange = (e) => {
        setAssemblyData({ ...assemblyData, [e.target.name]: e.target.value });
    };

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            <div className="flex items-center gap-4 mb-8">
                <div className="p-3 bg-blue-100 text-blue-600 rounded-xl">
                    <Layers className="w-6 h-6" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Assembling</h1>
                    <p className="text-sm text-slate-500 font-medium">Manage final assembly and stock source consumption</p>
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8">
                <form className="space-y-6">
                    <div className="grid grid-cols-2 gap-6">
                        <FormInput label="Final Product Code" name="productId" value={assemblyData.productId} onChange={handleInputChange} />
                        <FormInput label="Assembly Quantity" name="quantity" type="number" value={assemblyData.quantity} onChange={handleInputChange} />
                    </div>

                    <div className="p-6 bg-slate-50 border border-slate-200 rounded-xl">
                        <h3 className="text-sm font-semibold text-slate-700 mb-4">Select Component Stock Source</h3>
                        <div className="flex flex-col gap-3">
                            <label className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-lg cursor-pointer hover:border-blue-400 transition-colors">
                                <input
                                    type="radio"
                                    name="stockSource"
                                    value="buffing"
                                    checked={assemblyData.stockSource === 'buffing'}
                                    onChange={handleInputChange}
                                    className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                                />
                                <span className="font-medium text-slate-700">Old stock As through Buffing (WIP)</span>
                            </label>

                            <label className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-lg cursor-pointer hover:border-blue-400 transition-colors">
                                <input
                                    type="radio"
                                    name="stockSource"
                                    value="inventory"
                                    checked={assemblyData.stockSource === 'inventory'}
                                    onChange={handleInputChange}
                                    className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                                />
                                <span className="font-medium text-slate-700">Old stock as Inventory (Finished Goods)</span>
                            </label>
                        </div>
                    </div>

                    <div className="flex justify-end pt-4">
                        <button type="button" className="px-8 py-3 rounded-lg font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-sm">
                            Confirm Assembly
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}