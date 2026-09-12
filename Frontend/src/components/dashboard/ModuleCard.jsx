import { useNavigate } from 'react-router-dom';

const themeStyles = {
    blue: { bg: 'bg-blue-100', text: 'text-blue-600', border: 'border-b-blue-500' },
    green: { bg: 'bg-green-100', text: 'text-green-600', border: 'border-b-green-500' },
    red: { bg: 'bg-red-100', text: 'text-red-600', border: 'border-b-red-500' },
    purple: { bg: 'bg-purple-100', text: 'text-purple-600', border: 'border-b-purple-500' },
    orange: { bg: 'bg-orange-100', text: 'text-orange-600', border: 'border-b-orange-500' },
};

export function ModuleCard({ module }) {
    const navigate = useNavigate();
    const Icon = module.icon;
    const styles = themeStyles[module.theme];

    return (
        <div
            onClick={() => navigate(module.path)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') navigate(module.path);
            }}
            className={`
        bg-white rounded-2xl p-8 flex flex-col items-center justify-center 
        cursor-pointer shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] 
        transition-transform duration-200 hover:-translate-y-1 hover:shadow-lg
        border-b-4 border-transparent hover:${styles.border}
        w-[280px] h-[180px]
      `}
            style={{ borderBottomColor: `var(--tw-colors-${module.theme}-500)` }}
        >
            <div className={`p-4 rounded-full ${styles.bg} mb-4`}>
                <Icon className={`w-8 h-8 ${styles.text}`} strokeWidth={1.5} />
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-1">{module.title}</h3>
            <p className="text-sm text-slate-400 font-medium">{module.description}</p>
        </div>
    );
}