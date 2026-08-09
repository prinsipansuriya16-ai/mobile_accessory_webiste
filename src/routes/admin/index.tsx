import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import {
  LayoutDashboard,
  Package,
  Tags,
  Image as ImageIcon,
  LogOut,
  Loader2,
  Plus,
  Pencil,
  Trash2,
  Search,
  X,
  ChevronDown,
} from "lucide-react";

import { Container } from "@/components/layout/Container";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/")({
  head: () => ({
    meta: [
      { title: "Admin Dashboard — Kisaan Accessories" },
      { name: "description", content: "Manage categories, products, images and COD orders." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Admin Dashboard — Kisaan Accessories" },
      { property: "og:description", content: "Store management dashboard." },
    ],
  }),
  component: AdminDashboardPage,
});

type Tab = "orders" | "products" | "categories" | "images";

/* ------------------------------------------------------------------ */
/*  Auth guard                                                         */
/* ------------------------------------------------------------------ */

function useAdminGuard() {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function verify() {
      const { data } = await supabase.auth.getSession();
      const currentSession = data.session;

      if (!currentSession) {
        if (!cancelled) navigate({ to: "/admin/login" });
        return;
      }

      const { data: adminRow } = await supabase
        .from("admin_users")
        .select("user_id")
        .eq("user_id", currentSession.user.id)
        .maybeSingle();

      if (!adminRow) {
        await supabase.auth.signOut();
        if (!cancelled) navigate({ to: "/admin/login" });
        return;
      }

      if (!cancelled) {
        setSession(currentSession);
        setChecking(false);
      }
    }

    verify();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (!newSession) {
        navigate({ to: "/admin/login" });
      }
    });

    return () => {
      cancelled = true;
      listener.subscription.unsubscribe();
    };
  }, [navigate]);

  return { checking, session };
}

/* ------------------------------------------------------------------ */
/*  Shared types                                                       */
/* ------------------------------------------------------------------ */

type OrderItem = {
  id: string;
  product_name: string;
  quantity: number;
  price: number;
};

type OrderStatus = "PENDING" | "CONFIRMED" | "SHIPPED" | "DELIVERED" | "CANCELLED";

type AdminOrder = {
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
  order_status: OrderStatus;
  created_at: string;
  order_items: OrderItem[];
};

type Category = {
  id: string;
  name: string;
};

type Product = {
  id: string;
  name: string;
  description: string | null;
  category_id: string | null;
  original_price: number;
  selling_price: number;
  stock: number;
  is_active: boolean;
  image_url: string | null;
  badge_tag: string | null;
  categories?: { name: string } | null;
};

type ProductImage = {
  id: string;
  product_id: string;
  image_url: string;
  products?: { name: string } | null;
};

/* ------------------------------------------------------------------ */
/*  Page shell                                                         */
/* ------------------------------------------------------------------ */

const NAV_ITEMS: { id: Tab; label: string; icon: typeof LayoutDashboard }[] = [
  { id: "orders", label: "Orders", icon: LayoutDashboard },
  { id: "products", label: "Products", icon: Package },
  { id: "categories", label: "Categories", icon: Tags },
  { id: "images", label: "Product Images", icon: ImageIcon },
];

