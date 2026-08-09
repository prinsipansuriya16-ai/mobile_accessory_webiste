import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Search, Package, Phone, User, Calendar, MapPin, XCircle, Loader2, RotateCcw } from "lucide-react";
import { toast } from "sonner";

import { Container } from "@/components/layout/Container";
import { Button } from "@/components/ui/button";
import { Price } from "@/components/common/Price";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/track-order")({
  head: () => ({
    meta: [
      { title: "Track Your Order — Kisaan Accessories" },
      {
        name: "description",
        content: "Track your Cash on Delivery orders using your name and phone number.",
      },
    ],
  }),
  component: TrackOrderPage,
});

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

function TrackOrderPage() {
  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [orders, setOrders] = useState<OrderDetail[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  // Only true once a search has completed AND actually returned results.
  // This is what drives hiding the form — a failed/empty search keeps the
  // form visible (with the existing empty-state message) exactly as before.
  const showResultsOnly = hasSearched && orders.length > 0;

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();

    const cleanPhone = phone.trim();
    const cleanName = customerName.trim().toLowerCase();

    if (!cleanPhone || cleanPhone.length !== 10) {
      toast.error("Please enter a valid 10-digit phone number.");
      return;
    }

    setLoading(true);
    setHasSearched(true);

    try {
      // Query orders matching phone number directly from Supabase
      const { data, error } = await supabase
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
        .eq("phone", cleanPhone)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Supabase track order error:", error);
        toast.error("Failed to fetch orders. Please try again.");
        setOrders([]);
      } else if (data) {
        // Filter by customer name if provided (case-insensitive)
        const matched = cleanName
          ? data.filter((ord) =>
              ord.customer_name?.toLowerCase().includes(cleanName)
            )
          : data;

        setOrders(matched as OrderDetail[]);
      }
    } catch (err) {
      console.error("Unexpected search error:", err);
      toast.error("Something went wrong while tracking your order.");
    } finally {
      setLoading(false);
    }
  }

  async function handleCancelOrder(orderId: string) {
    const confirmCancel = window.confirm(
      "Are you sure you want to cancel this order?"
    );
    if (!confirmCancel) return;

    setCancellingId(orderId);

    try {
      const { error } = await supabase
        .from("orders")
        .update({ order_status: "CANCELLED" })
        .eq("id", orderId)
        .eq("order_status", "PENDING"); // Security check: cancel only if still PENDING

      if (error) {
        toast.error("Could not cancel order. " + error.message);
      } else {
        toast.success("Order cancelled successfully.");
        // Update local state to reflect instantly
        setOrders((prev) =>
          prev.map((o) =>
            o.id === orderId ? { ...o, order_status: "CANCELLED" } : o
          )
        );
      }
    } catch (err) {
      console.error("Cancel error:", err);
      toast.error("Error cancelling order.");
    } finally {
      setCancellingId(null);
    }
  }

  function handleReset() {
    setOrders([]);
    setHasSearched(false);
    setCustomerName("");
    setPhone("");
  }

  return (
    <Container className="section-y max-w-3xl">
      <div className="text-center">
        <h1 className="font-display text-3xl font-bold">Track Your Order</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {showResultsOnly
            ? "Here's what we found for your phone number."
            : "Enter the name and phone number used at checkout to see your orders."}
        </p>
      </div>

      {/* Search Another Order — only shown once results are displayed */}
      {showResultsOnly && (
        <div className="mt-6 flex justify-end">
          <Button variant="outline" size="sm" onClick={handleReset}>
            <RotateCcw className="mr-1.5 size-3.5" /> Search Another Order
          </Button>
        </div>
      )}

      {/* Search Form — hidden once a successful search has results */}
      {!showResultsOnly && (
        <form
          onSubmit={handleSearch}
          className="mt-8 rounded-2xl border border-border bg-surface p-6 space-y-4"
        >
          <div>
            <label className="text-sm font-medium">Full Name</label>
            <div className="relative mt-1.5">
              <User className="absolute left-3.5 top-3 size-4 text-muted-foreground" />
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="e.g. Darshil Sojitra"
                className="h-11 w-full rounded-lg border border-border bg-background pl-10 pr-3 text-sm outline-none transition focus:border-accent"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">10-digit Phone Number</label>
            <div className="relative mt-1.5">
              <Phone className="absolute left-3.5 top-3 size-4 text-muted-foreground" />
              <input
                type="tel"
                maxLength={10}
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                placeholder="e.g. 9638330214"
                required
                className="h-11 w-full rounded-lg border border-border bg-background pl-10 pr-3 text-sm outline-none transition focus:border-accent"
              />
            </div>
          </div>

          <Button type="submit" size="lg" disabled={loading} className="w-full mt-2">
            {loading ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" /> Searching...
              </>
            ) : (
              <>
                <Search className="mr-2 size-4" /> Find My Orders
              </>
            )}
          </Button>
        </form>
      )}

      {/* Results Section */}
      {hasSearched && (
        <div className="mt-8 space-y-6">
          {orders.length === 0 ? (
            <div className="rounded-2xl border border-border bg-surface p-12 text-center">
              <Package className="mx-auto size-10 text-muted-foreground" />
              <p className="mt-4 text-sm font-medium text-foreground">
                No orders found matching that phone number and name.
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Double-check your 10-digit phone number and try again.
              </p>
            </div>
          ) : (
            orders.map((order) => (
              <div
                key={order.id}
                className="rounded-xl border border-border bg-surface p-6 space-y-4"
              >
                {/* Header */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-4">
                  <div>
                    <span className="text-xs text-muted-foreground font-mono">
                      ID: {order.id}
                    </span>
                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                      <Calendar className="size-3.5" />
                      {new Date(order.created_at).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold uppercase ${
                        order.order_status === "CANCELLED"
                          ? "bg-destructive/10 text-destructive"
                          : order.order_status === "DELIVERED"
                          ? "bg-success/10 text-success"
                          : "bg-accent/10 text-accent"
                      }`}
                    >
                      {order.order_status}
                    </span>
                  </div>
                </div>

                {/* Details */}
                <div className="grid gap-4 sm:grid-cols-2 text-sm">
                  <div>
                    <p className="font-semibold text-foreground">
                      {order.customer_name}
                    </p>
                    <p className="text-muted-foreground mt-0.5">{order.phone}</p>
                    <p className="text-muted-foreground flex items-start gap-1 mt-1 text-xs">
                      <MapPin className="size-3.5 shrink-0 mt-0.5" />
                      <span>
                        {order.address}, {order.city}, {order.state} - {order.pincode}
                      </span>
                    </p>
                  </div>

                  <div className="space-y-1 sm:text-right">
                    <p className="text-xs text-muted-foreground">
                      Payment: <span className="font-medium text-foreground">{order.payment_method}</span> ({order.payment_status})
                    </p>
                    <p className="text-lg font-bold">
                      Total: ₹{order.total_amount.toLocaleString("en-IN")}
                    </p>
                  </div>
                </div>

                {/* Items snapshot */}
                <div className="rounded-lg bg-background p-4 divide-y divide-border text-xs">
                  {order.order_items?.map((item) => (
                    <div
                      key={item.id}
                      className="py-1.5 flex justify-between items-center"
                    >
                      <span>
                        {item.product_name} x {item.quantity}
                      </span>
                      <Price sellingPrice={item.price * item.quantity} />
                    </div>
                  ))}
                </div>

                {/* Cancel Button Footer */}
                {order.order_status === "PENDING" && (
                  <div className="pt-2 flex justify-end">
                    <Button
                      variant="destructive"
                      size="sm"
                      disabled={cancellingId === order.id}
                      onClick={() => handleCancelOrder(order.id)}
                    >
                      {cancellingId === order.id ? (
                        <>
                          <Loader2 className="mr-1.5 size-3.5 animate-spin" /> Cancelling...
                        </>
                      ) : (
                        <>
                          <XCircle className="mr-1.5 size-3.5" /> Cancel Order
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </Container>
  );
}