import { Request, Response } from 'express';
import { CheckoutService } from '../services/checkoutService';
import { AuthService } from '../services/authService';
import { CheckoutRequest, CheckoutResponse } from '../types/entities';

export class CheckoutController {
  constructor(
    private checkoutService: CheckoutService,
    private authService: AuthService
  ) {}

  private extractUserIdFromToken(req: Request): string | null {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }

    const decoded = this.authService.verifyToken(authHeader.substring(7));
    if (!decoded || !decoded.userId) {
      return null;
    }

    return decoded.userId;
  }

  async checkout(req: Request<{}, {}, CheckoutRequest>, res: Response<CheckoutResponse | { error: string }>) {
    try {
      const userId = this.extractUserIdFromToken(req);

      if (!userId) {
        return res.status(403).json({ error: 'Invalid or missing authentication token' });
      }

      const result = await this.checkoutService.checkout(req.body, userId);

      if (!result.ok) {
        const status = result.reason === 'invalid' ? 400 : 404;
        return res.status(status).json({ error: result.error });
      }

      return res.status(201).json(result.data);
    } catch (error) {
      console.error('Checkout error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
}
