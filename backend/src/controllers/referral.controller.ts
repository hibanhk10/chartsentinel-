import { Request, Response } from 'express';
import { referralService } from '../services/referral.service';

interface AuthRequest extends Request {
  user?: { id: string; email: string; role: string };
}

export const getReferralController = async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorised' });
    return;
  }

  const record = await referralService.getOrCreateForUser(req.user.id);

  res.json({
    code: record.code,
    usageCount: record.usageCount,
    // `rewardsEarned` = redemptions that crossed the paywall. The dashboard
    // shows it so users can see what they've actually earned vs. just how
    // many clicks they've sent.
    rewardsEarned: record.redemptions.filter((r) => r.rewardGrantedAt !== null).length,
    createdAt: record.createdAt,
  });
};
