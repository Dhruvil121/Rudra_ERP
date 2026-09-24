import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

async function dropIndex() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("Connected to MongoDB...");

        // Drop the index from the orders collection
        await mongoose.connection.db.collection('orders').dropIndex('code_1');
        console.log("Successfully dropped obsolete 'code_1' index from 'orders' collection.");

    } catch (error) {
        console.log("Error or index doesn't exist:", error.message);
    } finally {
        await mongoose.disconnect();
        console.log("Disconnected from MongoDB.");
    }
}

dropIndex();
