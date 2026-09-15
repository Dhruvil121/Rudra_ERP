const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
    const hashedPassword = await bcrypt.hash('password123', 10);

    // 1. Create Super Admin
    await prisma.user.upsert({
        where: { email: 'superadmin@rudra.com' },
        update: {},
        create: {
            email: 'superadmin@rudra.com',
            name: 'Super Admin',
            password: hashedPassword,
            role: 'super_admin',
            permissions: { all: true }, // Super Admin wildcard
        },
    });

    // 2. Create Production Manager (Restricted Process Access)
    await prisma.user.upsert({
        where: { email: 'manager1@rudra.com' },
        update: {},
        create: {
            email: 'manager1@rudra.com',
            name: 'Production Manager',
            password: hashedPassword,
            role: 'manager',
            permissions: {
                customer: ['view'],
                process: ['view', 'edit', 'process_turning', 'process_buffing'], // No plating access
            },
        },
    });

    console.log('Database seeded successfully with initial RBAC users.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });