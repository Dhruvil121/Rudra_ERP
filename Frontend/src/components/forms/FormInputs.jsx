export function FormInput({ label, id, className = '', ...props }) {
    return (
        <div className="flex flex-col gap-1.5 mb-4">
            <label htmlFor={id} className="text-sm font-semibold text-slate-700">
                {label}
            </label>
            <input
                id={id}
                // Properly append custom classes (like uppercase) without breaking the base styles
                className={`px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all w-full ${className}`}
                {...props}
            />
        </div>
    );
}

export function FormSelect({ label, id, options, className = '', ...props }) {
    return (
        <div className="flex flex-col gap-1.5 mb-4">
            <label htmlFor={id} className="text-sm font-semibold text-slate-700">
                {label}
            </label>
            <select
                id={id}
                className={`px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all w-full ${className}`}
                {...props}
            >
                <option value="">Select...</option>
                {options.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
            </select>
        </div>
    );
}