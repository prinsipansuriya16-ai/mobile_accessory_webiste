import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { Container } from "@/components/layout/Container";
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from "@/components/common/States";
import { Price } from "@/components/common/Price";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

type Category = {
  id: string;
  name: string;
};

type Product = {
  id: string;
  name: string;
  description: string | null;
  original_price: number;
  selling_price: number;
  stock: number;
  is_active: boolean;
  image_url: string | null;
};

export const Route = createFileRoute("/category/$categoryId")({
  head: () => ({
    meta: [
      { title: "Category — Kisaan Accessories" },
      {
        name: "description",
        content:
          "Browse products in this category at Kisaan Accessories, 204 AR Mall, Surat.",
      },
      {
        property: "og:title",
        content: "Category — Kisaan Accessories",
      },
      {
        property: "og:description",
        content:
          "Products available in this category at Kisaan Accessories, Surat.",
      },
    ],
  }),
  component: CategoryPage,
});

function CategoryPage() {
  const { categoryId } = Route.useParams();

  const [category, setCategory] = useState<Category | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadCategoryAndProducts() {
      setLoading(true);
      setError(null);

      // Check whether categoryId is a UUID or a name/slug
      const isUuid =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          categoryId
        );

      let categoryQuery = supabase.from("categories").select("id, name");

      if (isUuid) {
        categoryQuery = categoryQuery.eq("id", categoryId);
      } else {
        categoryQuery = categoryQuery.ilike("name", categoryId);
      }

      const { data: categoryData, error: categoryError } =
        await categoryQuery.maybeSingle();

      if (categoryError || !categoryData) {
        console.error("Failed to load category:", categoryError);
        setError("Unable to load this category.");
        setLoading(false);
        return;
      }

      const { data: productsData, error: productsError } = (await supabase
        .from("products")
        .select(
          "id, name, description, original_price, selling_price, stock, is_active, image_url"
        )
        .eq("category_id", categoryData.id)
        .order("name", { ascending: true })) as any;

      if (productsError) {
        console.error("Failed to load products:", productsError);
        setError("Unable to load products right now.");
        setLoading(false);
        return;
      }

      setCategory(categoryData);
      setProducts(productsData ?? []);
      setLoading(false);
    }

    loadCategoryAndProducts();
  }, [categoryId]);

  return (
    <Container className="section-y">
      <nav className="text-sm text-muted-foreground">
        <Link to="/" className="hover:text-foreground">
          Home
        </Link>

        <span className="px-2">/</span>

        <Link to="/categories" className="hover:text-foreground">
          Categories
        </Link>
      </nav>

      {loading && (
        <div className="mt-8">
          <LoadingState />
        </div>
      )}

      {!loading && error && (
        <div className="mt-8">
          <ErrorState
            title="Something went wrong"
            description={error}
          />
        </div>
      )}

      {!loading && !error && (
        <>
          <h1 className="mt-3 font-display text-2xl font-bold sm:text-3xl">
            {category?.name ?? "Category"}
          </h1>

          <p className="mt-1 text-sm text-muted-foreground">
            Browse products available in this category.
          </p>

          {products.length === 0 ? (
            <div className="mt-8">
              <EmptyState
                title="No products available"
                description="There are currently no active products in this category."
                action={
                  <Button asChild variant="outline">
                    <Link to="/categories">Browse categories</Link>
                  </Button>
                }
              />
            </div>
          ) : (
            <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {products.map((product) => (
                <Link
                  key={product.id}
                  to="/product/$productId"
                  params={{ productId: product.id }}
                  className="group overflow-hidden rounded-xl border border-border bg-surface transition-shadow hover:shadow-md"
                >
                  <div className="flex aspect-square items-center justify-center overflow-hidden bg-muted">
                    {product.image_url ? (
                      <img
                        src={product.image_url}
                        alt={product.name}
                        loading="lazy"
                        className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <span className="p-6 text-sm text-muted-foreground">
                        Product image
                      </span>
                    )}
                  </div>

                  <div className="p-5">
                    <h2 className="font-semibold group-hover:text-accent">
                      {product.name}
                    </h2>

                    {product.description && (
                      <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                        {product.description}
                      </p>
                    )}

                    <div className="mt-4">
                      <Price
                        originalPrice={product.original_price}
                        sellingPrice={product.selling_price}
                      />
                    </div>

                    {product.stock > 0 ? (
                      <p className="mt-3 text-xs text-success">
                        In stock
                      </p>
                    ) : (
                      <p className="mt-3 text-xs text-destructive">
                        Out of stock
                      </p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </>
      )}
    </Container>
  );
}