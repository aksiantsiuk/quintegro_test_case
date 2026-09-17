export interface UserRecord {
  id: string;
  name: string;
}

export interface AuthRecord {
  userId: string;
  login: string;
  password: string;
}

export interface LoginRequest {
  login: string;
  password: string;
}

export interface LoginResponse {
  token: string;
}

export interface ProductRecord {
  id: string;
  title: string;
  description: string;
  image: string;
}

export interface OrderRecord {
  orderId: string;
  userId: string;
  status: 'created' | 'submited' | 'finished';
  createAt: number;
  products: Array<{
    id: string;
    amount: number;
    price: number;
  }>;
  promo?: PromoEntity;
}

export interface OrderDTO {
  orderId: string;
  status: 'created' | 'submited' | 'finished';
  products: Array<{
    product: ProductRecord;
    amount: number;
    price: number;
  }>;
  promo?: PromoEntity;
}

export interface PaymentDetails {
  cardNumber: string;
  cardHolder: string;
  expiryDate: string;
  cvv: string;
}

export interface OrderDetails {
  products: Array<{
    id: string;
    amount: number;
    price: number;
  }>;
  total: number;
}

export interface CheckoutRequest {
  id: string;
  firstName: string;
  lastName: string;
  emailAddress: string;
  deliveryAddress: string;
  paymentMethod: string;
  payment: PaymentDetails;
  order: OrderDetails;
}

export interface CheckoutResponse {
  id: string;
  status: 'success';
}

export interface PromoEntity {
  id: string;
  discount: number;
  dueDate: number;
}
