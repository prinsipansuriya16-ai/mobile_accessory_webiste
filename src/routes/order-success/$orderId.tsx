import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CheckCircle2, Package, MapPin, Phone, User, ShoppingBag } from "lucide-react";

import { Container } from "@/components/layout/Container";
import { Button } from "@/components/ui/button";
import { Price } from "@/components/common/Price";
import { LoadingState, ErrorState } from "@/components/common/States";
import { supabase } from "@/integrations/supabase/client";

type OrderItem = {
  id: string;
  product_name: string;
  quantity: number;
  price: number;
};

type OrderDetail = {
  id: string;
  customer_name: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  total_amount: number;
  payment_method: string;
  payment_status: "PENDING" | "PAID";
  order_status: "PENDING" | "CONFIRMED" | "SHIPPED" | "DELIVERED" | "CANCELLED";
  created_at: string;
  order_items: OrderItem[];
};

export const Route = createFileRoute("/order-success/$orderId")({
  head: () => ({
    meta: [
      { title: "Order Placed — Kisaan Accessories" },
      {
        name: "description",
        content: "Your Cash on Delivery order with Kisaan Accessories has been received.",
      },
      { property: "og:title", content: "Order Placed — Kisaan Accessories" },
      {
        property: "og:description",
        content: "Order confirmation for your Kisaan Accessories purchase.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: OrderSuccessPage,
});

function OrderSuccessPage() {
  const { orderId } = Route.useParams();

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchOrderFromSupabase() {
      setLoading(true);
      setError(null);

      // Directly fetch order details and order_items snapshot from Supabase DB
      const { data, error: fetchError } = await supabase
        .from("orders")
        .select(`
          id,
          customer_name,
          phone,
          address,
          city,
          state,
          pincode,
          total_amount,
          payment_method,
          payment_status,
          order_status,
          created_at,
          order_items (
            id,
            product_name,
            quantity,
            price
          )
        `)
        .eq("id", orderId)
        .maybeSingle();

      if (fetchError) {
        // A direct-by-id lookup can fail here due to RLS (e.g. anon SELECT
        // scoped by phone/customer rather than by id). Treat any fetch
        // error as "can't confirm right now" and point the customer to
        // Track Order, where they can look it up with name + phone instead.
        console.error("Error fetching order from Supabase:", fetchError);
        setError(
          "We couldn't pull up this order's details right now. You can look it up on the Track Order page using your name and phone number."
        );
      } else if (!data) {
        setError(
          "We couldn't find this order. You can look it up on the Track Order page using your name and phone number."
        );
      } else {
        setOrder(data as OrderDetail);
      }

      setLoading(false);
    }

    if (orderId) {
      fetchOrderFromSupabase();
    }
  }, [orderId]);

  return (
    <Container className="section-y max-w-3xl">
      {loading && (
        <div className="py-12">
          <LoadingState />
        </div>
      )}

      {!loading && error && (
        <div className="mx-auto max-w-md text-center">
          <ErrorState title="Order Not Found" description={error} />
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Button asChild>
              <Link to="/track-order">Track My Order</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/">Return to Home</Link>
            </Button>
          </div>
        </div>
      )}

      {!loading && !error && order && (
        <div className="space-y-6">
          {/* Header Confirmation Banner */}
          <div className="rounded-xl border border-border bg-surface p-6 text-center sm:p-8">
            <CheckCircle2 className="mx-auto size-12 text-success" aria-hidden />
            <h1 className="mt-3 font-display text-2xl font-bold sm:text-3xl">
              Order Confirmed!
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Thank you for shopping with Kisaan Accessories. Your order has been recorded in our system.
            </p>
            <div className="mt-4 inline-flex items-center gap-2 rounded-lg bg-muted px-4 py-2 font-mono text-xs sm:text-sm">
              <span>Order ID:</span>
              <span className="font-semibold text-foreground break-all">{order.id}</span>
            </div>
          </div>

          {/* Delivery & Status Cards */}
          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-xl border border-border bg-surface p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <h2 className="font-semibold text-base flex items-center gap-2">
                  <Package className="size-4 text-accent" /> Status
                </h2>
                <span className="rounded-full bg-accent/10 px-3 py-1 text-xs font-semibold text-accent uppercase">
                  {order.order_status}
                </span>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <User className="size-4 shrink-0" />
                  <span className="font-medium text-foreground">{order.customer_name}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="size-4 shrink-0" />
                  <span>{order.phone}</span>
                </div>
                <div className="flex items-start gap-2 text-muted-foreground">
                  <MapPin className="size-4 shrink-0 mt-0.5" />
                  <span>
                    {order.address}, {order.city}, {order.state} - {order.pincode}
                  </span>
                </div>
              </div>
            </div>

            {/* Payment Info */}
            <div className="rounded-xl border border-border bg-surface p-6 space-y-4">
              <h2 className="font-semibold text-base border-b border-border pb-3">
                Payment Breakdown
              </h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Payment Method:</span>
                  <span className="font-medium">{order.payment_method}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Payment Status:</span>
                  <span className="font-medium text-amber-600">{order.payment_status}</span>
                </div>
                <div className="flex justify-between border-t border-border pt-2 font-semibold text-base">
                  <span>Total Amount:</span>
                  <Price sellingPrice={order.total_amount} />
                </div>
              </div>
            </div>
          </div>

          {/* Ordered Items Table Snapshot */}
          <div className="rounded-xl border border-border bg-surface p-6">
            <h2 className="font-semibold text-base mb-4">Ordered Items</h2>
            <div className="divide-y divide-border">
              {order.order_items.map((item) => (
                <div key={item.id} className="py-3 flex items-center justify-between text-sm">
                  <div>
                    <p className="font-medium">{item.product_name}</p>
                    <p className="text-xs text-muted-foreground">Qty: {item.quantity}</p>
                  </div>
                  <Price sellingPrice={item.price * item.quantity} />
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <Button asChild>
              <Link to="/categories">
                <ShoppingBag className="mr-2 size-4" /> Continue Shopping
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/">Back to Home</Link>
            </Button>
          </div>
        </div>
      )}
    </Container>
  );
}