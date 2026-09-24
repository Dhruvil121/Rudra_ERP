import { ShoppingCart, Settings, Users, Box, Layers, FileText, Megaphone } from 'lucide-react';

/**
 * @typedef {Object} ModuleConfig
 * @property {string} id
 * @property {string} title
 * @property {string} description
 * @property {string} path
 * @property {Object} icon - Lucide React component
 * @property {'blue' | 'green' | 'purple' | 'orange' | 'red'} theme
 * @property {string[]} actions - Available permission actions for this module
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
        actions: ['view', 'add', 'edit', 'delete', 'print'],
    },
    {
        id: 'order',
        title: 'Order',
        description: 'Manage New & Existing Orders',
        path: '/orders',
        icon: ShoppingCart,
        theme: 'blue',
        actions: ['view', 'add', 'edit', 'delete', 'approve', 'print'],
    },
    {
        id: 'inventory',
        title: 'Inventory',
        description: 'Manage Stock & Inventory',
        path: '/inventory',
        icon: Box,
        theme: 'orange',
        actions: ['view', 'add', 'edit', 'delete', 'export'],
    },
    {
        id: 'process',
        title: 'Process',
        description: 'Manage Manufacturing Processes',
        path: '/process',
        icon: Settings,
        theme: 'green',
        actions: ['view', 'add'],
    },
    {
        id: 'assembling',
        title: 'Assembling',
        description: 'Manage Final Assembly',
        path: '/assembling',
        icon: Layers,
        theme: 'blue',
        actions: ['view', 'add', 'edit'],
    },
    {
        id: 'reports',
        title: 'Reports',
        description: 'View Reports',
        path: '/reports',
        icon: FileText,
        theme: 'red',
        actions: ['view', 'export', 'print'],
    },
    {
        id: 'leads',
        title: 'Marketplace Leads',
        description: 'Manage external leads from IndiaMART, Justdial, etc.',
        path: '/leads',
        icon: Megaphone,
        theme: 'blue',
        actions: ['view', 'edit'],
    },
    {
        id: 'BOM',
        title: 'BOM',
        description: 'Manage Bill of Materials',
        path: '/BOM',
        icon: Box,
        theme: 'green',
        actions: ['view', 'add', 'edit', 'delete', 'print'],
    }
];

/**
 * Factory process step names — the master list used in both:
 * - Settings.jsx (permission assignment matrix)
 * - Process.jsx (step-level authorization checks)
 *
 * When super admin creates a custom step via the Process modal,
 * it gets permission-checked against this list. Custom steps not
 * in this list are only editable by super_admin.
 */
export const FACTORY_PROCESSES = [
    "Cutting",
    "Drilling",
    "Turning",
    "Polish",
    "Buffing",
    "Plating",
    "Packing",
    "Quality Check",
    "Painting",
    "Assembling",
];