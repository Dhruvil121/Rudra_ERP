import { NextResponse } from 'next/server';
import { processMarketplaceLead } from '../../../../../lib/leadProcessor';

export async function POST(req) {
    try {
        const payload = await req.json();

        // Security / Auth check should happen here based on Justdial's specs

        // Note: Generic mapping placeholder for Justdial payload.
        const normalizedLead = {
            source: 'JUSTDIAL',
            externalLeadId: payload.leadid || payload.id || `JD-${Date.now()}`,
            customerName: payload.name || 'Unknown Justdial User',
            mobile: payload.mobile || payload.phone || '0000000000',
            email: payload.email || '',
            company: payload.company || '',
            product: payload.category || payload.product || '',
            message: payload.message || '',
            city: payload.city || '',
            state: payload.state || '',
            rawPayload: payload
        };

        const result = await processMarketplaceLead(normalizedLead);

        return NextResponse.json({ success: true, status: result.status }, { status: 200 });

    } catch (error) {
        console.error('Justdial Webhook Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
