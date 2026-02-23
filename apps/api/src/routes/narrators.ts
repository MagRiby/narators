import { Router } from 'express';
import { cache } from '../middleware/cache';
import * as ctrl from '../controllers/narrators.controller';

const router = Router();

router.get('/',            cache(60),  ctrl.listNarrators);
router.get('/:id',         cache(300), ctrl.getNarrator);
router.get('/:id/hadiths', cache(60),  ctrl.getNarratorHadiths);
router.get('/:id/graph',   cache(600), ctrl.getNarratorGraph);

export default router;
