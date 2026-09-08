import { BrowserRouter, createBrowserRouter } from "react-router-dom";
import MainLayout from "../layout/MainLayout";
import Dashboard from "../pages/Dashboard";
import Products from "../pages/Products";
import Orders from "../pages/Orders";
import Customers from "../pages/Customers";

const router = createBrowserRouter([
    {
        path: "/",
        element: <MainLayout />,
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
            }
        ]
    }
])

export default router

