import { BrowserRouter, createBrowserRouter } from "react-router-dom";
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

const router = createBrowserRouter([
    {
        path: "/",
        element: <AppLayout />,
        children: [
            {
                index: true,
                element: <Dashboard />
            },
            {
                path: "/products",
                element: <Products />
            },
            {
                path: "/orders",
                element: <Orders />
            },
            {
                path: "/customers",
                element: <Customers />
            },
            {
                path: "/inventory",
                element: <InventoryModule />
            },
            {
                path: "/process",
                element: <ProcessModule />
            },
            {
                path: "/assembling",
                element: <AssemblingModule />
            },
            {
                path: "/reports",
                element: <ReportsModule />
            }
        ]
    }
])

export default router

