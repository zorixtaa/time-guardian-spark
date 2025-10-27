// Example express-style handlers for break endpoints
// Adapt to your framework (Next.js API routes, Vite server, etc.)
import express from 'express';
import {
  requestBreak,
  approveBreak,
  startBreak,
  endBreak,
  cancelBreak,
  forceEndBreak,
} from '../lib/attendance';

const router = express.Router();

// Middleware: authenticate, attach user, team membership checks
// Example request: { type: 'break'|'lunch', notes?: string, teamId: string }
router.post('/request', async (req, res) => {
  try {
    const user = (req as any).user; // attach from auth middleware
    const { type, notes, teamId } = req.body;
    if (!user) return res.status(401).json({ error: 'not authenticated' });
    const br = await requestBreak({ employeeId: user.id, teamId, type, notes });
    res.json(br);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Approve: Only team lead/admin for the team
router.post('/:id/approve', async (req, res) => {
  try {
    const user = (req as any).user;
    const { id } = req.params;
    // TODO: verify user can approve for the request's team
    if (!user) return res.status(401).json({ error: 'not authenticated' });
    const br = await approveBreak({ breakId: id, approverId: user.id });
    res.json(br);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/start', async (req, res) => {
  try {
    const { id } = req.params;
    const br = await startBreak({ breakId: id });
    res.json(br);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/end', async (req, res) => {
  try {
    const { id } = req.params;
    const br = await endBreak({ breakId: id });
    res.json(br);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/cancel', async (req, res) => {
  try {
    const { id } = req.params;
    const br = await cancelBreak({ breakId: id });
    res.json(br);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Force-end: admin scoped to team
router.post('/:id/force-end', async (req, res) => {
  try {
    const user = (req as any).user;
    const { id } = req.params;
    // TODO: verify user is on same team and has moderation rights
    if (!user) return res.status(401).json({ error: 'not authenticated' });
    const br = await forceEndBreak({ breakId: id, actorId: user.id });
    res.json(br);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;