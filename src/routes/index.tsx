import { createFileRoute, Link } from "@tanstack/react-router";
import { Flame, MapPin, PackageCheck, ShieldCheck, Tag, Truck } from "lucide-react";
import { useEffect, useState } from "react";

import { Container } from "@/components/layout/Container";
import { EmptyState, ErrorState, LoadingState } from "@/components/common/States";
import { Button } from "@/components/ui/button";
import { Price } from "@/components/common/Price";
import { supabase } from "@/integrations/supabase/client";


export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Kisaan Accessories — Mobile & Computer Accessories in Surat" },
      {
        name: "description",
        content:
          "Shop mobile and computer accessories from Kisaan Accessories, 204 AR Mall Surat. Browse by category and order with Cash on Delivery.",
      },
      {
        property: "og:title",
        content: "Kisaan Accessories — Accessories Store in Surat",
      },
      {
        property: "og:description",
        content:
          "Mobile cables, cases, keyboards, mice, printers and more. Cash on Delivery available.",
      },
    ],
  }),
  component: HomePage,
});

const trustPoints = [
  {
    icon: PackageCheck,
    title: "Wide Range",
    text: "Mobile and computer accessories in one place.",
  },
  {
    icon: Truck,
    title: "Cash on Delivery",
    text: "Pay when your order reaches you.",
  },
  {
    icon: ShieldCheck,
    title: "Easy Ordering",
    text: "Simple browsing and a short checkout.",
  },
];

// Hero gallery imagery — curated Unsplash shots of modern tech & mobile
// accessories (headphones, minimalist desk setup, charging cables).
const heroImages = [
  {
    src: "https://images.unsplash.com/photo-1546435770-a3e426bf472b?auto=format&fit=crop&w=900&q=80",
    alt: "Sleek wireless headphones on a clean surface",
    className: "col-span-2 row-span-2",
  },
  {
    src: "https://images.unsplash.com/photo-1547082299-de196ea013d6?auto=format&fit=crop&w=600&q=80",
    alt: "Minimalist desk setup with laptop and accessories",
    className: "col-span-1 row-span-1",
  },
  {
    src: "https://images.unsplash.com/photo-1583863788434-e58a36330cf0?auto=format&fit=crop&w=600&q=80",
    alt: "Braided charging cables neatly coiled",
    className: "col-span-1 row-span-1",
  },
];

type FeaturedProduct = {
  id: string;
  name: string;
  description: string | null;
  selling_price: number;
  original_price: number | null;
  stock: number;
  image_url: string | null;
  badge_tag: string | null;
};