function AdminDashboardPage() {
  const { checking } = useAdminGuard();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("orders");

  async function handleLogout() {
    await supabase.auth.signOut();
    navigate({ to: "/admin/login" });
  }

  if (checking) {
    return (
      <Container className="section-y">
        <div className="flex justify-center py-12">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      </Container>
    );
  }

  return (
    <Container className="section-y">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold">Admin Dashboard</h1>
        <Button variant="outline" size="sm" onClick={handleLogout}>
          <LogOut className="mr-2 size-4" /> Log Out
        </Button>
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-[220px_minmax(0,1fr)]">
        <nav className="flex gap-1 overflow-x-auto md:flex-col md:overflow-visible">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = tab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setTab(item.id)}
                className={`flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}
              >
                <Icon className="size-4" />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="min-w-0">
          {tab === "orders" && <OrdersTab />}
          {tab === "products" && <ProductsTab />}
          {tab === "categories" && <CategoriesTab />}
          {tab === "images" && <ImagesTab />}
        </div>
      </div>
    </Container>
  );
}

/* ------------------------------------------------------------------ */
/*  Orders tab                                                         */
/* ------------------------------------------------------------------ */

const ORDER_FILTERS: { label: string; value: OrderStatus | "ALL" }[] = [
  { label: "All", value: "ALL" },
  { label: "Pending", value: "PENDING" },
  { label: "Confirmed", value: "CONFIRMED" },
  { label: "Shipped", value: "SHIPPED" },
  { label: "Delivered", value: "DELIVERED" },
  { label: "Cancelled", value: "CANCELLED" },
];

const NEXT_STATUS: Record<OrderStatus, OrderStatus | null> = {
  PENDING: "CONFIRMED",
  CONFIRMED: "SHIPPED",
  SHIPPED: "DELIVERED",
  DELIVERED: null,
  CANCELLED: null,
};

function OrdersTab() {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<OrderStatus | "ALL">("ALL");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  async function loadOrders() {
    setLoading(true);
    const { data, error } = await supabase
      .from("orders")
      .select(
        `
        id, customer_name, phone, address, city, state, pincode,
        total_amount, payment_method, payment_status, order_status, created_at,
        order_items ( id, product_name, quantity, price )
      `
      )
      .order("created_at", { ascending: false });

    if (!error && data) setOrders(data as AdminOrder[]);
    setLoading(false);
  }

  useEffect(() => {
    loadOrders();
  }, []);

  async function updateStatus(orderId: string, newStatus: OrderStatus) {
    setUpdatingId(orderId);
    const { error } = await supabase
      .from("orders")
      .update({ order_status: newStatus })
      .eq("id", orderId);

    if (!error) {
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, order_status: newStatus } : o))
      );
    }
    setUpdatingId(null);
  }

  const filtered = filter === "ALL" ? orders : orders.filter((o) => o.order_status === filter);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {ORDER_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
              filter === f.value
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          No orders in this filter.
        </p>
      ) : (
        <div className="space-y-3">
          {filtered.map((order) => {
            const expanded = expandedId === order.id;
            const next = NEXT_STATUS[order.order_status];

            return (
              <div key={order.id} className="rounded-xl border border-border bg-surface">
                <button
                  onClick={() => setExpandedId(expanded ? null : order.id)}
                  className="flex w-full flex-wrap items-center justify-between gap-2 p-4 text-left"
                >
                  <div className="min-w-0">
                    <p className="font-mono text-xs text-muted-foreground break-all">
                      {order.id}
                    </p>
                    <p className="mt-0.5 text-sm font-medium">
                      {order.customer_name} · {order.phone}
                    </p>
                  </div>
                  <span className="rounded-full bg-accent/10 px-3 py-1 text-xs font-semibold uppercase text-accent">
                    {order.order_status}
                  </span>
                </button>

                {expanded && (
                  <div className="space-y-4 border-t border-border p-4">
                    <div className="text-sm text-muted-foreground">
                      {order.address}, {order.city}, {order.state} - {order.pincode}
                    </div>

                    <div className="divide-y divide-border rounded-lg border border-border">
                      {order.order_items.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between p-3 text-sm"
                        >
                          <span>
                            {item.product_name} × {item.quantity}
                          </span>
                          <span className="font-medium">
                            ₹{(item.price * item.quantity).toLocaleString("en-IN")}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
                      <span>
                        Payment: <strong>{order.payment_method}</strong> ·{" "}
                        <strong>{order.payment_status}</strong>
                      </span>
                      <span className="font-semibold">
                        Total: ₹{order.total_amount.toLocaleString("en-IN")}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {next && (
                        <Button
                          size="sm"
                          disabled={updatingId === order.id}
                          onClick={() => updateStatus(order.id, next)}
                        >
                          {updatingId === order.id ? (
                            <Loader2 className="mr-2 size-4 animate-spin" />
                          ) : null}
                          Mark as {next}
                        </Button>
                      )}
                      {order.order_status !== "CANCELLED" &&
                        order.order_status !== "DELIVERED" && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-destructive hover:text-destructive"
                            disabled={updatingId === order.id}
                            onClick={() => updateStatus(order.id, "CANCELLED")}
                          >
                            Cancel Order
                          </Button>
                        )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Products tab                                                       */
/* ------------------------------------------------------------------ */

type ProductFormState = {
  id: string | null;
  name: string;
  description: string;
  category_id: string;
  original_price: string;
  selling_price: string;
  stock: string;
  is_active: boolean;
  image_url: string | null;
  badge_tag: string;
};

const EMPTY_PRODUCT_FORM: ProductFormState = {
  id: null,
  name: "",
  description: "",
  category_id: "",
  original_price: "",
  selling_price: "",
  stock: "",
  is_active: true,
  image_url: null,
  badge_tag: "",
};

const HERO_IMAGE_BUCKET = "product-images";

function ProductsTab() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<ProductFormState>(EMPTY_PRODUCT_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Hero image file staged for upload — uploaded to storage only on Save,
  // so cancelling the modal never leaves an orphaned file behind.
  const [heroFile, setHeroFile] = useState<File | null>(null);
  const [heroPreview, setHeroPreview] = useState<string | null>(null);
  const heroInputRef = useRef<HTMLInputElement | null>(null);

  async function loadData() {
    setLoading(true);
    const [{ data: productData }, { data: categoryData }] = await Promise.all([
      // Cast to `any`: the generated Supabase types for `products` are
      // stale and don't know about `image_url` yet, which makes this
      // query resolve to a `SelectQueryError` type instead of a row type.
      // Regenerate with `supabase gen types typescript` to remove this.
      supabase
        .from("products")
        .select(
          "id, name, description, category_id, original_price, selling_price, stock, is_active, image_url, badge_tag, categories ( name )"
        )
        .order("name", { ascending: true }) as any,
      supabase.from("categories").select("id, name").order("name", { ascending: true }),
    ]);

    if (productData) setProducts(productData as unknown as Product[]);
    if (categoryData) setCategories(categoryData as Category[]);
    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  const filteredProducts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return products;
    return products.filter(
      (product) =>
        product.name.toLowerCase().includes(query) ||
        (product.categories?.name ?? "").toLowerCase().includes(query)
    );
  }, [products, searchQuery]);

  function openAddModal() {
    setForm(EMPTY_PRODUCT_FORM);
    setHeroFile(null);
    setHeroPreview(null);
    if (heroInputRef.current) heroInputRef.current.value = "";
    setFormError(null);
    setModalOpen(true);
  }

  function openEditModal(product: Product) {
    setForm({
      id: product.id,
      name: product.name,
      description: product.description ?? "",
      category_id: product.category_id ?? "",
      original_price: String(product.original_price),
      selling_price: String(product.selling_price),
      stock: String(product.stock),
      is_active: product.is_active,
      image_url: product.image_url,
      badge_tag: product.badge_tag ?? "",
    });
    setHeroFile(null);
    setHeroPreview(null);
    if (heroInputRef.current) heroInputRef.current.value = "";
    setFormError(null);
    setModalOpen(true);
  }

  function handleHeroFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setHeroFile(file);
    setHeroPreview(file ? URL.createObjectURL(file) : null);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    if (!form.name.trim()) {
      setFormError("Product name is required.");
      return;
    }
    if (!form.category_id) {
      setFormError("Please select a category.");
      return;
    }

    setSaving(true);

    // If a new hero image was staged, upload it to Storage first and use
    // its public URL. Otherwise keep whatever image_url the form already
    // has (unchanged on edit, null on a brand-new product).
    let imageUrl = form.image_url;

    if (heroFile) {
      const fileExt = heroFile.name.split(".").pop();
      const filePath = `hero/${crypto.randomUUID()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from(HERO_IMAGE_BUCKET)
        .upload(filePath, heroFile, { cacheControl: "3600", upsert: false });

      if (uploadError) {
        setSaving(false);
        setFormError("Hero image upload failed. Please try again.");
        return;
      }

      const { data: publicUrlData } = supabase.storage
        .from(HERO_IMAGE_BUCKET)
        .getPublicUrl(filePath);

      imageUrl = publicUrlData.publicUrl;
    }

    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      category_id: form.category_id,
      original_price: Number(form.original_price) || 0,
      selling_price: Number(form.selling_price) || 0,
      stock: Number(form.stock) || 0,
      is_active: form.is_active,
      image_url: imageUrl,
      badge_tag: form.badge_tag.trim() || null,
    };

    // NOTE: cast to `any` here because the generated Supabase types for
    // `products` don't line up with this payload shape (likely a stale
    // types file — regenerate with `supabase gen types typescript` against
    // the live schema so this stops being silently unchecked).
    const { error } = form.id
      ? await supabase.from("products").update(payload as any).eq("id", form.id)
      : await supabase.from("products").insert(payload as any);

    setSaving(false);

    if (error) {
      setFormError("Could not save product. Please try again.");
      return;
    }

    setModalOpen(false);
    loadData();
  }

  async function handleDelete(productId: string) {
    if (!window.confirm("Delete this product? This cannot be undone.")) return;
    const { error } = await supabase.from("products").delete().eq("id", productId);
    if (!error) setProducts((prev) => prev.filter((p) => p.id !== productId));
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name or category..."
            className="pl-9"
          />
        </div>
        <Button size="sm" onClick={openAddModal}>
          <Plus className="mr-2 size-4" /> Add Product
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-surface">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase text-muted-foreground">
                <th className="p-3">Image</th>
                <th className="p-3">Name</th>
                <th className="p-3">Category</th>
                <th className="p-3">Stock</th>
                <th className="p-3">Original Price</th>
                <th className="p-3">Selling Price</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredProducts.map((product) => (
                <tr key={product.id}>
                  <td className="p-3">
                    <div className="flex size-10 items-center justify-center overflow-hidden rounded-md border border-border bg-background">
                      {product.image_url ? (
                        <img
                          src={product.image_url}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <ImageIcon className="size-4 text-muted-foreground" />
                      )}
                    </div>
                  </td>
                  <td className="p-3 font-medium">{product.name}</td>
                  <td className="p-3 text-muted-foreground">
                    {product.categories?.name ?? "—"}
                  </td>
                  <td className="p-3">{product.stock}</td>
                  <td className="p-3">₹{product.original_price.toLocaleString("en-IN")}</td>
                  <td className="p-3">₹{product.selling_price.toLocaleString("en-IN")}</td>
                  <td className="p-3">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                        product.is_active
                          ? "bg-success/10 text-success"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {product.is_active ? "ACTIVE" : "INACTIVE"}
                    </span>
                  </td>
                  <td className="p-3">
                    <div className="flex justify-end gap-2">
                      <Button size="icon" variant="outline" onClick={() => openEditModal(product)}>
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="outline"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleDelete(product.id)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredProducts.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-6 text-center text-muted-foreground">
                    {products.length === 0
                      ? "No products yet."
                      : "No products match your search."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {modalOpen && (
        <Modal title={form.id ? "Edit Product" : "Add Product"} onClose={() => setModalOpen(false)}>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="p-name">Name</Label>
              <Input
                id="p-name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="p-desc">Description</Label>
              <textarea
                id="p-desc"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                rows={3}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="p-hero-image">Hero Image</Label>
              <div className="flex items-center gap-3">
                <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-background">
                  {heroPreview || form.image_url ? (
                    <img
                      src={heroPreview ?? form.image_url ?? undefined}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <ImageIcon className="size-5 text-muted-foreground" />
                  )}
                </div>
                <input
                  ref={heroInputRef}
                  id="p-hero-image"
                  type="file"
                  accept="image/*"
                  onChange={handleHeroFileChange}
                  className="max-w-xs text-sm text-muted-foreground file:mr-3 file:rounded-md file:border-0 file:bg-secondary file:px-3 file:py-2 file:text-sm file:font-medium file:text-foreground hover:file:bg-secondary/80"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Shown as the main product image on the storefront and as the
                first photo in the gallery.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="p-category">Category</Label>
              <select
                id="p-category"
                value={form.category_id}
                onChange={(e) => setForm((f) => ({ ...f, category_id: e.target.value }))}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">Select a category</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="p-badge">Badge Tag (optional)</Label>
              <Input
                id="p-badge"
                value={form.badge_tag}
                onChange={(e) => setForm((f) => ({ ...f, badge_tag: e.target.value }))}
                placeholder='e.g. "Best Seller", "Bumper Sale 50% OFF", "Hot Deal"'
              />
              <p className="text-xs text-muted-foreground">
                Shown as a highlighted badge on the product card in Featured
                Offers on the homepage. Leave blank to hide it.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="p-original">Original Price</Label>
                <Input
                  id="p-original"
                  type="number"
                  min="0"
                  value={form.original_price}
                  onChange={(e) => setForm((f) => ({ ...f, original_price: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="p-selling">Selling Price</Label>
                <Input
                  id="p-selling"
                  type="number"
                  min="0"
                  value={form.selling_price}
                  onChange={(e) => setForm((f) => ({ ...f, selling_price: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="p-stock">Stock</Label>
                <Input
                  id="p-stock"
                  type="number"
                  min="0"
                  value={form.stock}
                  onChange={(e) => setForm((f) => ({ ...f, stock: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="p-active">Status</Label>
                <label
                  htmlFor="p-active"
                  className="flex h-10 items-center gap-2 rounded-md border border-input bg-background px-3 text-sm"
                >
                  <input
                    id="p-active"
                    type="checkbox"
                    checked={form.is_active}
                    onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
                    className="size-4"
                  />
                  {form.is_active ? "Active" : "Inactive"}
                </label>
              </div>
            </div>

            {formError && <p className="text-sm text-destructive">{formError}</p>}

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
                {saving ? "Saving..." : "Save Product"}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Categories tab                                                     */
/* ------------------------------------------------------------------ */

function CategoriesTab() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadCategories() {
    setLoading(true);
    const { data } = await supabase.from("categories").select("id, name").order("name");
    if (data) setCategories(data as Category[]);
    setLoading(false);
  }

  useEffect(() => {
    loadCategories();
  }, []);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const trimmed = newName.trim();
    if (!trimmed) {
      setError("Category name is required.");
      return;
    }

    setAdding(true);
    const { error: insertError } = await supabase.from("categories").insert({ name: trimmed });
    setAdding(false);

    if (insertError) {
      setError("Could not add category. It may already exist.");
      return;
    }

    setNewName("");
    loadCategories();
  }

  async function handleDelete(categoryId: string) {
    if (!window.confirm("Delete this category? Products using it will need to be reassigned."))
      return;
    const { error: deleteError } = await supabase
      .from("categories")
      .delete()
      .eq("id", categoryId);
    if (!deleteError) setCategories((prev) => prev.filter((c) => c.id !== categoryId));
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleAdd} className="flex flex-wrap gap-2">
        <Input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="New category name"
          className="max-w-xs"
        />
        <Button type="submit" disabled={adding}>
          {adding ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Plus className="mr-2 size-4" />}
          Add Category
        </Button>
      </form>
      {error && <p className="text-sm text-destructive">{error}</p>}

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="divide-y divide-border rounded-xl border border-border bg-surface">
          {categories.map((category) => (
            <div key={category.id} className="flex items-center justify-between p-3 text-sm">
              <span className="font-medium">{category.name}</span>
              <Button
                size="icon"
                variant="outline"
                className="text-destructive hover:text-destructive"
                onClick={() => handleDelete(category.id)}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          ))}
          {categories.length === 0 && (
            <p className="p-6 text-center text-muted-foreground">No categories yet.</p>
          )}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Product images tab                                                 */
/* ------------------------------------------------------------------ */

const PRODUCT_IMAGES_BUCKET = "product-images";

function ImagesTab() {
  const [products, setProducts] = useState<
    { id: string; name: string; image_url: string | null }[]
  >([]);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [images, setImages] = useState<ProductImage[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Searchable product selector state
  const [productSearchQuery, setProductSearchQuery] = useState("");
  const [productDropdownOpen, setProductDropdownOpen] = useState(false);
  const productDropdownRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        productDropdownRef.current &&
        !productDropdownRef.current.contains(e.target as Node)
      ) {
        setProductDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    async function loadProducts() {
      // Cast to `any`: the generated Supabase types for `products` are
      // stale and don't know about `image_url` yet, which makes this
      // query resolve to a `SelectQueryError` type instead of a row type.
      // Regenerate with `supabase gen types typescript` to remove this.
      const { data } = (await supabase
        .from("products")
        .select("id, name, image_url")
        .order("name")) as any;
      if (data)
        setProducts(data as { id: string; name: string; image_url: string | null }[]);
      setLoading(false);
    }
    loadProducts();
  }, []);

  const selectedProduct = products.find((p) => p.id === selectedProductId) ?? null;

  const filteredDropdownProducts = useMemo(() => {
    const query = productSearchQuery.trim().toLowerCase();
    if (!query) return products;
    return products.filter((p) => p.name.toLowerCase().includes(query));
  }, [products, productSearchQuery]);

  async function loadImages(productId: string) {
    const { data } = await supabase
      .from("product_images")
      .select("id, product_id, image_url, products ( name )")
      .eq("product_id", productId)
      .order("id");
    if (data) setImages(data as unknown as ProductImage[]);
  }

  useEffect(() => {
    if (selectedProductId) loadImages(selectedProductId);
    else setImages([]);
  }, [selectedProductId]);

  async function handleUploadImage(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!selectedProductId) {
      setError("Select a product first.");
      return;
    }
    if (!selectedFile) {
      setError("Choose an image file first.");
      return;
    }

    setUploading(true);

    // Uses the current authenticated admin session automatically — the
    // shared `supabase` client carries the logged-in user's session on
    // every request, so this upload (and the RLS check behind it) runs
    // as that admin, not as an anonymous visitor.
    const fileExt = selectedFile.name.split(".").pop();
    const filePath = `${selectedProductId}/${crypto.randomUUID()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from(PRODUCT_IMAGES_BUCKET)
      .upload(filePath, selectedFile, {
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      setUploading(false);
      setError("Upload failed. Please try again.");
      return;
    }

    const { data: publicUrlData } = supabase.storage
      .from(PRODUCT_IMAGES_BUCKET)
      .getPublicUrl(filePath);

    const { error: insertError } = await supabase
      .from("product_images")
      .insert({ product_id: selectedProductId, image_url: publicUrlData.publicUrl });

    setUploading(false);

    if (insertError) {
      setError("Image uploaded but could not be linked. Please try again.");
      return;
    }

    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    loadImages(selectedProductId);
  }

  async function handleDeleteImage(image: ProductImage) {
    const { error: deleteError } = await supabase
      .from("product_images")
      .delete()
      .eq("id", image.id);

    if (deleteError) return;

    setImages((prev) => prev.filter((img) => img.id !== image.id));

    // Best-effort cleanup of the underlying file. If the URL doesn't map
    // to a path in this bucket (e.g. an older externally-hosted URL),
    // this is a harmless no-op.
    const marker = `/${PRODUCT_IMAGES_BUCKET}/`;
    const markerIndex = image.image_url.indexOf(marker);
    if (markerIndex !== -1) {
      const storagePath = image.image_url.slice(markerIndex + marker.length);
      await supabase.storage.from(PRODUCT_IMAGES_BUCKET).remove([storagePath]);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="img-product-search">Select Product</Label>
        <div ref={productDropdownRef} className="relative w-full max-w-sm">
          <button
            type="button"
            onClick={() => setProductDropdownOpen((open) => !open)}
            className="flex w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-left text-sm"
          >
            <span className={selectedProduct ? "text-foreground" : "text-muted-foreground"}>
              {selectedProduct ? selectedProduct.name : "Choose a product"}
            </span>
            <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
          </button>

          {productDropdownOpen && (
            <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-md border border-border bg-surface shadow-lg">
              <div className="relative border-b border-border p-2">
                <Search className="pointer-events-none absolute left-4 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <input
                  id="img-product-search"
                  autoFocus
                  value={productSearchQuery}
                  onChange={(e) => setProductSearchQuery(e.target.value)}
                  placeholder="Search products by name..."
                  className="w-full rounded-md border border-input bg-background py-1.5 pl-8 pr-2 text-sm outline-none focus:border-accent"
                />
              </div>

              <div className="max-h-56 overflow-y-auto py-1">
                {filteredDropdownProducts.length === 0 ? (
                  <p className="px-3 py-2 text-sm text-muted-foreground">
                    No products match "{productSearchQuery}".
                  </p>
                ) : (
                  filteredDropdownProducts.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        setSelectedProductId(p.id);
                        setProductDropdownOpen(false);
                        setProductSearchQuery("");
                      }}
                      className={`flex w-full items-center px-3 py-2 text-left text-sm hover:bg-secondary ${
                        p.id === selectedProductId ? "bg-secondary font-medium text-foreground" : "text-foreground"
                      }`}
                    >
                      {p.name}
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {selectedProductId && (
        <>
          <form onSubmit={handleUploadImage} className="flex flex-wrap items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
              className="max-w-xs text-sm text-muted-foreground file:mr-3 file:rounded-md file:border-0 file:bg-secondary file:px-3 file:py-2 file:text-sm file:font-medium file:text-foreground hover:file:bg-secondary/80"
            />
            <Button type="submit" disabled={uploading || !selectedFile}>
              {uploading ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <Plus className="mr-2 size-4" />
              )}
              {uploading ? "Uploading..." : "Upload Image"}
            </Button>
          </form>
          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
            {selectedProduct?.image_url && (
              <div className="group relative overflow-hidden rounded-lg border-2 border-accent">
                <img
                  src={selectedProduct.image_url}
                  alt="Hero"
                  className="aspect-square w-full object-cover"
                />
                <span className="absolute left-1.5 top-1.5 rounded-full bg-accent px-2 py-0.5 text-[10px] font-semibold uppercase text-white">
                  Hero
                </span>
              </div>
            )}

            {images.map((image) => (
              <div key={image.id} className="group relative overflow-hidden rounded-lg border border-border">
                <img
                  src={image.image_url}
                  alt="Product"
                  className="aspect-square w-full object-cover"
                />
                <button
                  onClick={() => handleDeleteImage(image)}
                  className="absolute right-1.5 top-1.5 rounded-full bg-destructive/90 p-1.5 text-destructive-foreground opacity-0 transition-opacity group-hover:opacity-100"
                  aria-label="Delete image"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            ))}
            {images.length === 0 && !selectedProduct?.image_url && (
              <p className="col-span-full py-6 text-center text-sm text-muted-foreground">
                No images linked to this product yet.
              </p>
            )}
          </div>

          <p className="text-xs text-muted-foreground">
            The hero image is managed from the Products tab. Additional
            gallery images uploaded here appear alongside it on the product
            page.
          </p>
        </>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Lightweight modal (no external dialog dependency assumed)          */
/* ------------------------------------------------------------------ */

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-border bg-surface p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold">{title}</h2>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}