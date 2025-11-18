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
const client_1 = require("../database/client");
const logger_1 = require("../utils/logger");
const auth_1 = require("./auth");
const sanitizeInput_1 = require("../middleware/sanitizeInput");
const utils_1 = require("@aldeia/utils");
const router = express_1.default.Router();
// Apply input sanitization middleware
router.use(sanitizeInput_1.sanitizeInput);
// ====================================================================
// GET USER PROJECTS (Protected Route)
// ====================================================================
router.get('/projects', auth_1.authenticateToken, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: 'Authentication required'
            });
        }
        const userId = req.user.userId;
        const { status, limit = 20, offset = 0 } = req.query;
        let query = 'SELECT * FROM rebuild_projects WHERE user_id = ?';
        const params = [userId];
        if (status) {
            query += ' AND status = ?';
            params.push(status);
        }
        query += ' ORDER BY updated_at DESC LIMIT ? OFFSET ?';
        params.push(Number(limit), Number(offset));
        const projects = yield getProjects(query, params);
        res.json({
            success: true,
            data: {
                projects,
                total: projects.length,
                limit: Number(limit),
                offset: Number(offset)
            }
        });
    }
    catch (error) {
        logger_1.logger.error('Get projects error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve projects'
        });
    }
}));
router.post('/projects', auth_1.authenticateToken, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: 'Authentication required'
            });
        }
        const userId = req.user.userId;
        const { name, location, preferences = {} } = req.body;
        // Validation
        if (!name || !location || !location.address) {
            return res.status(400).json({
                success: false,
                error: 'Name and location are required'
            });
        }
        const projectData = {
            id: utils_1.stringUtils.generateId(),
            userId,
            name: utils_1.stringUtils.sanitize(name),
            location,
            preferences,
            status: 'planning'
        };
        const project = yield createProject(projectData);
        logger_1.logger.info(`New project created: ${project.name} by user ${userId}`);
        res.status(201).json({
            success: true,
            data: project,
            message: 'Project created successfully'
        });
    }
    catch (error) {
        logger_1.logger.error('Create project error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create project'
        });
    }
}));
// ====================================================================
// UPDATE PROJECT (Protected Route)
// ====================================================================
router.put('/projects/:id', auth_1.authenticateToken, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: 'Authentication required'
            });
        }
        const { id } = req.params;
        const userId = req.user.userId;
        const updates = req.body;
        // Check if project belongs to user
        const project = yield getProjectById(id);
        if (!project) {
            return res.status(404).json({
                success: false,
                error: 'Project not found'
            });
        }
        if (project.user_id !== userId) {
            return res.status(403).json({
                success: false,
                error: 'Access denied'
            });
        }
        yield updateProject(id, updates);
        logger_1.logger.info(`Project updated: ${id} by user ${userId}`);
        res.json({
            success: true,
            message: 'Project updated successfully'
        });
    }
    catch (error) {
        logger_1.logger.error('Update project error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update project'
        });
    }
}));
// ====================================================================
// GET DESIGN MATCHES
// ====================================================================
router.get('/designs', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { style, budget, location, limit = 10 } = req.query;
        // Mock design matches - in real implementation, this would query a designs database
        const mockDesigns = [
            {
                id: '1',
                name: 'Modern Fire-Resistant Ranch',
                style: 'modern',
                images: ['/images/design1-1.jpg', '/images/design1-2.jpg'],
                description: 'A contemporary single-story design with fire-resistant materials, large windows, and open floor plan. Features include fiber cement siding, metal roofing, and defensible space landscaping.',
                estimatedCost: 275000,
                matchScore: 0.95
            },
            {
                id: '2',
                name: 'Craftsman Style Rebuild',
                style: 'traditional',
                images: ['/images/design2-1.jpg', '/images/design2-2.jpg'],
                description: 'Classic craftsman styling with modern fire-resistant features. Includes stone accents, covered porches, and built-in storage solutions.',
                estimatedCost: 320000,
                matchScore: 0.88
            },
            {
                id: '3',
                name: 'Mediterranean Villa',
                style: 'mediterranean',
                images: ['/images/design3-1.jpg', '/images/design3-2.jpg'],
                description: 'Spanish-inspired design with stucco exterior, tile roofing, and courtyard layout. Incorporates fire-resistant landscaping and materials.',
                estimatedCost: 410000,
                matchScore: 0.82
            }
        ];
        // Filter based on query parameters
        let filteredDesigns = mockDesigns;
        if (style) {
            filteredDesigns = filteredDesigns.filter(design => design.style.toLowerCase().includes(style.toString().toLowerCase()));
        }
        if (budget) {
            const maxBudget = Number(budget);
            filteredDesigns = filteredDesigns.filter(design => design.estimatedCost <= maxBudget);
        }
        // Sort by match score
        filteredDesigns.sort((a, b) => b.matchScore - a.matchScore);
        // Limit results
        filteredDesigns = filteredDesigns.slice(0, Number(limit));
        res.json({
            success: true,
            data: {
                designs: filteredDesigns,
                total: filteredDesigns.length,
                filters: { style, budget, location }
            }
        });
    }
    catch (error) {
        logger_1.logger.error('Get designs error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve designs'
        });
    }
}));
router.post('/preferences', auth_1.authenticateToken, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: 'Authentication required'
            });
        }
        const userId = req.user.userId;
        const preferences = req.body;
        yield saveUserPreferences(userId, preferences);
        logger_1.logger.info(`Preferences saved for user ${userId}`);
        res.json({
            success: true,
            message: 'Preferences saved successfully'
        });
    }
    catch (error) {
        logger_1.logger.error('Save preferences error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to save preferences'
        });
    }
}));
// ====================================================================
// GET USER PREFERENCES (Protected Route)
// ====================================================================
router.get('/preferences', auth_1.authenticateToken, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: 'Authentication required'
            });
        }
        const userId = req.user.userId;
        const preferences = yield getUserPreferences(userId);
        res.json({
            success: true,
            data: preferences || {}
        });
    }
    catch (error) {
        logger_1.logger.error('Get preferences error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve preferences'
        });
    }
}));
// ====================================================================
// HELPER FUNCTIONS - Database Operations
// ====================================================================
function getProjects(sql, params) {
    return __awaiter(this, void 0, void 0, function* () {
        const rows = yield (0, client_1.query)(sql, params);
        return rows.map((row) => (Object.assign(Object.assign({}, row), { location: typeof row.location === 'string' ? JSON.parse(row.location) : row.location, preferences: typeof row.preferences === 'string' ? JSON.parse(row.preferences) : row.preferences })));
    });
}
function getProjectById(id) {
    return __awaiter(this, void 0, void 0, function* () {
        const row = yield (0, client_1.queryOne)('SELECT * FROM rebuild_projects WHERE id = $1', [id]);
        if (row) {
            return Object.assign(Object.assign({}, row), { location: typeof row.location === 'string' ? JSON.parse(row.location) : row.location, preferences: typeof row.preferences === 'string' ? JSON.parse(row.preferences) : row.preferences });
        }
        return null;
    });
}
function createProject(projectData) {
    return __awaiter(this, void 0, void 0, function* () {
        yield (0, client_1.execute)(`INSERT INTO rebuild_projects (id, user_id, name, location, preferences, status, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`, [
            projectData.id,
            projectData.userId,
            projectData.name,
            JSON.stringify(projectData.location),
            JSON.stringify(projectData.preferences),
            projectData.status
        ]);
        return {
            id: projectData.id,
            userId: projectData.userId,
            name: projectData.name,
            location: projectData.location,
            preferences: projectData.preferences,
            status: projectData.status,
            createdAt: new Date(),
            updatedAt: new Date()
        };
    });
}
function updateProject(id, updates) {
    return __awaiter(this, void 0, void 0, function* () {
        const fields = [];
        const values = [];
        let paramIndex = 1;
        Object.keys(updates).forEach(key => {
            if (key === 'location' || key === 'preferences') {
                fields.push(`${key} = $${paramIndex++}`);
                values.push(JSON.stringify(updates[key]));
            }
            else {
                fields.push(`${key} = $${paramIndex++}`);
                values.push(updates[key]);
            }
        });
        fields.push('updated_at = CURRENT_TIMESTAMP');
        values.push(id);
        yield (0, client_1.execute)(`UPDATE rebuild_projects SET ${fields.join(', ')} WHERE id = $${paramIndex}`, values);
    });
}
function saveUserPreferences(userId, preferences) {
    return __awaiter(this, void 0, void 0, function* () {
        // PostgreSQL uses INSERT...ON CONFLICT instead of INSERT OR REPLACE
        yield (0, client_1.execute)(`INSERT INTO user_preferences (user_id, preferences, updated_at)
     VALUES ($1, $2, CURRENT_TIMESTAMP)
     ON CONFLICT (user_id) DO UPDATE SET preferences = $2, updated_at = CURRENT_TIMESTAMP`, [userId, JSON.stringify(preferences)]);
    });
}
function getUserPreferences(userId) {
    return __awaiter(this, void 0, void 0, function* () {
        const row = yield (0, client_1.queryOne)('SELECT preferences FROM user_preferences WHERE user_id = $1', [userId]);
        if (row) {
            return typeof row.preferences === 'string' ? JSON.parse(row.preferences) : row.preferences;
        }
        return null;
    });
}
exports.default = router;
