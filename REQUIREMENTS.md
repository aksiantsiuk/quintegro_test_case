# Checkout Process: Requirements

## 1. Overview

A logged-in user who has products in an order can check out that order. They provide contact, delivery and card payment details, confirm the order total, and get a success page when payment completes.

### 1.1 Scope

| In scope | Out of scope |
| --- | --- |
| Checkout page (`/checkout/:orderId`) | Real payment provider integration |
| Results page (`/results`) | Storing payment or customer details |
| Checkout API (REST `POST /api/checkout`, GraphQL `checkout` mutation) | Order history of checkouts, refunds, cancellations |
| Redirecting logged-out users to login for checkout pages | Returning to checkout after login |
| Validating contact, card and order data | Luhn check or real card verification |

### 1.2 Actors

| Actor | Description |
| --- | --- |
| Logged-in user | User with a valid JWT in `localStorage.auth_token` |
| Anonymous user | User without a token |
| Backend | Express API (REST + GraphQL) with in-memory repositories |

## 2. User flow (happy path)

1. The user has products in an order with status `created`.
2. The user opens `/order`.
3. The user clicks **Submit Order** and is taken to `/checkout/:orderId`.
4. The page shows the form and the order total.
5. The user fills in all required fields and clicks **Checkout**.
6. The button is disabled until the backend responds.
7. On success the user is taken to `/results` with a success message.

## 3. Functional requirements

### 3.1 Access control

| ID | Requirement |
| --- | --- |
| FR-1 | `/checkout/:orderId` and `/results` are available only to logged-in users. |
| FR-2 | An anonymous user opening either page is redirected to `/login`. |
| FR-3 | After login the user goes to the home page (`/`), as for any other login. |
| FR-4 | If the backend replies `Authentication required` (e.g. the token expired), the frontend removes the token and redirects to `/login`. |
| FR-5 | The checkout API requires a `Authorization: Bearer <JWT>` header. A user can check out only their own orders. |

### 3.2 Order page

| ID | Requirement |
| --- | --- |
| FR-6 | **Submit Order** is shown only for orders with status `created`. |
| FR-7 | **Submit Order** goes to `/checkout/:orderId` and passes the order's current items, including quantity changes made on the page. |

### 3.3 Checkout page

| ID | Requirement |
| --- | --- |
| FR-8 | The page shows these required fields, grouped as follows. |
| | *Contact and delivery:* First name, Last name, Email address, Delivery address |
| | *Payment method:* a dropdown with `Visa` and `MasterCard` |
| | *Payment details:* Card number, Card holder, Expiry date (`MM/YY`), CVV |
| FR-9 | The order items come from the order page. If they are missing (e.g. after a page refresh), the page loads the order from the backend. |
| FR-10 | The **order total** (sum of `amount × price`, rounded to 2 decimals) is shown between the form fields and the **Checkout** button. |
| FR-11 | While the order is loading, the page shows a loading indicator. |
| FR-12 | If the order can't be loaded or has no products, the page shows an error message instead of the form. |
| FR-13 | On **Checkout**, the frontend validates every field (see §5). Invalid fields show an inline message and no request is sent. |
| FR-14 | Editing a field clears its error message. |
| FR-15 | While the payment request is running, the **Checkout** button and all fields are disabled, and the button label changes to `Processing...`. |
| FR-16 | On a failed request, the error message is shown above the button and the form becomes editable again so the user can retry. |
| FR-17 | On success the user is taken to `/results`. The cached order list is cleared so `/order` shows the updated status. |

### 3.4 Results page

| ID | Requirement |
| --- | --- |
| FR-18 | Shows a success message, including the order id when it's available. |
| FR-19 | Provides a link back to `/order`. |

### 3.5 Backend checkout

| ID | Requirement |
| --- | --- |
| FR-20 | REST: `POST /api/checkout` accepts the contract in §4. |
| FR-21 | GraphQL: `checkout(input: CheckoutInput!): CheckoutResult!` accepts the same data. |
| FR-22 | Both endpoints use one shared `CheckoutService`, so they have the same validation and behavior. |
| FR-23 | The backend validates the request (see §5) and replies with the first validation error it finds. |
| FR-24 | The backend recomputes the order total from `order.products` and rejects the request if it differs from `order.total` by more than 0.01. |
| FR-25 | On success the order status changes from `created` to `submited`. |
| FR-26 | Checkout fails if the order doesn't exist, belongs to another user, or is not in status `created` (e.g. already checked out). |

## 4. API contract

### 4.1 Request

`POST /api/checkout` (the same shape is used as GraphQL `CheckoutInput`)

```json
{
  "id": "order-2",
  "firstName": "John",
  "lastName": "Doe",
  "emailAddress": "john.doe@example.com",
  "deliveryAddress": "221B Baker Street, London",
  "paymentMethod": "Visa",
  "payment": {
    "cardNumber": "4111111111111111",
    "cardHolder": "JOHN DOE",
    "expiryDate": "12/30",
    "cvv": "123"
  },
  "order": {
    "products": [
      { "id": "product-2", "amount": 1, "price": 899.99 }
    ],
    "total": 899.99
  }
}
```

`id` is the order id. No separate id is generated.

### 4.2 Responses (REST)

| Status | Body | When |
| --- | --- | --- |
| 201 | `{ "id": "order-2", "status": "success" }` | Checkout completed |
| 400 | `{ "error": "<message>" }` | A field is missing, has the wrong format, or the total doesn't match |
| 403 | `{ "error": "Invalid or missing authentication token" }` | No token or an invalid token |
| 404 | `{ "error": "Order not found, access denied or already submitted" }` | FR-26 |
| 500 | `{ "error": "Internal server error" }` | Unexpected exception |

