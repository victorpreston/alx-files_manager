import { Router } from 'express';
import appRouter from './app';
import authRouter from './auth';
import usersRouter from './users';
import filesRouter from './files';

/**
 * App Router
 */
const router = Router();
router.use(appRouter);
router.use(authRouter);
router.use(usersRouter);
router.use(filesRouter);

export default router;