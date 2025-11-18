import express, { Request, Response } from 'express';
import { query, queryOne, execute } from '../database/client';
import { logger } from '../utils/logger';
import { authenticateToken } from './auth';
import { sanitizeInput } from '../middleware/sanitizeInput';
import { RebuildProject, DesignMatch, ApiResponse } from '@aldeia/shared-types';
import { stringUtils } from '@aldeia/utils';

const router = express.Router();

// Apply input sanitization middleware
router.use(sanitizeInput);

// ====================================================================
// GET USER PROJECTS (Protected Route)
// ====================================================================

router.get('/projects', authenticateToken, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      } as ApiResponse);
    }

    const userId = req.user.userId;
    const { status, limit = 20, offset = 0 } = req.query;

    let query = 'SELECT * FROM rebuild_projects WHERE user_id = ?';
    const params: any[] = [userId];

    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }

    query += ' ORDER BY updated_at DESC LIMIT ? OFFSET ?';
    params.push(Number(limit), Number(offset));

    const projects = await getProjects(query, params);

    res.json({
      success: true,
      data: {
        projects,
        total: projects.length,
        limit: Number(limit),
        offset: Number(offset)
      }
    } as ApiResponse);

  } catch (error) {
    logger.error('Get projects error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve projects'
    } as ApiResponse);
  }
});

// ====================================================================
// CREATE NEW PROJECT (Protected Route)
// ====================================================================

interface CreateProjectRequest {
  name: string;
  location: {
    address: string;
    coordinates: {
      lat: number;
      lng: number;
    };
  };
  preferences?: {
    style?: string;
    needs?: string[];
    budget?: number;
  };
}

router.post('/projects', authenticateToken, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      } as ApiResponse);
    }

    const userId = req.user.userId;
    const { name, location, preferences = {} }: CreateProjectRequest = req.body;

    // Validation
    if (!name || !location || !location.address) {
      return res.status(400).json({
        success: false,
        error: 'Name and location are required'
      } as ApiResponse);
    }

    const projectData = {
      id: stringUtils.generateId(),
      userId,
      name: stringUtils.sanitize(name),
      location,
      preferences,
      status: 'planning' as const
    };

    const project = await createProject(projectData);

    logger.info(`New project created: ${project.name} by user ${userId}`);

    res.status(201).json({
      success: true,
      data: project,
      message: 'Project created successfully'
    } as ApiResponse<RebuildProject>);

  } catch (error) {
    logger.error('Create project error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create project'
    } as ApiResponse);
  }
});

// ====================================================================
// UPDATE PROJECT (Protected Route)
// ====================================================================

router.put('/projects/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      } as ApiResponse);
    }

    const { id } = req.params;
    const userId = req.user.userId;
    const updates = req.body;

    // Check if project belongs to user
    const project = await getProjectById(id);
    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      } as ApiResponse);
    }

    if (project.user_id !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      } as ApiResponse);
    }

    await updateProject(id, updates);

    logger.info(`Project updated: ${id} by user ${userId}`);

    res.json({
      success: true,
      message: 'Project updated successfully'
    } as ApiResponse);

  } catch (error) {
    logger.error('Update project error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update project'
    } as ApiResponse);
  }
});

// ====================================================================
// GET DESIGN MATCHES
// ====================================================================

router.get('/designs', async (req: Request, res: Response) => {
  try {
    const { style, budget, location, limit = 10 } = req.query;

    // Mock design matches - in real implementation, this would query a designs database
    const mockDesigns: DesignMatch[] = [
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
      filteredDesigns = filteredDesigns.filter(design => 
        design.style.toLowerCase().includes(style.toString().toLowerCase())
      );
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
    } as ApiResponse);

  } catch (error) {
    logger.error('Get designs error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve designs'
    } as ApiResponse);
  }
});

// ====================================================================
// SAVE USER PREFERENCES (Protected Route)
// ====================================================================

interface PreferencesRequest {
  style: string;
  needs: string[];
  budget?: number;
  additionalInfo?: string;
}

