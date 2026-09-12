export const mockInventory = [
    {
        groupId: 'G-001',
        groupName: 'Hardware Fittings',
        details: 'Standard metal fittings and hinges',
        stockGv: '₹ 45,000',
        subItems: [
            { id: 'I-101', name: '4-inch Steel Hinge', details: 'Matte Finish', stock: 1200 },
            { id: 'I-102', name: '6-inch Brass Hinge', details: 'Glossy Finish', stock: 450 },
        ]
    },
    {
        groupId: 'G-002',
        groupName: 'Fasteners',
        details: 'Screws, nuts, and bolts',
        stockGv: '₹ 12,500',
        subItems: [
            { id: 'I-201', name: 'M4 Wood Screw', details: 'Star head, 20mm', stock: 5000 },
            { id: 'I-202', name: 'M6 Hex Nut', details: 'Stainless Steel', stock: 3200 },
        ]
    }
];