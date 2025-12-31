import { Router } from 'express';
import multer from 'multer';
import { UploadController } from '../controllers/upload.controller';

const router = Router();
const upload = multer({ dest: 'uploads/' });

// Rota POST /upload
router.post('/', upload.single('csvFile'), UploadController.uploadCsv);

export default router;
