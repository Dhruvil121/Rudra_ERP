import { createBrowserRouter, Navigate, Outlet } from "react-router-dom";
import Dashboard from "../pages/Dashboard";
import Products from "../pages/Products";
import Orders from "../pages/Orders";
import Customers from "../pages/Customers";
import { AppLayout } from "../layout/AppLayout";
import InventoryModule from "../pages/Inventory";
import ProcessModule from "../pages/Process";
import AssemblingModule from "../pages/Assembling";
import ReportsModule from "../pages/Reports";
import SettingsModule from "../pages/Settings";
import MarketplaceLeads from "../pages/MarketplaceLeads";
import { useAuth, ACTIONS } from "../context/AuthContext";
import Login from "../pages/Login";
import BOM from "../pages/BOM";

const ProtectedRoute = ({ module }) => {
    const { user, hasPermission, loading } = useAuth();

    // Wait while localStorage session is being restored on page refresh
    if (loading) return null;

    if (!user) return <Navigate to="/login" replace />;

    // Always normalize module key to lowercase so "BOM" matches "bom" in user.permissions
    if (module && !hasPermission(module.toLowerCase(), ACTIONS.VIEW)) {
        return <Navigate to="/" replace />;
    }

    return <Outlet />;
};

const router = createBrowserRouter([
    { path: "/login", element: <Login /> },
    {
        path: "/",
        element: <ProtectedRoute />,
        children: [
            {
                element: <AppLayout />,
                children: [
                    {
                        index: true,
                        element: <Dashboard />
                    },
                    {
                        path: "/orders",
                        element: <ProtectedRoute module="order" />,
                        children: [{ index: true, element: <Orders /> }]
                    },
                    {
                        path: "/customers",
                        element: <ProtectedRoute module="customer" />,
                        children: [{ index: true, element: <Customers /> }]
                    },
                    {
                        path: "/products",
                        element: <ProtectedRoute module="product" />,
                        children: [{ index: true, element: <Products /> }]
                    },
                    {
                        path: "/inventory",
                        element: <ProtectedRoute module="inventory" />,
                        children: [{ index: true, element: <InventoryModule /> }]
                    },
                    {
                        path: "/process",
                        element: <ProtectedRoute module="process" />,
                        children: [{ index: true, element: <ProcessModule /> }]
                    },
                    {
                        path: "/assembling",
                        element: <ProtectedRoute module="assembling" />,
                        children: [{ index: true, element: <AssemblingModule /> }]
                    },
                    {
                        path: "/reports",
                        element: <ProtectedRoute module="reports" />,
                        children: [{ index: true, element: <ReportsModule /> }]
                    },
                    {
                        path: "/leads",
                        element: <ProtectedRoute module="leads" />,
                        children: [{ index: true, element: <MarketplaceLeads /> }]
                    },
                    {
                        path: "/settings",
                        element: <ProtectedRoute />,
                        children: [{ index: true, element: <SettingsModule /> }]
                    },
                    {
                        path: "/BOM",
                        element: <ProtectedRoute module="bom" />,
                        children: [{ index: true, element: <BOM /> }]
                    },
                    {
                        path: "/bom",
                        element: <ProtectedRoute module="bom" />,
                        children: [{ index: true, element: <BOM /> }]
                    },
                    {
                        path: "*",
                        element: <Navigate to="/" replace />
                    }
                ]
            }
        ]
    }
]);

export default router;