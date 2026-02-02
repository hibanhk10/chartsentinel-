import { Request, Response } from 'express';

export const healthController = async (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
};