router.post('/preferences', authenticateToken, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      } as ApiResponse);
    }

    const userId = req.user.userId;
    const preferences: PreferencesRequest = req.body;

    await saveUserPreferences(userId, preferences);

    logger.info(`Preferences saved for user ${userId}`);

    res.json({
      success: true,
      message: 'Preferences saved successfully'
    } as ApiResponse);

  } catch (error) {
    logger.error('Save preferences error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to save preferences'
    } as ApiResponse);
  }
});

// ====================================================================
// GET USER PREFERENCES (Protected Route)
// ====================================================================

router.get('/preferences', authenticateToken, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      } as ApiResponse);
    }

    const userId = req.user.userId;

    const preferences = await getUserPreferences(userId);

    res.json({
      success: true,
      data: preferences || {}
    } as ApiResponse);

  } catch (error) {
    logger.error('Get preferences error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve preferences'
    } as ApiResponse);
  }
});

// ====================================================================
// HELPER FUNCTIONS - Database Operations
// ====================================================================

async function getProjects(sql: string, params: any[]): Promise<any[]> {
  const rows = await query(sql, params);
  return rows.map((row: any) => ({
    ...row,
    location: typeof row.location === 'string' ? JSON.parse(row.location) : row.location,
    preferences: typeof row.preferences === 'string' ? JSON.parse(row.preferences) : row.preferences
  }));
}

async function getProjectById(id: string): Promise<any> {
  const row = await queryOne(
    'SELECT * FROM rebuild_projects WHERE id = $1',
    [id]
  );

  if (row) {
    return {
      ...row,
      location: typeof row.location === 'string' ? JSON.parse(row.location) : row.location,
      preferences: typeof row.preferences === 'string' ? JSON.parse(row.preferences) : row.preferences
    };
  }
  return null;
}

async function createProject(projectData: any): Promise<RebuildProject> {
  await execute(
    `INSERT INTO rebuild_projects (id, user_id, name, location, preferences, status, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
    [
      projectData.id,
      projectData.userId,
      projectData.name,
      JSON.stringify(projectData.location),
      JSON.stringify(projectData.preferences),
      projectData.status
    ]
  );

  return {
    id: projectData.id,
    userId: projectData.userId,
    name: projectData.name,
    location: projectData.location,
    preferences: projectData.preferences,
    status: projectData.status,
    createdAt: new Date(),
    updatedAt: new Date()
  } as RebuildProject;
}

async function updateProject(id: string, updates: any): Promise<void> {
  const fields: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  Object.keys(updates).forEach(key => {
    if (key === 'location' || key === 'preferences') {
      fields.push(`${key} = $${paramIndex++}`);
      values.push(JSON.stringify(updates[key]));
    } else {
      fields.push(`${key} = $${paramIndex++}`);
      values.push(updates[key]);
    }
  });

  fields.push('updated_at = CURRENT_TIMESTAMP');
  values.push(id);

  await execute(
    `UPDATE rebuild_projects SET ${fields.join(', ')} WHERE id = $${paramIndex}`,
    values
  );
}

async function saveUserPreferences(userId: string, preferences: any): Promise<void> {
  // PostgreSQL uses INSERT...ON CONFLICT instead of INSERT OR REPLACE
  await execute(
    `INSERT INTO user_preferences (user_id, preferences, updated_at)
     VALUES ($1, $2, CURRENT_TIMESTAMP)
     ON CONFLICT (user_id) DO UPDATE SET preferences = $2, updated_at = CURRENT_TIMESTAMP`,
    [userId, JSON.stringify(preferences)]
  );
}

async function getUserPreferences(userId: string): Promise<any> {
  const row = await queryOne(
    'SELECT preferences FROM user_preferences WHERE user_id = $1',
    [userId]
  );

  if (row) {
    return typeof row.preferences === 'string' ? JSON.parse(row.preferences) : row.preferences;
  }
  return null;
}

export default router;