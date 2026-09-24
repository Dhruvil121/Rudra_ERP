import dbConnect from './mongodb';
import Lead from '../app/models/Lead';
import IntegrationLog from '../app/models/IntegrationLog';

/**
 * Common Lead Processor
 * Receives normalized lead data, performs deduplication checks via MongoDB indexes,
 * creates the lead, and logs the result.
 */
export async function processMarketplaceLead(normalizedLead) {
    const startTime = Date.now();
    let resultStatus = 'ERROR';
    let errorMessage = null;
    let savedLead = null;

    try {
        await dbConnect();

        // 1. Validate required fields
        if (!normalizedLead.source || !normalizedLead.externalLeadId || !normalizedLead.customerName || !normalizedLead.mobile) {
            throw new Error('Missing required fields (source, externalLeadId, customerName, or mobile)');
        }

        // 2. Save Lead (Duplicates are caught via the compound unique index on source + externalLeadId)
        try {
            savedLead = await Lead.create(normalizedLead);
            resultStatus = 'SUCCESS';
            
            // Notification would normally go here if we had a persistent Notification model.
            // Since there's no backend socket/notification model, the frontend relies on
            // periodic refresh (react-query) or toast context on the client side.
            // If the user is on the Leads page, React Query will refetch.

        } catch (dbError) {
            if (dbError.code === 11000) {
                // Duplicate Key Error
                resultStatus = 'DUPLICATE';
                errorMessage = 'Lead already exists';
            } else {
                throw dbError; // Bubble up unexpected errors
            }
        }

    } catch (error) {
        resultStatus = 'ERROR';
        errorMessage = error.message;
        console.error('Error processing marketplace lead:', error);
    } finally {
        const processingTimeMs = Date.now() - startTime;
        
        // 3. Write integration log
        try {
            await dbConnect();
            await IntegrationLog.create({
                source: normalizedLead.source || 'UNKNOWN',
                event: 'NEW_LEAD',
                externalLeadId: normalizedLead.externalLeadId,
                status: resultStatus,
                error: errorMessage,
                processingTimeMs
            });
        } catch (logError) {
            console.error('Failed to write integration log:', logError);
        }
    }

    return {
        status: resultStatus,
        lead: savedLead,
        error: errorMessage
    };
}
