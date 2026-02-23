import { Router } from 'express';
import { cache } from '../middleware/cache';
import * as ctrl from '../controllers/books.controller';

const router = Router();

router.get('/',               cache(600), ctrl.listBooks);
router.get('/:slug',          cache(300), ctrl.getBook);
router.get('/:slug/chapters', cache(300), ctrl.getChapters);
router.get('/:slug/hadiths',  cache(60),  ctrl.getHadiths);

export default router;
