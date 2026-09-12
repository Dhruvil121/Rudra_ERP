import { ShoppingCart, Settings, Users, Box, Layers, FileText } from 'lucide-react';

/**
 * @typedef {Object} ModuleConfig
 * @property {string} id
 * @property {string} title
 * @property {string} description
 * @property {string} path
 * @property {Object} icon - Lucide React component
 * @property {'blue' | 'green' | 'purple' | 'orange'} theme
 */

/** @type {ModuleConfig[]} */
export const ERP_MODULES = [
    {
        id: 'customer',
        title: 'Customer',
        description: 'Manage Customers & Parties',
        path: '/customers',
        icon: Users,
        theme: 'purple',
    },
    {
        id: 'order',
        title: 'Order',
        description: 'Manage New & Existing Orders',
        path: '/orders',
        icon: ShoppingCart,
        theme: 'blue',
    },
    {
        id: 'inventory',
        title: 'Inventory',
        description: 'Manage Stock & Inventory',
        path: '/inventory',
        icon: Box,
        theme: 'orange',
    },
    {
        id: 'process',
        title: 'Process',
        description: 'Manage Manufacturing Processes',
        path: '/process',
        icon: Settings,
        theme: 'green',
    },
    {
        id: 'assembling',
        title: 'Assembling',
        description: 'Manage Final Assembly',
        path: '/assembling',
        icon: Layers,
        theme: 'blue',
    },
    {
        id: 'reports',
        title: 'Reports',
        description: 'View Reports',
        path: '/reports',
        icon: FileText,
        theme: 'red',
    }
];