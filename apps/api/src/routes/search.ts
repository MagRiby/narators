import { Router } from 'express';
import { cache } from '../middleware/cache';
import { searchLimiter } from '../middleware/rateLimiter';
import * as ctrl from '../controllers/search.controller';

const router = Router();

router.get('/', searchLimiter, cache(30), ctrl.search);

export default router;
