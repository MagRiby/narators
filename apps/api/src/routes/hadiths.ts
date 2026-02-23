import { Router } from 'express';
import { cache } from '../middleware/cache';
import * as ctrl from '../controllers/hadiths.controller';

const router = Router();

router.get('/:id', cache(300), ctrl.getHadith);

export default router;
