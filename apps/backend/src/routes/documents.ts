import express, { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import { query, queryOne, execute } from '../database/client';
import { logger } from '../utils/logger';
import { authenticateToken } from './auth';
import { ApiResponse, Document } from '@aldeia/shared-types';
import { stringUtils } from '@aldeia/utils';

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../../../data/documents'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow only PDF files for now
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'));
    }
  }
});

// ====================================================================
// GET ALL DOCUMENTS
// ====================================================================

router.get('/', async (req: Request, res: Response) => {
  try {
    const { limit = 50, offset = 0, search } = req.query;

    let query = 'SELECT id, filename, created_at FROM documents';
    const params: any[] = [];

    if (search) {
      query += ' WHERE filename LIKE ? OR content LIKE ?';
      params.push(`%${search}%`, `%${search}%`);
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(Number(limit), Number(offset));

    const documents = await getDocuments(query, params);

    res.json({
      success: true,
      data: {
        documents,
        total: documents.length,
        limit: Number(limit),
        offset: Number(offset)
      }
    } as ApiResponse);

  } catch (error) {
    logger.error('Get documents error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve documents'
    } as ApiResponse);
  }
});

// ====================================================================
// GET SPECIFIC DOCUMENT
// ====================================================================

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const document = await getDocumentById(id);

    if (!document) {
      return res.status(404).json({
        success: false,
        error: 'Document not found'
      } as ApiResponse);
    }

    res.json({
      success: true,
      data: document
    } as ApiResponse<Document>);

  } catch (error) {
    logger.error('Get document error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve document'
    } as ApiResponse);
  }
});

// ====================================================================
// UPLOAD DOCUMENT (Protected Route)
// ====================================================================

router.post('/', authenticateToken, upload.single('document'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded'
      } as ApiResponse);
    }

    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      } as ApiResponse);
    }

    const { title, description } = req.body;
    const userId = req.user.userId;

    // For now, we'll store basic file info
    // In a real implementation, you'd extract text content from the PDF
    const documentData = {
      id: stringUtils.generateId(),
      filename: title || req.file.originalname,
      content: description || 'Document uploaded via API',
      filePath: req.file.path,
      uploadedBy: userId,
      metadata: {
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        size: req.file.size
      }
    };

    const document = await createDocument(documentData);

    logger.info(`Document uploaded: ${document.filename} by user ${userId}`);

    res.status(201).json({
      success: true,
      data: document,
      message: 'Document uploaded successfully'
    } as ApiResponse<Document>);

  } catch (error) {
    logger.error('Upload document error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to upload document'
    } as ApiResponse);
  }
});

// ====================================================================
// DELETE DOCUMENT (Protected Route - Admin only)
// ====================================================================

router.delete('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      } as ApiResponse);
    }

    const { id } = req.params;
    const userRole = req.user.role;

    // Only admins can delete documents
    if (userRole !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions'
      } as ApiResponse);
    }

    const document = await getDocumentById(id);
    if (!document) {
      return res.status(404).json({
        success: false,
        error: 'Document not found'
      } as ApiResponse);
    }

    await deleteDocument(id);

    logger.info(`Document deleted: ${document.filename} by user ${req.user.userId}`);

    res.json({
      success: true,
      message: 'Document deleted successfully'
    } as ApiResponse);

  } catch (error) {
    logger.error('Delete document error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete document'
    } as ApiResponse);
  }
});

// ====================================================================
// HELPER FUNCTIONS - Database Operations
// ====================================================================

async function getDocuments(sql: string, params: any[]): Promise<any[]> {
  return await query(sql, params);
}

async function getDocumentById(id: string): Promise<any> {
  return await queryOne(
    'SELECT * FROM documents WHERE id = $1',
    [id]
  );
}

async function createDocument(documentData: any): Promise<Document> {
  await execute(
    `INSERT INTO documents (id, filename, content, file_path, uploaded_by, metadata, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)`,
    [
      documentData.id,
      documentData.filename,
      documentData.content,
      documentData.filePath,
      documentData.uploadedBy,
      JSON.stringify(documentData.metadata)
    ]
  );

  return {
    id: documentData.id,
    filename: documentData.filename,
    content: documentData.content,
    createdAt: new Date(),
    metadata: documentData.metadata
  } as Document;
}

async function deleteDocument(id: string): Promise<void> {
  await execute(
    'DELETE FROM documents WHERE id = $1',
    [id]
  );
}

export default router;