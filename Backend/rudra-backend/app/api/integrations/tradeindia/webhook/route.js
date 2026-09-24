import { NextResponse } from 'next/server';
import { processMarketplaceLead } from '../../../../../lib/leadProcessor';

export async function POST(req) {
    try {
        const payload = await req.json();

        // Security / Auth check should happen here based on TradeIndia's specs

        // Note: Generic mapping placeholder for TradeIndia payload.
        const normalizedLead = {
            source: 'TRADEINDIA',
            externalLeadId: payload.inquiry_id || payload.id || `TI-${Date.now()}`,
            customerName: payload.sender_name || 'Unknown TradeIndia User',
            mobile: payload.sender_mobile || '0000000000',
            email: payload.sender_email || '',
            company: payload.sender_company || '',
            product: payload.product_name || '',
            message: payload.message || '',
            city: payload.sender_city || '',
            state: payload.sender_state || '',
            rawPayload: payload
        };

        const result = await processMarketplaceLead(normalizedLead);

        return NextResponse.json({ success: true, status: result.status }, { status: 200 });

    } catch (error) {
        console.error('TradeIndia Webhook Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
