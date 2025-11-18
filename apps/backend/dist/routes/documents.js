"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const client_1 = require("../database/client");
const logger_1 = require("../utils/logger");
const auth_1 = require("./auth");
const utils_1 = require("@aldeia/utils");
const router = express_1.default.Router();
// Configure multer for file uploads
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path_1.default.join(__dirname, '../../../data/documents'));
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path_1.default.extname(file.originalname));
    }
});
const upload = (0, multer_1.default)({
    storage,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    },
    fileFilter: (req, file, cb) => {
        // Allow only PDF files for now
        if (file.mimetype === 'application/pdf') {
            cb(null, true);
        }
        else {
            cb(new Error('Only PDF files are allowed'));
        }
    }
});
// ====================================================================
// GET ALL DOCUMENTS
// ====================================================================
router.get('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { limit = 50, offset = 0, search } = req.query;
        let query = 'SELECT id, filename, created_at FROM documents';
        const params = [];
        if (search) {
            query += ' WHERE filename LIKE ? OR content LIKE ?';
            params.push(`%${search}%`, `%${search}%`);
        }
        query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
        params.push(Number(limit), Number(offset));
        const documents = yield getDocuments(query, params);
        res.json({
            success: true,
            data: {
                documents,
                total: documents.length,
                limit: Number(limit),
                offset: Number(offset)
            }
        });
    }
    catch (error) {
        logger_1.logger.error('Get documents error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve documents'
        });
    }
}));
// ====================================================================
// GET SPECIFIC DOCUMENT
// ====================================================================
router.get('/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const document = yield getDocumentById(id);
        if (!document) {
            return res.status(404).json({
                success: false,
                error: 'Document not found'
            });
        }
        res.json({
            success: true,
            data: document
        });
    }
    catch (error) {
        logger_1.logger.error('Get document error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve document'
        });
    }
}));
// ====================================================================
// UPLOAD DOCUMENT (Protected Route)
// ====================================================================
router.post('/', auth_1.authenticateToken, upload.single('document'), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: 'No file uploaded'
            });
        }
        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: 'Authentication required'
            });
        }
        const { title, description } = req.body;
        const userId = req.user.userId;
        // For now, we'll store basic file info
        // In a real implementation, you'd extract text content from the PDF
        const documentData = {
            id: utils_1.stringUtils.generateId(),
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
        const document = yield createDocument(documentData);
        logger_1.logger.info(`Document uploaded: ${document.filename} by user ${userId}`);
        res.status(201).json({
            success: true,
            data: document,
            message: 'Document uploaded successfully'
        });
    }
    catch (error) {
        logger_1.logger.error('Upload document error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to upload document'
        });
    }
}));
// ====================================================================
// DELETE DOCUMENT (Protected Route - Admin only)
// ====================================================================
router.delete('/:id', auth_1.authenticateToken, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: 'Authentication required'
            });
        }
        const { id } = req.params;
        const userRole = req.user.role;
        // Only admins can delete documents
        if (userRole !== 'admin') {
            return res.status(403).json({
                success: false,
                error: 'Insufficient permissions'
            });
        }
        const document = yield getDocumentById(id);
        if (!document) {
            return res.status(404).json({
                success: false,
                error: 'Document not found'
            });
        }
        yield deleteDocument(id);
        logger_1.logger.info(`Document deleted: ${document.filename} by user ${req.user.userId}`);
        res.json({
            success: true,
            message: 'Document deleted successfully'
        });
    }
    catch (error) {
        logger_1.logger.error('Delete document error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete document'
        });
    }
}));
// ====================================================================
// HELPER FUNCTIONS - Database Operations
// ====================================================================
function getDocuments(sql, params) {
    return __awaiter(this, void 0, void 0, function* () {
        return yield (0, client_1.query)(sql, params);
    });
}
function getDocumentById(id) {
    return __awaiter(this, void 0, void 0, function* () {
        return yield (0, client_1.queryOne)('SELECT * FROM documents WHERE id = $1', [id]);
    });
}
function createDocument(documentData) {
    return __awaiter(this, void 0, void 0, function* () {
        yield (0, client_1.execute)(`INSERT INTO documents (id, filename, content, file_path, uploaded_by, metadata, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)`, [
            documentData.id,
            documentData.filename,
            documentData.content,
            documentData.filePath,
            documentData.uploadedBy,
            JSON.stringify(documentData.metadata)
        ]);
        return {
            id: documentData.id,
            filename: documentData.filename,
            content: documentData.content,
            createdAt: new Date(),
            metadata: documentData.metadata
        };
    });
}
function deleteDocument(id) {
    return __awaiter(this, void 0, void 0, function* () {
        yield (0, client_1.execute)('DELETE FROM documents WHERE id = $1', [id]);
    });
}
exports.default = router;
