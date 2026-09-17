import { gql } from 'apollo-server-express';

export const typeDefs = gql`
  type Product {
    id: ID!
    title: String!
    description: String!
    image: String!
  }

  type OrderItem {
    product: Product!
    amount: Int!
    price: Float!
  }

  type Promo {
    id: ID!
    discount: Int!
    dueDate: Float!
  }

  type Order {
    orderId: ID!
    status: OrderStatus!
    products: [OrderItem!]!
    promo: Promo
  }

  enum OrderStatus {
    created
    submited
    finished
  }

  input ProductInput {
    id: ID!
    amount: Int!
    price: Float!
  }

  input LoginInput {
    login: String!
    password: String!
  }

  type LoginResponse {
    token: String!
  }

  input PaymentDetailsInput {
    cardNumber: String!
    cardHolder: String!
    expiryDate: String!
    cvv: String!
  }

  input OrderDetailsInput {
    products: [ProductInput!]!
    total: Float!
  }

  input CheckoutInput {
    id: ID!
    firstName: String!
    lastName: String!
    emailAddress: String!
    deliveryAddress: String!
    paymentMethod: String!
    payment: PaymentDetailsInput!
    order: OrderDetailsInput!
  }

  type CheckoutResult {
    id: ID!
    status: String!
  }

  type Query {
    orders: [Order!]!
    order(orderId: ID!): Order
    orderSum(orderId: ID!, products: [ProductInput!]!, promo: String): Float!
    promo(promoId: ID!): Promo
  }

  type Mutation {
    login(input: LoginInput!): LoginResponse!
    submitOrder(orderId: ID!): Boolean!
    deleteProductFromOrder(orderId: ID!, productId: ID!): Order
    checkout(input: CheckoutInput!): CheckoutResult!
  }
`;
