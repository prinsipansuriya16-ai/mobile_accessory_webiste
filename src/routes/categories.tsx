import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { Container } from "@/components/layout/Container";
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from "@/components/common/States";
import { supabase } from "@/integrations/supabase/client";

type Category = {
  id: string;
  name: string;
  description?: string | null;
};

export const Route = createFileRoute("/categories")({
  head: () => ({
    meta: [
      { title: "Shop by Category — Kisaan Accessories" },
      {
        name: "description",
        content:
          "Browse all product categories at Kisaan Accessories, Surat: cables, cases, keyboards, mice, printers and more.",
      },
      { property: "og:title", content: "Shop by Category — Kisaan Accessories" },
      {
        property: "og:description",
        content: "Browse every accessory category available at Kisaan Accessories, Surat.",
      },
    ],
  }),
  component: CategoriesPage,
});

function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchCategories() {
      setLoading(true);
      setError(null);

      // Safe select: sirf id aur name (baaki optional)
      const { data, error: catError } = await supabase
        .from("categories")
        .select("*");

      if (catError) {
        console.error("Supabase Error Details:", catError);
        setError(`Unable to load categories: ${catError.message}`);
      } else {
        setCategories(data ?? []);
      }

      setLoading(false);
    }

    fetchCategories();
  }, []);

  return (
    <Container className="section-y">
      <h1 className="font-display text-2xl font-bold sm:text-3xl">Shop by Category</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Pick a category to see the products available in the shop.
      </p>

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

      {!loading && !error && categories.length === 0 && (
        <div className="mt-8">
          <EmptyState
            title="No categories found"
            description="There are currently no categories available in the store database."
          />
        </div>
      )}

      {!loading && !error && categories.length > 0 && (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((category) => (
            <Link
              key={category.id}
              to="/category/$categoryId"
              params={{ categoryId: category.id }}
              className="group flex flex-col justify-between rounded-xl border border-border bg-surface p-6 transition-all hover:border-accent hover:shadow-md"
            >
              <div>
                <h2 className="font-display text-lg font-semibold group-hover:text-accent">
                  {category.name}
                </h2>
                {category.description && (
                  <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                    {category.description}
                  </p>
                )}
              </div>
              <div className="mt-4 flex items-center text-xs font-medium text-accent">
                Browse products &rarr;
              </div>
            </Link>
          ))}
        </div>
      )}
    </Container>
  );
}