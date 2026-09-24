import { NextResponse } from 'next/server';
import dbConnect from '../../../lib/mongodb';
import Lead from '../../../app/models/Lead';

export async function GET(req) {
    try {
        await dbConnect();
        
        // Pagination & Search
        const { searchParams } = new URL(req.url);
        const search = searchParams.get('search') || '';
        const source = searchParams.get('source');
        const status = searchParams.get('status');
        
        let query = {};
        if (search) {
            query.$or = [
                { customerName: { $regex: search, $options: 'i' } },
                { mobile: { $regex: search, $options: 'i' } },
                { product: { $regex: search, $options: 'i' } }
            ];
        }
        if (source && source !== 'All') {
            query.source = source;
        }
        if (status && status !== 'All') {
            query.status = status;
        }

        const leads = await Lead.find(query).sort({ createdAt: -1 }).limit(100);
        
        return NextResponse.json(leads, { status: 200 });
    } catch (error) {
        console.error('Error fetching leads:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
