import { ERP_MODULES } from '../config/modules';
import { ModuleCard } from '../components/dashboard/ModuleCard';
import { useAuth, ACTIONS } from '../context/AuthContext';

export default function Dashboard() {
    const { hasPermission } = useAuth();
    const visibleModules = ERP_MODULES.filter(module => hasPermission(module.id, ACTIONS.VIEW));

    return (
        <div className="flex-1 flex flex-col items-center justify-center p-8">
            {/* max-w-[650px] forces a clean 2x2 grid for your 4 modules */}
            <div className="max-w-[650px] w-full mt-[-8vh]">
                <div className="flex flex-wrap justify-center gap-6">
                    {visibleModules.map((module) => (
                        <ModuleCard key={module.id} module={module} />
                    ))}
                </div>
            </div>
        </div>
    );
}