function HomePage() {
  const [categories, setCategories] = useState<
  Array<{ id: string; name: string }>
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [featured, setFeatured] = useState<FeaturedProduct[]>([]);
  const [featuredLoading, setFeaturedLoading] = useState(true);

  useEffect(() => {
    async function loadCategories() {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from("categories")
        .select("id, name")
        .order("name", { ascending: true });

      if (error) {
        console.error("Failed to load categories:", error);
        setError("Unable to load categories right now.");
        setLoading(false);
        return;
      }

      setCategories(data ?? []);
      setLoading(false);
    }

    loadCategories();
  }, []);

  useEffect(() => {
    async function loadFeatured() {
      setFeaturedLoading(true);

      // Products with a badge_tag set by the admin (Best Seller, Bumper
      // Sale, Hot Deal, etc.) are treated as "Featured Offers".
      const { data, error } = (await supabase
      .from("products")
      .select("id, name, description, selling_price, original_price, stock, image_url, badge_tag")
      .not("badge_tag", "is", null)
      .order("created_at", { ascending: false })
      .limit(8)) as any;

      if (error) {
        console.error("Failed to load featured products:", error);
        setFeatured([]);
        setFeaturedLoading(false);
        return;
      }

      setFeatured((data ?? []) as FeaturedProduct[]);
      setFeaturedLoading(false);
    }

    loadFeatured();
  }, []);

  return (
    <>
      <style>{`
        @keyframes badge-glow {
          0%, 100% { box-shadow: 0 0 0 0 rgba(217, 78, 46, 0.45); }
          50% { box-shadow: 0 0 0 6px rgba(217, 78, 46, 0); }
        }
        .badge-glow {
          animation: badge-glow 1.8s ease-in-out infinite;
        }
        @keyframes discount-pop {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.06); }
        }
        .discount-pop {
          animation: discount-pop 1.6s ease-in-out infinite;
        }
      `}</style>

      <section className="section-y">
        <Container>
          <div className="grid items-center gap-8 lg:grid-cols-2">
            <div>
              <p className="text-sm font-medium text-accent">
                204, AR Mall, Surat
              </p>

              <h1 className="mt-3 font-display text-4xl font-bold tracking-tight sm:text-5xl">
                Mobile & Computer Accessories, Made Easy
              </h1>

              <p className="mt-5 max-w-xl text-base leading-7 text-muted-foreground">
                Kisaan Accessories brings everyday tech essentials to your
                doorstep in Surat. Browse by category and order with Cash on
                Delivery.
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <Button asChild>
                  <Link to="/categories">Shop Now</Link>
                </Button>

                <Button variant="outline" asChild>
                  <a href="#categories">Explore Categories</a>
                </Button>
              </div>
            </div>

            {/* Hero imagery — bento-style gallery */}
            <div className="grid min-h-72 grid-cols-2 grid-rows-2 gap-3">
              {heroImages.map((img) => (
                <div
                  key={img.src}
                  className={`group relative overflow-hidden rounded-xl border border-border bg-surface ${img.className}`}
                >
                  <img
                    src={img.src}
                    alt={img.alt}
                    loading="lazy"
                    className="size-full object-cover transition duration-500 group-hover:scale-105"
                  />
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent" />
                </div>
              ))}
            </div>
          </div>
        </Container>
      </section>

      {/* Featured Offers & Top Deals */}
      {!featuredLoading && featured.length > 0 && (
        <section className="section-y pt-0">
          <Container>
            <div className="flex items-center gap-2">
              <Flame className="size-5 text-accent" aria-hidden />
              <h2 className="font-display text-xl font-semibold sm:text-2xl">
                Featured Offers & Top Deals
              </h2>
            </div>

            <p className="mt-1 text-sm text-muted-foreground">
              Hand-picked deals, refreshed regularly.
            </p>

            <div className="mt-6 flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory sm:grid sm:grid-cols-2 sm:overflow-visible lg:grid-cols-4">
              {featured.map((product) => {
                const discountPct =
                  product.original_price && product.original_price > product.selling_price
                    ? Math.round(
                        ((product.original_price - product.selling_price) /
                          product.original_price) *
                          100
                      )
                    : null;

                return (
                  <Link
                    key={product.id}
                    to="/product/$productId"
                    params={{ productId: product.id }}
                    className="group relative flex w-64 shrink-0 snap-start flex-col overflow-hidden rounded-xl border border-border bg-surface transition duration-300 hover:-translate-y-1 hover:shadow-lg sm:w-auto sm:shrink"
                  >
                    {product.badge_tag && (
                      <span className="badge-glow absolute left-3 top-3 z-10 rounded-full bg-accent px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-accent-foreground shadow-sm">
                        {product.badge_tag}
                      </span>
                    )}

                    {discountPct !== null && (
                      <span className="discount-pop absolute right-3 top-3 z-10 rounded-full bg-destructive px-2.5 py-1 text-[11px] font-bold text-destructive-foreground shadow-sm">
                        {discountPct}% OFF
                      </span>
                    )}

                    <div className="aspect-square w-full overflow-hidden bg-background">
                      {product.image_url ? (
                        <img
                          src={product.image_url}
                          alt={product.name}
                          loading="lazy"
                          className="size-full object-cover transition duration-500 group-hover:scale-110"
                        />
                      ) : (
                        <div className="flex size-full items-center justify-center text-muted-foreground">
                          <Tag className="size-8" aria-hidden />
                        </div>
                      )}
                    </div>

                    <div className="flex flex-1 flex-col gap-1.5 p-4">
                      <p className="line-clamp-2 text-sm font-medium text-foreground">
                        {product.name}
                      </p>

                      {product.description && (
                        <p className="line-clamp-1 text-xs text-muted-foreground">
                          {product.description}
                        </p>
                      )}

                      <div className="mt-auto flex items-center gap-2">
                        <Price sellingPrice={product.selling_price} />
                        {product.original_price && product.original_price > product.selling_price && (
                          <span className="text-xs text-muted-foreground line-through">
                            ₹{product.original_price.toLocaleString("en-IN")}
                          </span>
                        )}
                      </div>

                      <div className="mt-1 flex items-center justify-between gap-2">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                            product.stock > 0
                              ? "bg-success/10 text-success"
                              : "bg-destructive/10 text-destructive"
                          }`}
                        >
                          {product.stock > 0 ? "In Stock" : "Out of Stock"}
                        </span>

                        <span className="text-xs font-semibold text-accent transition group-hover:underline">
                          View Details →
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </Container>
        </section>
      )}

      <section className="section-y">
        <Container className="grid gap-4 sm:grid-cols-3">
          {trustPoints.map((point) => (
            <div
              key={point.title}
              className="rounded-lg border border-border bg-surface p-5"
            >
              <point.icon className="size-5 text-accent" aria-hidden />
              <p className="mt-3 text-sm font-semibold">{point.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {point.text}
              </p>
            </div>
          ))}
        </Container>
      </section>

      <section id="categories" className="section-y pt-0">
        <Container>
          <h2 className="font-display text-xl font-semibold sm:text-2xl">
            Shop by Category
          </h2>

          <p className="mt-1 text-sm text-muted-foreground">
            Choose a category to explore available products.
          </p>

          <div className="mt-6">
            {loading && <LoadingState />}

            {!loading && error && (
              <ErrorState
                title="Categories couldn't be loaded"
                description={error}
              />
            )}

            {!loading && !error && categories.length === 0 && (
              <EmptyState
                title="No categories available"
                description="Categories will appear here once they are added from the admin panel."
              />
            )}

            {!loading && !error && categories.length > 0 && (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {categories.map((category) => (
                  <Button
                    key={category.id}
                    variant="outline"
                    className="h-auto min-h-14 justify-between px-5 py-4 text-left"
                    asChild
                  >
                    <Link
                      to="/category/$categoryId"
                      params={{ categoryId: category.id }}
                    >
                      <span>{category.name}</span>
                      <span aria-hidden>→</span>
                    </Link>
                  </Button>
                ))}
              </div>
            )}
          </div>
        </Container>
      </section>

      <section className="section-y pt-0">
        <Container>
          <div className="rounded-xl border border-border bg-surface p-6 sm:p-8">
            <h2 className="font-display text-xl font-semibold">
              Visit the shop
            </h2>

            <p className="mt-2 flex items-start gap-2 text-sm text-muted-foreground">
              <MapPin className="mt-0.5 size-4 shrink-0" aria-hidden />
              204, AR Mall, Surat, Gujarat, India
            </p>
          </div>
        </Container>
      </section>
    </>
  );
}