import { ERP_MODULES } from '../config/modules';
import { ModuleCard } from '../components/dashboard/ModuleCard';

export default function Dashboard() {
    const visibleModules = ERP_MODULES;

    return (
        <div className="min-h-screen bg-[#f3f4f6] flex items-center justify-center p-8">
            {/* max-w-[650px] forces a clean 2x2 grid for your 4 modules */}
            <div className="max-w-[650px] w-full">
                <div className="flex flex-wrap justify-center gap-6">
                    {visibleModules.map((module) => (
                        <ModuleCard key={module.id} module={module} />
                    ))}
                </div>
            </div>
        </div>
    );
}