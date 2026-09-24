import { NextResponse } from 'next/server';
import { processMarketplaceLead } from '../../../../../lib/leadProcessor';

export async function POST(req) {
    try {
        const payload = await req.json();

        const externalLeadId =
            payload.UNIQUE_QUERY_ID ||
            payload.QUERY_ID;

        if (!externalLeadId) {
            console.error(
                'IndiaMART payload missing UNIQUE_QUERY_ID',
                payload
            );

            return NextResponse.json(
                {
                    success: false,
                    message: 'Missing IndiaMART lead ID'
                },
                { status: 400 }
            );
        }

        const customerName =
            payload.SENDER_NAME?.trim();

        const mobile =
            payload.SENDER_MOBILE ||
            payload.MOBILE;

        if (!customerName || !mobile) {
            console.error(
                'IndiaMART payload missing customer information',
                payload
            );

            return NextResponse.json(
                {
                    success: false,
                    message: 'Missing customer information'
                },
                { status: 400 }
            );
        }

        const normalizedLead = {
            source: 'INDIAMART',

            externalLeadId,

            customerName,

            mobile,

            email:
                payload.SENDER_EMAIL || '',

            company:
                payload.SENDER_COMPANY || '',

            product:
                payload.QUERY_PRODUCT_NAME ||
                payload.SUBJECT ||
                '',

            message:
                payload.QUERY_MESSAGE ||
                payload.ENQ_MESSAGE ||
                '',

            city:
                payload.SENDER_CITY || '',

            state:
                payload.SENDER_STATE || '',

            country:
                payload.SENDER_COUNTRY_ISO || '',

            rawPayload: payload
        };

        const result =
            await processMarketplaceLead(
                normalizedLead
            );

        return NextResponse.json(
            {
                success: true,
                status: result.status,
                leadId: result.lead?._id || null
            },
            { status: 200 }
        );

    } catch (error) {
        console.error(
            'IndiaMART Webhook Error:',
            error
        );

        return NextResponse.json(
            {
                success: false,
                message: 'Failed to process IndiaMART lead'
            },
            { status: 500 }
        );
    }
}