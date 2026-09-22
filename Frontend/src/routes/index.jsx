import { BrowserRouter, createBrowserRouter, NavLink } from "react-router-dom";
import MainLayout from "../layout/MainLayout";
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
import { useAuth } from "../context/AuthContext";
import { ACTIONS } from "../context/AuthContext";
import Login from "../pages/Login";
import { Navigate, Outlet } from "react-router-dom";


const ProtectedRoute = ({ module }) => {
    const { user, hasPermission, loading } = useAuth();

    // Don't redirect while initial auth check is loading
    if (loading) return null;

    if (!user) return <Navigate to="/login" replace />;
    if (module && !hasPermission(module, ACTIONS.VIEW)) {
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
                        element: <ProtectedRoute module={"order"} />,
                        children: [
                            {
                                index: true,
                                element: <Orders />
                            }
                        ]
                    },
                    {
                        path: "/customers",
                        element: <ProtectedRoute module={"customer"} />,
                        children: [
                            {
                                index: true,
                                element: <Customers />
                            }
                        ]
                    },
                    {
                        path: "/products",
                        element: <ProtectedRoute module={"product"} />,
                        children: [
                            {
                                index: true,
                                element: <Products />
                            }
                        ]
                    },
                    {
                        path: "/inventory",
                        element: <ProtectedRoute module={"inventory"} />,
                        children: [
                            {
                                index: true,
                                element: <InventoryModule />
                            }
                        ]
                    },
                    {
                        path: "/process",
                        element: <ProtectedRoute module={"process"} />,
                        children: [
                            {
                                index: true,
                                element: <ProcessModule />
                            }
                        ]
                    },
                    {
                        path: "/assembling",
                        element: <ProtectedRoute module={"assembling"} />,
                        children: [
                            {
                                index: true,
                                element: <AssemblingModule />
                            }
                        ]
                    },
                    {
                        path: "/reports",
                        element: <ProtectedRoute module={"reports"} />,
                        children: [
                            {
                                index: true,
                                element: <ReportsModule />
                            }
                        ]
                    },
                    {
                        path: "/settings",
                        element: <ProtectedRoute />,
                        children: [
                            {
                                index: true,
                                element: <SettingsModule />
                            }
                        ]
                    }
                ]
            }
        ]
    }
])

export default router

