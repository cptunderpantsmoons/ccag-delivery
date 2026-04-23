export interface CardGridProps {
  columns?: 2 | 3 | 4;
  gap?: "sm" | "md" | "lg";
  children: React.ReactNode;
  className?: string;
}

const gapMap: Record<NonNullable<CardGridProps["gap"]>, string> = {
  sm: "gap-[var(--space-sm)]",
  md: "gap-[var(--space-md)]",
  lg: "gap-[var(--space-lg)]",
};

const colMap: Record<NonNullable<CardGridProps["columns"]>, string> = {
  2: "lg:grid-cols-2",
  3: "lg:grid-cols-3",
  4: "lg:grid-cols-4",
};

export function CardGrid({
  columns = 3,
  gap = "md",
  children,
  className = "",
}: CardGridProps) {
  return (
    <div
      className={`grid grid-cols-1 md:grid-cols-2 ${colMap[columns]} ${gapMap[gap]} ${className}`}
    >
      {children}
    </div>
  );
}
