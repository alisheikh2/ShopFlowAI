# PDF Invoice Generation Module

This module generates a professional ShopFlowAI PDF invoice and emails it to the customer when an order is placed.

## What is included

- PDF invoice generated with `pdfkit`
- Email delivery through existing `nodemailer` SMTP setup
- Invoice attachment sent immediately after `POST /api/v1/orders`
- Download endpoint: `GET /api/v1/orders/:id/invoice`
- Invoice fields:
  - ShopFlowAI header/logo, Amazon-style order/invoice number, invoice date
  - Seller legal name, business address, Tax/VAT/GST ID
  - Buyer billing information
  - Shipping information and delivery method
  - Payment method, payment status, transaction reference
  - Product description, ASIN/SKU, quantity, unit price, tax, line total
  - Subtotal, shipping fees, tax breakdown, grand total

## Environment variables

Add these optional variables to your `.env` file to customize invoice business details:

```env
INVOICE_CURRENCY=PKR
INVOICE_TAX_RATE=0
DEFAULT_DELIVERY_METHOD=Standard Delivery
SELLER_LEGAL_NAME=ShopFlowAI Technologies
SELLER_BUSINESS_ADDRESS=Okara, Punjab, Pakistan
SELLER_TAX_ID=Tax/VAT/GST ID: N/A
SELLER_SUPPORT_EMAIL=shopflowai.dev@gmail.com
SELLER_SUPPORT_PHONE=+923346956216
SMTP_SECURE=false
```

## Order request additions

Existing order requests still work. You can optionally send:

```json
{
  "shippingAddress": {
    "fullName": "Ali Khan",
    "phone": "+923001234567",
    "address": "House 1, Street 2",
    "city": "Okara",
    "postalCode": "56300",
    "country": "Pakistan"
  },
  "billingAddress": {
    "fullName": "Ali Khan",
    "phone": "+923001234567",
    "address": "House 1, Street 2",
    "city": "Okara",
    "postalCode": "56300",
    "country": "Pakistan"
  },
  "deliveryMethod": "Standard Delivery",
  "paymentMethod": "cod",
  "transactionReference": "optional-reference"
}
```

If `billingAddress` is not provided, the system uses `shippingAddress` as the billing address.

## Product SKU

Products now support an optional `sku` field. If a product does not have a SKU, the invoice automatically uses a generated fallback like `SKU-ABC12345` based on the product ID.


## Email notifications added

The project also supports order and inventory emails:

- Customer order confirmation
- Payment successful
- Payment failed
- Order status update: processing, shipped, delivered, cancelled
- Admin new order notification
- Admin low stock alert

Configure recipients and threshold in `.env`:

```env
ADMIN_NOTIFICATION_EMAILS=shopflowai.dev@gmail.com
LOW_STOCK_THRESHOLD=5
```

If `ADMIN_NOTIFICATION_EMAILS` is empty, the system tries admin users from the database, then falls back to `SELLER_SUPPORT_EMAIL`.
