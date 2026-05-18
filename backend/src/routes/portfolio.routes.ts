import { Router } from 'express';
import { authenticateToken } from '../middlewares/auth.middleware';
import {
  listPortfolios,
  createPortfolio,
  renamePortfolio,
  deletePortfolio,
  setPortfolioItems,
  scorePortfolio,
  portfolioRisk,
  portfolioCorrelations,
} from '../controllers/portfolio.controller';

const router = Router();

router.use(authenticateToken);

router.get('/', listPortfolios);
router.post('/', createPortfolio);
router.patch('/:id', renamePortfolio);
router.delete('/:id', deletePortfolio);
router.put('/:id/items', setPortfolioItems);
router.get('/:id/score', scorePortfolio);
router.get('/:id/risk', portfolioRisk);
router.get('/:id/correlations', portfolioCorrelations);

export default router;
