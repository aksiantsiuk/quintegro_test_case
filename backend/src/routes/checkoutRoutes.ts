import { Router } from 'express';
import { CheckoutController } from '../controllers/checkoutController';

export function createCheckoutRoutes(checkoutController: CheckoutController): Router {
  const router = Router();

  /**
   * @swagger
   * /checkout:
   *   post:
   *     summary: Checkout (pay for) an order
   *     tags: [Checkout]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - id
   *               - firstName
   *               - lastName
   *               - emailAddress
   *               - deliveryAddress
   *               - paymentMethod
   *               - payment
   *               - order
   *             properties:
   *               id:
   *                 type: string
   *                 description: Order ID
   *                 example: "order-2"
   *               firstName:
   *                 type: string
   *                 example: "John"
   *               lastName:
   *                 type: string
   *                 example: "Doe"
   *               emailAddress:
   *                 type: string
   *                 example: "john.doe@example.com"
   *               deliveryAddress:
   *                 type: string
   *                 example: "221B Baker Street, London"
   *               paymentMethod:
   *                 type: string
   *                 example: "Visa"
   *               payment:
   *                 type: object
   *                 required: [cardNumber, cardHolder, expiryDate, cvv]
   *                 properties:
   *                   cardNumber:
   *                     type: string
   *                     pattern: '^\d{16}$'
   *                     example: "4111111111111111"
   *                   cardHolder:
   *                     type: string
   *                     example: "JOHN DOE"
   *                   expiryDate:
   *                     type: string
   *                     description: MM/YY, must not be in the past
   *                     example: "12/30"
   *                   cvv:
   *                     type: string
   *                     pattern: '^\d{3}$'
   *                     example: "123"
   *               order:
   *                 type: object
   *                 required: [products, total]
   *                 properties:
   *                   products:
   *                     type: array
   *                     minItems: 1
   *                     items:
   *                       type: object
   *                       required: [id, amount, price]
   *                       properties:
   *                         id:
   *                           type: string
   *                           example: "product-2"
   *                         amount:
   *                           type: integer
   *                           minimum: 1
   *                           maximum: 10
   *                           example: 1
   *                         price:
   *                           type: number
   *                           minimum: 0
   *                           example: 899.99
   *                   total:
   *                     type: number
   *                     description: Must match the sum of amount * price
   *                     example: 899.99
   *     responses:
   *       201:
   *         description: Checkout completed successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 id:
   *                   type: string
   *                   example: "order-2"
   *                 status:
   *                   type: string
   *                   example: "success"
   *       400:
   *         description: Bad request - a required field is empty, has an invalid format, or the order total does not match
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 error:
   *                   type: string
   *                   example: "firstName is required"
   *       403:
   *         description: Forbidden - Invalid or missing authentication token
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 error:
   *                   type: string
   *                   example: "Invalid or missing authentication token"
   *       404:
   *         description: Order not found, access denied or already submitted
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 error:
   *                   type: string
   *                   example: "Order not found, access denied or already submitted"
   *       500:
   *         description: Internal server error
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 error:
   *                   type: string
   *                   example: "Internal server error"
   */
  router.post('/', (req, res) => checkoutController.checkout(req, res));

  return router;
}
