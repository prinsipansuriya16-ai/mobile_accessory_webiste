import { cn } from "@/lib/utils";

function formatINR(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

export function Price({
  sellingPrice,
  originalPrice,
  size = "md",
  className,
}: {
  sellingPrice: number;
  originalPrice?: number | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const hasDiscount =
    typeof originalPrice === "number" && originalPrice > sellingPrice && sellingPrice >= 0;
  const discount = hasDiscount
    ? Math.round(((originalPrice - sellingPrice) / originalPrice) * 100)
    : 0;

  return (
    <div className={cn("flex flex-wrap items-baseline gap-x-2 gap-y-1", className)}>
      <span
        className={cn(
          "font-semibold text-foreground",
          size === "sm" && "text-sm",
          size === "md" && "text-base",
          size === "lg" && "text-2xl",
        )}
      >
        {formatINR(sellingPrice)}
      </span>
      {hasDiscount ? (
        <>
          <span
            className={cn(
              "text-muted-foreground line-through",
              size === "lg" ? "text-sm" : "text-xs",
            )}
          >
            {formatINR(originalPrice)}
          </span>
          <span className="rounded-sm bg-accent/20 px-1.5 py-0.5 text-xs font-semibold text-accent-foreground">
            {discount}% off
          </span>
        </>
      ) : null}
    </div>
  );
}

export { formatINR };
