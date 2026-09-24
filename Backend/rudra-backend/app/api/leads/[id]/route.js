import { NextResponse } from 'next/server';
import dbConnect from '../../../../lib/mongodb';
import Lead from '../../../../app/models/Lead';

export async function PUT(req, { params }) {
    try {
        await dbConnect();
        const { id } = await params;
        
        const body = await req.json();
        const { status, assignedTo } = body;

        const updateData = {};
        if (status) updateData.status = status;
        if (assignedTo) updateData.assignedTo = assignedTo;

        const updatedLead = await Lead.findByIdAndUpdate(
            id,
            { $set: updateData },
            { new: true }
        );

        if (!updatedLead) {
            return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
        }

        return NextResponse.json({ message: 'Lead updated successfully', lead: updatedLead }, { status: 200 });
    } catch (error) {
        console.error('Error updating lead:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