GraphQL returns the same messages in `errors[].message`. A missing token gives `Authentication required`.

## 5. Validation rules

The same rules apply on the frontend and the backend.

| Field | Rule |
| --- | --- |
| `id`, `firstName`, `lastName`, `emailAddress`, `deliveryAddress`, `paymentMethod` | Required, not blank after trimming |
| `payment.cardNumber` | Required, exactly 16 digits (the frontend removes spaces before sending) |
| `payment.cardHolder` | Required, not blank |
| `payment.expiryDate` | Required, format `MM/YY` with month `01`–`12`; the card is valid through the end of that month, so an earlier month is rejected |
| `payment.cvv` | Required, exactly 3 digits |
| `order.products` | Non-empty array |
| `order.products[].id` | Required, not blank |
| `order.products[].amount` | Integer from 1 to 10 |
| `order.products[].price` | Number ≥ 0 |
| `order.total` | Number; must match the server-computed total within 0.01 |

## 6. Non-functional requirements

### 6.1 Security

| ID | Requirement |
| --- | --- |
| NFR-1 | Card data (number, holder, expiry, CVV) is never stored or logged by the backend. Error logs contain only messages, never request bodies. |
| NFR-2 | All checkout input is treated as untrusted and validated on the server, whatever the frontend already checked. |
| NFR-3 | The order total is never trusted from the client; the server recalculates it (FR-24). |
| NFR-4 | Users can only check out their own orders (ownership check via the JWT `userId`). |
| NFR-5 | The CVV field is masked (`type="password"`). Card fields use the standard `cc-*` browser autofill hints. |
| NFR-6 | *Known limitation:* card data is sent as plain JSON to the app backend. A production system must use a PCI DSS compliant payment provider that turns card data into a token, and must serve the app over HTTPS only. |

### 6.2 Reliability and error handling

| ID | Requirement |
| --- | --- |
| NFR-7 | Every backend error returns a clear status code and a JSON error body (§4.2). No unhandled exception may crash a request. |
| NFR-8 | The frontend survives failed requests: it shows the error and lets the user retry without losing what they typed. |
| NFR-9 | The flow must work despite the test middleware, which adds a 1.5 s delay to every request and returns a 500 error on every 5th request. |
| NFR-10 | Repeating a checkout for the same order must not charge it twice: the second attempt is rejected (FR-26). |

### 6.3 Performance

| ID | Requirement |
| --- | --- |
| NFR-11 | Backend checkout validation grows linearly with the number of products (at most a few items per order) and adds no noticeable delay beyond the network and the test delay. |
| NFR-12 | The checkout page makes at most one order request (only when the items weren't passed from the order page) and one checkout request per submit. |

### 6.4 Usability and accessibility

| ID | Requirement |
| --- | --- |
| NFR-13 | Every input has a visible `<label>` linked with `htmlFor`/`id`. |
| NFR-14 | Invalid fields set `aria-invalid` and link to their error message with `aria-describedby`. |
| NFR-15 | Submit errors are announced with `role="alert"`. |
| NFR-16 | Numeric card fields use `inputMode="numeric"`, and each field has a `maxLength` (card number 19, expiry 5, CVV 3). |
| NFR-17 | The page shows loading, error and empty states (FR-11, FR-12). |
| NFR-18 | The layout is a single centered card that stays usable on narrow screens. |

### 6.5 Maintainability

| ID | Requirement |
| --- | --- |
| NFR-19 | The backend follows the existing layers: route → controller → service → repository. Business rules live only in `CheckoutService`. |
| NFR-20 | REST and GraphQL share the same service; neither transport contains its own validation logic. |
| NFR-21 | The frontend follows the existing structure (`pages/`, `components/`, `graphql/`) and UI kit (`components/ui`). No new dependencies are added. |
| NFR-22 | TypeScript strict mode. New code avoids `any`, except in GraphQL resolver signatures (`parent`, `context`), which follow the existing untyped resolver pattern. Untrusted input is typed as `unknown` and checked before use. |
| NFR-23 | The REST endpoint is documented in Swagger (`/api-docs`). |

### 6.6 Compatibility and deployment

| ID | Requirement |
| --- | --- |
| NFR-24 | The app is served under the `/runtime` base path; the REST endpoint lives under `/api` so the existing nginx and Vite proxy rules reach it. |
| NFR-25 | Stack: React 18, React Router v5, Apollo Client 3, Express 4, Apollo Server 3, Node 20. |

## 7. Constraints and assumptions

- Data is stored in memory and reset when the server restarts; there is no database.
- REST and GraphQL each have their own in-memory repositories (existing design), so a checkout through one is not visible through the other. The frontend uses GraphQL only.
- Quantity changes on `/order` are not saved to the backend; they reach checkout only through the items passed from the order page.
- The login guard checks only that a token exists; an expired token is detected when the backend rejects the request (FR-4).

## 8. Acceptance criteria

1. An anonymous user opening `/checkout/order-2` lands on `/login`.
2. A logged-in user clicks **Submit Order** on `/order` and lands on `/checkout/<orderId>` with the correct order total, including quantity changes.
3. Submitting an empty form shows an inline error for every field and sends no request.
4. Invalid card number, expiry or CVV formats show field-specific errors.
5. With valid data, the **Checkout** button is disabled during the request, then the user lands on `/results` with a success message.
6. Back on `/order`, the order shows status `submited` and no **Submit Order** button.
7. `POST /api/checkout` returns 201, 400, 403, 404 and 500 as described in §4.2.
8. No card data appears in the backend logs.
