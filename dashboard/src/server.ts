import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { pool } from './config/database';
import uploadRoutes from './routes/upload.routes';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/upload', uploadRoutes);

app.get('/health', async (req, res) => {
    try {
        await pool.query('SELECT NOW()');
        res.json({ status: 'ok', db: 'connected', timestamp: new Date() });
    } catch (error: any) {
        res.status(500).json({ status: 'error', db: 'disconnected', error: error.message });
    }
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
