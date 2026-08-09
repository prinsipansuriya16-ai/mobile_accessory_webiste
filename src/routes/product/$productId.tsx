import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, ShoppingCart, Zap } from "lucide-react";
import { toast } from "sonner";

import { Container } from "@/components/layout/Container";
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from "@/components/common/States";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { addToCart } from "@/lib/cart";

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

type ProductImage = {
  id: string;
  image_url: string;
  is_primary: boolean;
  sort_order: number;
};

export const Route = createFileRoute("/product/$productId")({
  head: () => ({
    meta: [
      { title: "Product — Kisaan Accessories" },
      {
        name: "description",
        content:
          "Product details, images, pricing and availability at Kisaan Accessories, Surat.",
      },
      {
        property: "og:title",
        content: "Product — Kisaan Accessories",
      },
      {
        property: "og:description",
        content:
          "Product details and Cash on Delivery ordering at Kisaan Accessories, Surat.",
      },
    ],
  }),
  component: ProductPage,
});

function ProductPage() {
  const { productId } = Route.useParams();
  const navigate = useNavigate();

  const [product, setProduct] = useState<Product | null>(null);
  const [images, setImages] = useState<ProductImage[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [buyingNow, setBuyingNow] = useState(false);

  const touchStartX = useRef<number | null>(null);
  const touchDeltaX = useRef(0);

  useEffect(() => {
    async function loadProduct() {
      setLoading(true);
      setError(null);

      const [productResult, imagesResult] = await Promise.all([
        supabase
          .from("products")
          .select(
            "id, name, description, original_price, selling_price, stock, is_active, image_url",
          )
          .eq("id", productId)
          .eq("is_active", true)
          .maybeSingle() as any,

        supabase
          .from("product_images")
          .select("id, image_url, is_primary, sort_order")
          .eq("product_id", productId)
          .order("is_primary", { ascending: false })
          .order("sort_order", { ascending: true }),
      ]);

      if (productResult.error) {
        console.error("Failed to load product:", productResult.error);
        setError("Unable to load this product.");
        setLoading(false);
        return;
      }

      if (imagesResult.error) {
        console.error("Failed to load product images:", imagesResult.error);
        setError("Unable to load product images.");
        setLoading(false);
        return;
      }

      if (!productResult.data) {
        setProduct(null);
        setImages([]);
        setCurrentIndex(0);
        setLoading(false);
        return;
      }

      const loadedImages = imagesResult.data ?? [];

      setProduct(productResult.data);
      setImages(loadedImages);
      setCurrentIndex(0);
      setLoading(false);
    }

    loadProduct();
  }, [productId]);

  // Unified gallery: the product's own `image_url` always comes first (it's
  // the hero image shown on category/listing cards), followed by any extra
  // gallery images from `product_images`. If the same URL was also uploaded
  // into the gallery, drop that duplicate so it isn't shown twice. If there
  // are no gallery images at all, this still resolves to just the hero image
  // (or an empty array if the product has no image_url either).
  const combinedImages: ProductImage[] = product?.image_url
    ? [
        {
          id: "hero",
          image_url: product.image_url,
          is_primary: true,
          sort_order: -1,
        },
        ...images.filter((image) => image.image_url !== product.image_url),
      ]
    : images;

  const selectedImage = combinedImages[currentIndex] ?? null;

  function goToImage(index: number) {
    if (combinedImages.length === 0) return;
    const next =
      ((index % combinedImages.length) + combinedImages.length) %
      combinedImages.length;
    setCurrentIndex(next);
  }

  function goPrev() {
    goToImage(currentIndex - 1);
  }

  function goNext() {
    goToImage(currentIndex + 1);
  }

  function handleTouchStart(e: React.TouchEvent<HTMLDivElement>) {
    const touch = e.touches[0];
    if (!touch) return;
    touchStartX.current = touch.clientX;
    touchDeltaX.current = 0;
  }

  function handleTouchMove(e: React.TouchEvent<HTMLDivElement>) {
    if (touchStartX.current === null) return;
    const touch = e.touches[0];
    if (!touch) return;
    touchDeltaX.current = touch.clientX - touchStartX.current;
  }

  function handleTouchEnd() {
    const SWIPE_THRESHOLD = 40;
    if (touchDeltaX.current > SWIPE_THRESHOLD) {
      goPrev();
    } else if (touchDeltaX.current < -SWIPE_THRESHOLD) {
      goNext();
    }
    touchStartX.current = null;
    touchDeltaX.current = 0;
  }

  function handleAddToCart() {
    if (!product) {
      return;
    }

    if (product.stock <= 0) {
      toast.error("This product is currently out of stock.");
      return;
    }

    const primaryImage =
      combinedImages.find((image) => image.is_primary)?.image_url ??
      combinedImages[0]?.image_url ??
      null;

    const added = addToCart({
      productId: product.id,
      name: product.name,
      imageUrl: primaryImage,
      originalPrice: product.original_price,
      sellingPrice: product.selling_price,
      quantity: 1,
      stock: product.stock,
    });

    if (added) {
      toast.success(`${product.name} added to cart.`);
    } else {
      toast.error(
        `You cannot add more than ${product.stock} unit${
          product.stock === 1 ? "" : "s"
        } of this product.`,
      );
    }
  }

  function handleBuyNow() {
    if (!product || buyingNow) {
      return;
    }

    if (product.stock <= 0) {
      toast.error("This product is currently out of stock.");
      return;
    }

    setBuyingNow(true);

    const primaryImage =
      combinedImages.find((image) => image.is_primary)?.image_url ??
      combinedImages[0]?.image_url ??
      null;

    // Buy Now puts exactly this product in the cart (so checkout has a
    // single, predictable line item) and jumps straight to checkout with
    // Cash on Delivery pre-selected via the `payment` search param.
    addToCart({
      productId: product.id,
      name: product.name,
      imageUrl: primaryImage,
      originalPrice: product.original_price,
      sellingPrice: product.selling_price,
      quantity: 1,
      stock: product.stock,
    });

    navigate({
      to: "/checkout",
      search: { payment: "COD", buyNow: product.id },
    });
  }

  if (loading) {
    return (
      <Container className="section-y">
        <LoadingState />
      </Container>
    );
  }

  if (error) {
    return (
      <Container className="section-y">
        <ErrorState description={error} />
      </Container>
    );
  }

  if (!product) {
    return (
      <Container className="section-y">
        <EmptyState
          title="Product not found"
          description="This product may have been removed or is currently unavailable."
          action={
            <Button asChild>
              <Link to="/categories">Browse categories</Link>
            </Button>
          }
        />
      </Container>
    );
  }

  const discountPercentage =
    product.original_price > product.selling_price
      ? Math.round(
          ((product.original_price - product.selling_price) /
            product.original_price) *
            100,
        )
      : 0;

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

        <span className="px-2">/</span>

        <span className="text-foreground">{product.name}</span>
      </nav>

      <div className="mt-8 grid gap-10 lg:grid-cols-2">
        <div>
          <div
            className="relative flex aspect-square touch-pan-y select-none items-center justify-center overflow-hidden rounded-xl border border-border bg-surface"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            {selectedImage ? (
              <img
                key={selectedImage.id}
                src={selectedImage.image_url}
                alt={product.name}
                draggable={false}
                className="h-full w-full object-contain p-6"
              />
            ) : (
              <p className="text-sm text-muted-foreground">
                No product image available
              </p>
            )}

            {combinedImages.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={goPrev}
                  aria-label="Previous image"
                  className="absolute left-2 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-full bg-background/80 text-foreground shadow-sm backdrop-blur transition-colors hover:bg-background"
                >
                  <ChevronLeft className="size-5" />
                </button>
                <button
                  type="button"
                  onClick={goNext}
                  aria-label="Next image"
                  className="absolute right-2 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-full bg-background/80 text-foreground shadow-sm backdrop-blur transition-colors hover:bg-background"
                >
                  <ChevronRight className="size-5" />
                </button>

                <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
                  {combinedImages.map((image, index) => (
                    <button
                      key={image.id}
                      type="button"
                      onClick={() => goToImage(index)}
                      aria-label={`Go to image ${index + 1}`}
                      className={`size-1.5 rounded-full transition-all ${
                        index === currentIndex
                          ? "w-4 bg-accent"
                          : "bg-foreground/30"
                      }`}
                    />
                  ))}
                </div>
              </>
            )}
          </div>

          {combinedImages.length > 1 && (
            <div className="mt-4 grid grid-cols-4 gap-3 sm:grid-cols-6">
              {combinedImages.map((image, index) => (
                <button
                  key={image.id}
                  type="button"
                  onClick={() => goToImage(index)}
                  className={`aspect-square overflow-hidden rounded-lg border bg-surface ${
                    index === currentIndex
                      ? "border-accent"
                      : "border-border"
                  }`}
                  aria-label={`View image of ${product.name}`}
                >
                  <img
                    src={image.image_url}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
            {product.name}
          </h1>

          {product.description && (
            <p className="mt-4 leading-7 text-muted-foreground">
              {product.description}
            </p>
          )}

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <span className="text-3xl font-bold">
              ₹{product.selling_price.toLocaleString("en-IN")}
            </span>

            {product.original_price > product.selling_price && (
              <>
                <span className="text-lg text-muted-foreground line-through">
                  ₹{product.original_price.toLocaleString("en-IN")}
                </span>

                <span className="rounded-full bg-accent/10 px-3 py-1 text-sm font-semibold text-accent">
                  {discountPercentage}% OFF
                </span>
              </>
            )}
          </div>

          <div className="mt-5">
            {product.stock > 0 ? (
              <p className="text-sm font-medium text-success">
                In stock
                {product.stock <= 5
                  ? ` — Only ${product.stock} left`
                  : ""}
              </p>
            ) : (
              <p className="text-sm font-medium text-destructive">
                Out of stock
              </p>
            )}
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button
              type="button"
              size="lg"
              variant="outline"
              disabled={product.stock <= 0}
              onClick={handleAddToCart}
              className="sm:flex-1"
            >
              <ShoppingCart className="mr-2 size-5" />
              Add to Cart
            </Button>

            <Button
              type="button"
              size="lg"
              disabled={product.stock <= 0 || buyingNow}
              onClick={handleBuyNow}
              className="sm:flex-1"
            >
              <Zap className="mr-2 size-5" />
              Buy Now (Cash on Delivery)
            </Button>
          </div>

          <div className="mt-3">
            <Button asChild size="sm" variant="ghost">
              <Link to="/categories">Continue Shopping</Link>
            </Button>
          </div>

          <div className="mt-8 rounded-xl border border-border bg-surface p-5">
            <p className="font-semibold">Cash on Delivery Available</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Place your order and pay when it is delivered.
            </p>
          </div>
        </div>
      </div>
    </Container>
  );
}