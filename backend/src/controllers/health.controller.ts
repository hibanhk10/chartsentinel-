import { Request, Response } from 'express';

export const healthController = async (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
};
