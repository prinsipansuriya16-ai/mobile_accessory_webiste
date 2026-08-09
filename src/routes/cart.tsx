import { createFileRoute, Link } from "@tanstack/react-router";
import { Minus, Plus, Trash2 } from "lucide-react";

import { Container } from "@/components/layout/Container";
import { EmptyState } from "@/components/common/States";
import { Button } from "@/components/ui/button";
import { useCart } from "@/lib/cart";

export const Route = createFileRoute("/cart")({
  head: () => ({
    meta: [
      { title: "Your Cart — Kisaan Accessories" },
      {
        name: "description",
        content:
          "Review the accessories in your cart before placing a Cash on Delivery order.",
      },
      {
        property: "og:title",
        content: "Your Cart — Kisaan Accessories",
      },
      {
        property: "og:description",
        content:
          "Review your items and continue to Cash on Delivery checkout.",
      },
    ],
  }),
  component: CartPage,
});

function CartPage() {
  const {
    items,
    total,
    updateQuantity,
    removeItem,
  } = useCart();

  if (items.length === 0) {
    return (
      <Container className="section-y">
        <h1 className="font-display text-2xl font-bold sm:text-3xl">
          Your Cart
        </h1>

        <div className="mt-8">
          <EmptyState
            title="Your cart is empty"
            description="Add some accessories to your cart and they will appear here."
            action={
              <Button asChild>
                <Link to="/categories">
                  Continue Shopping
                </Link>
              </Button>
            }
          />
        </div>
      </Container>
    );
  }

  const totalItems = items.reduce(
    (sum, item) => sum + item.quantity,
    0,
  );

  return (
    <Container className="section-y">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h1 className="font-display text-2xl font-bold sm:text-3xl">
            Your Cart
          </h1>

          <p className="mt-1 text-sm text-muted-foreground">
            {totalItems}{" "}
            {totalItems === 1 ? "item" : "items"} in your cart
          </p>
        </div>

        <Button asChild variant="outline">
          <Link to="/categories">
            Continue Shopping
          </Link>
        </Button>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_360px]">
        {/* Cart Items */}
        <div className="space-y-4">
          {items.map((item) => {
            const lineTotal =
              item.sellingPrice * item.quantity;

            const hasDiscount =
              item.originalPrice > item.sellingPrice;

            const discountPercentage = hasDiscount
              ? Math.round(
                  ((item.originalPrice -
                    item.sellingPrice) /
                    item.originalPrice) *
                    100,
                )
              : 0;

            return (
              <div
                key={item.productId}
                className="rounded-xl border border-border bg-surface p-4 sm:p-5"
              >
                <div className="flex gap-4">
                  {/* Product Image */}
                  <div className="flex size-24 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-background sm:size-28">
                    {item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        className="h-full w-full object-contain p-2"
                      />
                    ) : (
                      <span className="px-2 text-center text-xs text-muted-foreground">
                        No image
                      </span>
                    )}
                  </div>

                  {/* Product Details */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <Link
                        to="/product/$productId"
                        params={{
                          productId: item.productId,
                        }}
                        className="font-semibold hover:text-accent"
                      >
                        {item.name}
                      </Link>

                      <button
                        type="button"
                        onClick={() =>
                          removeItem(item.productId)
                        }
                        className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                        aria-label={`Remove ${item.name} from cart`}
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>

                    {/* Price + Discount */}
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span className="text-lg font-bold">
                        ₹
                        {item.sellingPrice.toLocaleString(
                          "en-IN",
                        )}
                      </span>

                      {hasDiscount && (
                        <>
                          <span className="text-sm text-muted-foreground line-through">
                            ₹
                            {item.originalPrice.toLocaleString(
                              "en-IN",
                            )}
                          </span>

                          <span className="rounded-full bg-accent/10 px-2 py-0.5 text-xs font-semibold text-accent">
                            {discountPercentage}% OFF
                          </span>
                        </>
                      )}
                    </div>

                    {/* Quantity + Line Total */}
                    <div className="mt-4 flex items-center justify-between gap-4">
                      <div className="flex items-center rounded-lg border border-border">
                        <button
                          type="button"
                          disabled={item.quantity <= 1}
                          onClick={() =>
                            updateQuantity(
                              item.productId,
                              item.quantity - 1,
                            )
                          }
                          className="p-2 disabled:cursor-not-allowed disabled:opacity-40"
                          aria-label="Decrease quantity"
                        >
                          <Minus className="size-4" />
                        </button>

                        <span className="min-w-10 text-center text-sm font-medium">
                          {item.quantity}
                        </span>

                        <button
                          type="button"
                          disabled={
                            item.quantity >= item.stock
                          }
                          onClick={() =>
                            updateQuantity(
                              item.productId,
                              item.quantity + 1,
                            )
                          }
                          className="p-2 disabled:cursor-not-allowed disabled:opacity-40"
                          aria-label="Increase quantity"
                        >
                          <Plus className="size-4" />
                        </button>
                      </div>

                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">
                          Line Total
                        </p>

                        <p className="font-bold">
                          ₹
                          {lineTotal.toLocaleString(
                            "en-IN",
                          )}
                        </p>
                      </div>
                    </div>

                    {/* Stock */}
                    <p className="mt-2 text-xs text-muted-foreground">
                      Available stock: {item.stock}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Order Summary */}
        <aside className="h-fit rounded-xl border border-border bg-surface p-5 lg:sticky lg:top-24">
          <h2 className="font-display text-xl font-semibold">
            Order Summary
          </h2>

          <div className="mt-5 space-y-3 text-sm">
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">
                Items
              </span>

              <span>{totalItems}</span>
            </div>

            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">
                Subtotal
              </span>

              <span>
                ₹{total.toLocaleString("en-IN")}
              </span>
            </div>

            <div className="border-t border-border pt-4">
              <div className="flex justify-between gap-4 text-base font-bold">
                <span>Total</span>

                <span>
                  ₹{total.toLocaleString("en-IN")}
                </span>
              </div>
            </div>
          </div>

          <Button
            asChild
            size="lg"
            className="mt-6 w-full"
          >
            <Link to="/checkout">
              Proceed to Checkout
            </Link>
          </Button>

          <p className="mt-3 text-center text-xs text-muted-foreground">
            Cash on Delivery available
          </p>
        </aside>
      </div>
    </Container>
  );
}