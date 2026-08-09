import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Loader2, ShoppingBag } from "lucide-react";
import { toast } from "sonner";

import { Container } from "@/components/layout/Container";
import { Button } from "@/components/ui/button";
import { useCart } from "@/lib/cart";
import { notifyOwnerOfOrder } from "@/lib/notify-order";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/checkout")({
  head: () => ({
    meta: [
      { title: "Cash on Delivery Checkout — Kisaan Accessories" },
      {
        name: "description",
        content:
          "Enter your delivery details and place a Cash on Delivery order with Kisaan Accessories, Surat.",
      },
      {
        property: "og:title",
        content: "Checkout — Kisaan Accessories",
      },
      {
        property: "og:description",
        content:
          "Place a Cash on Delivery order with Kisaan Accessories, Surat.",
      },
    ],
  }),
  component: CheckoutPage,
});

type FormData = {
  customerName: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
};

const initialFormData: FormData = {
  customerName: "",
  phone: "",
  address: "",
  city: "Surat",
  state: "Gujarat",
  pincode: "",
};

function CheckoutPage() {
  const { items, total, clear } = useCart();
  const navigate = useNavigate();

  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [placingOrder, setPlacingOrder] = useState(false);

  function handleChange(field: keyof FormData, value: string) {
    setFormData((previous) => ({
      ...previous,
      [field]: value,
    }));
  }

  async function handlePlaceOrder(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (items.length === 0) {
      toast.error("Your cart is empty.");
      return;
    }

    const customerName = formData.customerName.trim();
    const phone = formData.phone.trim();
    const address = formData.address.trim();
    const city = formData.city.trim();
    const state = formData.state.trim();
    const pincode = formData.pincode.trim();

    if (!customerName || !phone || !address || !city || !state || !pincode) {
      toast.error("Please fill in all delivery details.");
      return;
    }

    if (!/^[0-9]{10}$/.test(phone)) {
      toast.error("Please enter a valid 10-digit phone number.");
      return;
    }

    if (!/^[0-9]{6}$/.test(pincode)) {
      toast.error("Please enter a valid 6-digit pincode.");
      return;
    }

    setPlacingOrder(true);

    try {
      const orderItems = items.map((item) => ({
        product_id: item.productId,
        quantity: item.quantity,
      }));

      // Directly create order via Supabase RPC (Stored Procedure)
      const { data, error } = await supabase.rpc("place_cod_order", {
        p_customer_name: customerName,
        p_phone: phone,
        p_address: address,
        p_city: city,
        p_state: state,
        p_pincode: pincode,
        p_items: orderItems,
      });

      if (error) {
        console.error("Failed to create order in Supabase:", error);
        toast.error(
          error.message || "Unable to place your order. Please try again."
        );
        return;
      }

      if (!data) {
        toast.error("Order could not be created in database. Please try again.");
        return;
      }

      // Fire the owner notification email. This is best-effort and never
      // awaited — notifyOwnerOfOrder() already swallows its own errors, so
      // a Resend/network hiccup here can never delay navigation or surface
      // as a failure to the customer. The order itself is already saved.
      void notifyOwnerOfOrder({
        id: data,
        customer_name: customerName,
        phone,
        address,
        city,
        state,
        pincode,
        total_amount: total,
        payment_method: "COD",
        order_items: items.map((item) => ({
          product_name: item.name,
          quantity: item.quantity,
          price: item.sellingPrice,
        })),
      });

      // Clear the cart state after successful DB insert
      clear();

      toast.success("Your order has been placed successfully!");

      // Directly navigate to Order Success page using pure DB Order ID
      navigate({
        to: "/order-success/$orderId",
        params: { orderId: data },
      });
    } catch (error) {
      console.error("Unexpected checkout error:", error);
      toast.error("Something went wrong while placing your order.");
    } finally {
      setPlacingOrder(false);
    }
  }

  if (items.length === 0) {
    return (
      <Container className="section-y">
        <div className="mx-auto max-w-2xl">
          <h1 className="font-display text-2xl font-bold sm:text-3xl">
            Checkout
          </h1>

          <div className="mt-8 rounded-2xl border border-border bg-surface p-8 text-center">
            <ShoppingBag className="mx-auto size-10 text-muted-foreground" />

            <h2 className="mt-4 font-display text-xl font-semibold">
              Your cart is empty
            </h2>

            <p className="mt-2 text-sm text-muted-foreground">
              Add some accessories before proceeding to checkout.
            </p>

            <Button asChild className="mt-6">
              <Link to="/categories">Browse Products</Link>
            </Button>
          </div>
        </div>
      </Container>
    );
  }

  return (
    <Container className="section-y">
      <div className="mx-auto max-w-6xl">
        <h1 className="font-display text-2xl font-bold sm:text-3xl">
          Checkout
        </h1>

        <p className="mt-2 text-sm text-muted-foreground">
          Enter your delivery details to place your Cash on Delivery order.
        </p>

        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_380px]">
          {/* Delivery Details Form */}
          <form
            onSubmit={handlePlaceOrder}
            className="rounded-xl border border-border bg-surface p-5 sm:p-6"
          >
            <h2 className="font-display text-xl font-semibold">
              Delivery Details
            </h2>

            <div className="mt-6 space-y-5">
              <div>
                <label htmlFor="customerName" className="text-sm font-medium">
                  Full Name
                </label>

                <input
                  id="customerName"
                  type="text"
                  value={formData.customerName}
                  onChange={(event) =>
                    handleChange("customerName", event.target.value)
                  }
                  placeholder="Enter your full name"
                  autoComplete="name"
                  required
                  disabled={placingOrder}
                  className="mt-2 h-11 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20 disabled:cursor-not-allowed disabled:opacity-60"
                />
              </div>

              <div>
                <label htmlFor="phone" className="text-sm font-medium">
                  Phone Number
                </label>

                <input
                  id="phone"
                  type="tel"
                  inputMode="numeric"
                  maxLength={10}
                  value={formData.phone}
                  onChange={(event) =>
                    handleChange(
                      "phone",
                      event.target.value.replace(/\D/g, "")
                    )
                  }
                  placeholder="10-digit mobile number"
                  autoComplete="tel"
                  required
                  disabled={placingOrder}
                  className="mt-2 h-11 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20 disabled:cursor-not-allowed disabled:opacity-60"
                />
              </div>

              <div>
                <label htmlFor="address" className="text-sm font-medium">
                  Delivery Address
                </label>

                <textarea
                  id="address"
                  value={formData.address}
                  onChange={(event) =>
                    handleChange("address", event.target.value)
                  }
                  placeholder="House / Flat / Building, Street, Area"
                  autoComplete="street-address"
                  required
                  disabled={placingOrder}
                  rows={4}
                  className="mt-2 w-full resize-none rounded-lg border border-border bg-background px-3 py-3 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20 disabled:cursor-not-allowed disabled:opacity-60"
                />
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label htmlFor="city" className="text-sm font-medium">
                    City
                  </label>

                  <input
                    id="city"
                    type="text"
                    value={formData.city}
                    onChange={(event) =>
                      handleChange("city", event.target.value)
                    }
                    placeholder="City"
                    autoComplete="address-level2"
                    required
                    disabled={placingOrder}
                    className="mt-2 h-11 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20 disabled:cursor-not-allowed disabled:opacity-60"
                  />
                </div>

                <div>
                  <label htmlFor="state" className="text-sm font-medium">
                    State
                  </label>

                  <input
                    id="state"
                    type="text"
                    value={formData.state}
                    onChange={(event) =>
                      handleChange("state", event.target.value)
                    }
                    placeholder="State"
                    autoComplete="address-level1"
                    required
                    disabled={placingOrder}
                    className="mt-2 h-11 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20 disabled:cursor-not-allowed disabled:opacity-60"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="pincode" className="text-sm font-medium">
                  Pincode
                </label>

                <input
                  id="pincode"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={formData.pincode}
                  onChange={(event) =>
                    handleChange(
                      "pincode",
                      event.target.value.replace(/\D/g, "")
                    )
                  }
                  placeholder="6-digit pincode"
                  autoComplete="postal-code"
                  required
                  disabled={placingOrder}
                  className="mt-2 h-11 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20 disabled:cursor-not-allowed disabled:opacity-60"
                />
              </div>
            </div>

            <div className="mt-6 rounded-xl border border-border bg-background p-4">
              <p className="font-semibold">Cash on Delivery</p>

              <p className="mt-1 text-sm text-muted-foreground">
                Pay in cash when your order is delivered.
              </p>
            </div>

            <Button
              type="submit"
              size="lg"
              disabled={placingOrder}
              className="mt-6 w-full"
            >
              {placingOrder ? (
                <>
                  <Loader2 className="mr-2 size-5 animate-spin" />
                  Placing Order...
                </>
              ) : (
                "Place COD Order"
              )}
            </Button>

            <Button
              asChild
              type="button"
              variant="outline"
              disabled={placingOrder}
              className="mt-3 w-full"
            >
              <Link to="/cart">Back to Cart</Link>
            </Button>
          </form>

          {/* Order Summary Side Sidebar */}
          <aside className="h-fit rounded-xl border border-border bg-surface p-5 lg:sticky lg:top-24">
            <h2 className="font-display text-xl font-semibold">Order Summary</h2>

            <div className="mt-5 space-y-4">
              {items.map((item) => {
                const itemTotal = item.sellingPrice * item.quantity;

                const discount =
                  item.originalPrice > item.sellingPrice
                    ? Math.round(
                        ((item.originalPrice - item.sellingPrice) /
                          item.originalPrice) *
                          100
                      )
                    : 0;

                return (
                  <div
                    key={item.productId}
                    className="flex gap-3 border-b border-border pb-4"
                  >
                    <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-background">
                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          className="h-full w-full object-contain p-1"
                        />
                      ) : (
                        <span className="text-[10px] text-muted-foreground">
                          No image
                        </span>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">
                        {item.name}
                      </p>

                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <span className="text-sm font-bold">
                          ₹{item.sellingPrice.toLocaleString("en-IN")}
                        </span>

                        {item.originalPrice > item.sellingPrice && (
                          <span className="text-xs text-muted-foreground line-through">
                            ₹{item.originalPrice.toLocaleString("en-IN")}
                          </span>
                        )}

                        {discount > 0 && (
                          <span className="text-xs font-semibold text-accent">
                            {discount}% OFF
                          </span>
                        )}
                      </div>

                      <p className="mt-1 text-xs text-muted-foreground">
                        Qty: {item.quantity}
                      </p>
                    </div>

                    <p className="shrink-0 text-sm font-bold">
                      ₹{itemTotal.toLocaleString("en-IN")}
                    </p>
                  </div>
                );
              })}
            </div>

            <div className="mt-5 space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Items</span>
                <span>
                  {items.reduce((sum, item) => sum + item.quantity, 0)}
                </span>
              </div>

              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Subtotal</span>
                <span>₹{total.toLocaleString("en-IN")}</span>
              </div>

              <div className="border-t border-border pt-4">
                <div className="flex justify-between gap-4 text-base font-bold">
                  <span>Total</span>
                  <span>₹{total.toLocaleString("en-IN")}</span>
                </div>
              </div>
            </div>

            <div className="mt-5 rounded-lg bg-background p-3 text-center text-xs text-muted-foreground">
              No online payment required.
              <br />
              Pay when your order is delivered.
            </div>
          </aside>
        </div>
      </div>
    </Container>
  );
}