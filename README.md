# Kisaan E-Shop

KISAAN ACCESSORIES — MASTER PROJECT INSTRUCTION

You are building a production-ready e-commerce website for Kisaan Accessories, a mobile and electronics accessories shop located at:

204, AR Mall, Surat, Gujarat, India

The project has six specification documents attached to this project:

PRD

TRD

UI/UX Design

App Flow

Backend Scheme

Final Implementation

These six documents are the project's source of truth.

1. PROJECT GOAL

Build a clean, modern, highly professional and attractive e-commerce storefront where customers can:

Discover Kisaan Accessories

Browse product categories

Open products inside each category

View product details

View multiple product images

See original price and selling price

See product descriptions

Select quantity

Add products to cart

Review cart

Place Cash on Delivery orders

Enter name, phone, complete address, city, state and pincode

Receive an order confirmation/order ID

The client/admin must be able to:

Login securely

Create/edit/delete categories

Create/edit/delete products

Manage original price

Manage selling price

Manage stock

Manage product descriptions

Upload multiple product images

Select/reorder the primary product image

Activate/deactivate products

View COD orders

View customer information

View ordered products and quantities

Update order status

Update COD payment status

2. EXISTING BACKEND — DO NOT RECREATE IT

A Supabase project has ALREADY been created and its database foundation has ALREADY been implemented and verified.

The existing database contains:

categories

products

product_images

orders

order_items

admin_users

It also contains:

PostgreSQL relationships

Foreign keys

Constraints

Indexes

Row Level Security

Admin authorization

Supabase Auth

Supabase Storage bucket: product-images

Secure COD order creation function

Inventory validation/deduction logic

DO NOT:

Drop tables

Recreate tables

Rename tables

Change existing relationships

Remove RLS

Disable security policies

Replace the database schema

Create a second competing database structure

Add unnecessary duplicate tables

Expose the Supabase service-role key to frontend code

If a backend change appears necessary, STOP and explain the required change before implementing it.

3. DATABASE IS THE SOURCE OF TRUTH

Never hard-code production categories or products into the frontend.

The storefront must read its data from Supabase.

Category flow:

categories
→ products
→ product_images

Order flow:

orders
→ order_items
→ products

Product images:

Supabase Storage
→ product-images bucket
→ product_images table
→ product detail gallery

4. CUSTOMER WEBSITE FLOW

The primary customer flow must be:

HOME
↓
CATEGORY
↓
PRODUCT LIST
↓
PRODUCT DETAIL
↓
ADD TO CART
↓
CART
↓
COD CHECKOUT
↓
ORDER SUCCESS

The home page must contain:

Professional hero section

Kisaan Accessories branding

Short shop introduction

Attractive product/category presentation

Category buttons

Shop/location information

Clean navigation

Cart access

IMPORTANT:

Categories must be displayed as buttons/cards with the category name.

Do NOT require category images.

Example:

Mouse
Printer
Mobile Cable
Mobile Case
etc.

Categories must be dynamically loaded from Supabase.

5. CATEGORY FLOW

When a customer clicks a category:

Show the products belonging to that category.

Each product card should show:

Product image

Product name

Original price

Selling price

Discount presentation when applicable

Availability/stock indication where appropriate

Clickable product card

Only active products should be publicly purchasable.

6. PRODUCT DETAIL FLOW

When a customer opens a product:

Show:

Large primary/hero image

Product image gallery

Support approximately 6–7 product images

Product name

Description

Original price

Selling price

Discount presentation

Stock/availability

Quantity selector

Add to Cart

Buy/checkout path

Product images must come from Supabase Storage and the product_images table.

Do not hard-code image URLs.

7. CART LOGIC

Cart is a customer-side shopping state for V1.

Support:

Add product

Increase quantity

Decrease quantity

Remove product

Show current quantity

Show subtotal

Show total items

Continue shopping

Proceed to COD checkout

IMPORTANT SECURITY RULE:

The cart's price and total are NOT authoritative.

The server/database must recalculate the final order using the current trusted product price from Supabase.

Never trust a client-supplied price or total.

8. COD CHECKOUT

Checkout must collect:

Customer name

Phone

Address

City

State

Pincode

Validate data on the client for good UX.

Validate it AGAIN on the server/database.

The customer sends product IDs and quantities.

The secure backend/database function must:

Fetch the real products

Verify products are active

Verify stock

Read the trusted selling price

Calculate the authoritative total

Create the order

Create order_items

Deduct stock atomically

Return the order ID

NEVER trust:

Client price

Client total

Client stock

Client order status

Client payment status

The order should use:

Payment method = COD

Initial payment status = PENDING

Initial order status = PENDING

9. HISTORICAL ORDER DATA

When creating order_items, preserve:

product_id

product_name

quantity

price

The historical product name and price must remain unchanged even if the admin later edits the product.

Do not replace historical order-item snapshots with current product values.

10. ADMIN FLOW

Admin flow:

ADMIN LOGIN
↓
ADMIN DASHBOARD
├── Categories
├── Products
├── Images
└── Orders

Admin authentication must use Supabase Auth.

Admin authorization must use the existing admin authorization mechanism.

Do NOT rely only on hiding frontend routes.

Database-level security must remain active.

11. ADMIN CATEGORY MANAGEMENT

Admin must be able to:

View categories

Add category

