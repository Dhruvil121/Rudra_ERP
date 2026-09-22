import { useAuth } from "../../context/AuthContext";

// Define ALL_FIELDS exactly as you had them
const ALL_FIELDS = [
    { key: "size", label: "Size", type: "text" },
    { key: "size_unit", label: "Size Unit", type: "select", options: ["Pieces", "Inches"] },
    { key: "kg", label: "KG (Raw Material)", type: "number" },
    { key: "inputQty", label: "Pieces Required", type: "number" },
    { key: "rejection", label: "Rejection", type: "number", editable: true },
    { key: "extra", label: "Extra (To Inventory)", type: "number", editable: true },
    { key: "output", label: "Output To Next Process", type: "number", calculated: true },
    { key: "cutting", label: "Cutting (Auto)", type: "number", calculated: true },
    { key: "rate", label: "Rate", type: "number", editable: true },
    { key: "totalCost", label: "Total Cost", type: "number", calculated: true },
];

export default function DynamicProcessStep({
    step, index, totalSteps, onFieldChange
}) {
    const { user, hasPermission } = useAuth();

    // RBAC LOGIC: Check if user is Super Admin OR has explicit permission for this specific process name
    const isAuthorized = user?.role === 'super_admin' || hasPermission('process', step.processName);

    const activeFieldKeys = step.activeFields || [];
    const fields = ALL_FIELDS.filter(f => activeFieldKeys.includes(f.key));

    const renderField = (field) => {
        const value = step.fields?.[field.key] ?? (field.type === "number" ? 0 : "");
        const isCalculated = field.calculated;

        // Lock field if calculated OR if user lacks permission
        const isLocked = isCalculated || !isAuthorized;

        if (field.type === "number") {
            const bgColor = isLocked ? "bg-slate-50 cursor-not-allowed opacity-70" : "bg-white";

            return (
                <div>
                    <label className="block text-sm font-medium mb-2 text-slate-600">{field.label}</label>
                    <input
                        type="number"
                        value={value}
                        onChange={(e) => onFieldChange(step.id, field.key, Number(e.target.value))}
                        readOnly={isLocked}
                        className={`w-full border border-slate-200 rounded-xl px-4 py-3 ${bgColor} focus:outline-none focus:ring-2 focus:ring-blue-500`}
                    />
                </div>
            );
        }

        if (field.type === "text") {
            const bgColor = isLocked ? "bg-slate-50 cursor-not-allowed opacity-70" : "bg-white";
            return (
                <div>
                    <label className="block text-sm font-medium mb-2">{field.label}</label>
                    <input
                        type="text"
                        value={value}
                        onChange={(e) => onFieldChange(step.id, field.key, e.target.value)}
                        readOnly={isLocked}
                        className={`w-full border border-slate-200 rounded-xl px-4 py-3 ${bgColor} focus:outline-none focus:ring-2 focus:ring-blue-500`}
                    />
                </div>
            );
        }

        return null;
    };

    return (
        <div className="flex gap-6 relative">
            {/* Visual lock icon for unauthorized users */}
            {!isAuthorized && (
                <div className="absolute top-0 right-0 bg-red-100 text-red-600 px-3 py-1 text-xs font-bold rounded-bl-xl rounded-tr-xl">
                    View Only — Unauthorized
                </div>
            )}

            <div className="flex flex-col items-center">
                <div className="w-12 h-12 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold text-xl">
                    {index + 1}
                </div>
                {index < totalSteps - 1 && <div className="w-[2px] h-32 bg-slate-200 mt-2"></div>}
            </div>

            <div className="flex-1 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                <h3 className="text-lg font-bold text-slate-800 mb-6">{step.processName}</h3>

                <div className={`grid gap-4 items-end`} style={{ gridTemplateColumns: `repeat(${fields.length || 1}, minmax(0, 1fr))` }}>
                    {fields.map((field) => (
                        <div key={field.key}>
                            {renderField(field)}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}