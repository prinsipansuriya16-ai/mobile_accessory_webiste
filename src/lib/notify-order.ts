import { supabase } from "@/integrations/supabase/client";

type OrderItemForNotification = {
  product_name: string;
  quantity: number;
  price: number;
};

type OrderForNotification = {
  id: string;
  customer_name: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  total_amount: number;
  payment_method: string;
  order_items: OrderItemForNotification[];
};

/**
 * Fires the "new order" email to the shop owner via the
 * `send-order-notification` Edge Function. This is best-effort: it never
 * throws and never blocks or fails the checkout flow. The customer's order
 * is already saved in the database by the time this runs — a notification
 * hiccup should never look like a failed order to them.
 */
export async function notifyOwnerOfOrder(order: OrderForNotification) {
  try {
    const { error } = await supabase.functions.invoke("send-order-notification", {
      body: {
        orderId: order.id,
        customerName: order.customer_name,
        phone: order.phone,
        address: order.address,
        city: order.city,
        state: order.state,
        pincode: order.pincode,
        totalAmount: order.total_amount,
        paymentMethod: order.payment_method,
        items: order.order_items.map((item) => ({
          product_name: item.product_name,
          quantity: item.quantity,
          price: item.price,
        })),
      },
    });

    if (error) {
      console.error("Order notification failed:", error);
    }
  } catch (err) {
    console.error("Order notification failed:", err);
  }
}