Edit category

Delete category safely

Category schema must remain:

categories

id

name

created_at

updated_at

Do not add category image requirements.

12. ADMIN PRODUCT MANAGEMENT

Admin product management must support:

Product name

Category

Description

Original price

Selling price

Stock

Active/inactive status

Multiple images

Primary image

Image ordering

Products must belong to an existing category.

Use the existing products and product_images tables.

13. PRODUCT IMAGE MANAGEMENT

Use the existing Supabase Storage bucket:

product-images

Flow:

Admin
→ Upload image
→ Supabase Storage
→ Store image reference in product_images

Support:

Multiple images

Image preview

Primary image

Ordering

Delete image

Do not store image binary data directly in PostgreSQL.

14. ADMIN ORDER MANAGEMENT

Admin must be able to see:

Order ID

Customer name

Phone

Address

City

State

Pincode

Ordered products

Quantity

Purchase-time price

Total

Payment method

Payment status

Order status

Order date

Order status:

PENDING
→ CONFIRMED
→ SHIPPED
→ DELIVERED

Cancellation:

PENDING / CONFIRMED
→ CANCELLED

Payment status for COD:

PENDING
→ PAID

Keep order status and payment status separate.

15. SECURITY REQUIREMENTS

Security is a first-class requirement.

Never:

Expose SUPABASE_SERVICE_ROLE_KEY in browser code

Trust client-side prices

Trust client-side totals

Trust client-side stock

Allow arbitrary order status changes from customers

Allow customers to modify orders

Disable RLS

Create unrestricted database writes

Put secrets in source code

Put secrets into public environment variables

Use insecure admin-only frontend checks as the only authorization layer

Use:

Supabase RLS

Supabase Auth

Server-side validation

Database constraints

Secure server/database order creation

Environment variables

Authorization checks

16. UI/UX REQUIREMENTS

The website must feel:

Clean

Professional

Modern

Trustworthy

Attractive

Easy to navigate

Mobile-first

Fast

Commercial rather than experimental

Avoid:

Excessive animations

Clutter

Unnecessary gradients

Excessive rounded cards

Generic AI-looking layouts

Fake testimonials

Fake ratings

Fake reviews

Fake discounts

Fake business claims

Placeholder content in production-facing areas

Use the attached UI/UX document as the primary visual reference.

17. RESPONSIVE DESIGN

The website must work properly on:

Mobile

Tablet

Desktop

Mobile shopping experience is especially important.

Ensure:

Touch-friendly buttons

Responsive product grids

Readable prices

Easy cart access

Easy checkout

Proper image sizing

No horizontal overflow

18. ERROR HANDLING

Every important data operation must have:

Loading state

Empty state

Error state

Success feedback

Examples:

Products unavailable

Category empty

Product deleted

Product inactive

Stock changed

Checkout failure

Image upload failure

Authentication failure

Database failure

Never show raw database errors, SQL errors, stack traces or secrets to customers.

19. IMPLEMENTATION METHOD

DO NOT build the entire application in one uncontrolled generation.

Work incrementally.

Before changing architecture or database structure, explain why.

Recommended sequence:

PHASE 1
Project foundation

PHASE 2
Supabase connection verification

PHASE 3
Global UI/layout

PHASE 4
Home page

PHASE 5
Categories

PHASE 6
Product listing

PHASE 7
Product detail/gallery

PHASE 8
Cart

PHASE 9
Secure COD checkout

PHASE 10
Order success

PHASE 11
Admin authentication

PHASE 12
Admin categories

PHASE 13
Admin products/images

PHASE 14
Admin orders

PHASE 15
Security testing

PHASE 16
Responsive testing

PHASE 17
Production deployment

Do not jump ahead unless explicitly instructed.

20. IMPORTANT DEVELOPMENT RULE

Before implementing any feature:

Read the relevant attached specification.

Check whether the existing database supports it.

Reuse existing architecture.

Implement the smallest required change.

Test the feature.

Check for regressions.

Only then continue.

If requirements conflict, do NOT silently choose a solution.

Explain the conflict and ask before making an architectural change.

21. CURRENT TASK

For this first task, DO NOT build the complete website.

First:

Inspect the existing project.

Inspect the attached six specification documents.

Inspect the existing Supabase integration if available.

Understand the existing database structure.

Do NOT modify or recreate the database.

Do NOT build the admin panel yet.

Do NOT build checkout yet.

Do NOT add payment gateway.

Do NOT add unnecessary dependencies.

Then create only the project's initial frontend foundation:

Application structure

Global styling foundation

Responsive layout foundation

Header/navigation foundation

Footer foundation

Basic reusable UI components

Routing structure required by the approved App Flow

Do NOT invent final product data.

Do NOT create fake production content.

After completing this task, report:

What files/components were created

What routes were created

What Supabase connection was detected/configured

What was intentionally NOT changed

Any issues found

Any assumptions made

Wait for the next instruction before implementing the next phase.

FINAL RULE

The goal is not merely to make the website look good.

The goal is to build a secure, maintainable, database-driven production website that follows the six approved project documents.

When in doubt:

Preserve the existing architecture and security.
Do not make destructive changes.
Do not guess.
Do not hard-code production data.
Do not expose secrets.
Do not bypass RLS.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/3128c9ce-919e-406f-9107-74e0fe59aeaa).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
