import * as React from "react"
import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

interface PaginationProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
  siblingsCount?: number
}

function generatePages(
  current: number,
  total: number,
  siblings: number
): (number | "dots")[] {
  // Si assez peu de pages, tout afficher
  const totalSlots = siblings * 2 + 5 // first + last + current + 2 ellipsis
  if (total <= totalSlots) {
    return Array.from({ length: total }, (_, i) => i + 1)
  }

  const left = Math.max(current - siblings, 2)
  const right = Math.min(current + siblings, total - 1)

  const result: (number | "dots")[] = [1]

  if (left > 2) {
    result.push("dots")
  } else {
    for (let i = 2; i < left; i++) result.push(i)
  }

  for (let i = left; i <= right; i++) result.push(i)

  if (right < total - 1) {
    result.push("dots")
  } else {
    for (let i = right + 1; i < total; i++) result.push(i)
  }

  result.push(total)
  return result
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  siblingsCount = 1,
}: PaginationProps) {
  const pages = generatePages(currentPage, totalPages, siblingsCount)

  return (
    <div className="flex flex-wrap items-center justify-center gap-1 sm:gap-2 mt-6">
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        aria-label="Page précédente"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      {pages.map((page, idx) =>
        page === "dots" ? (
          <span
            key={`dots-${idx}`}
            className="flex h-8 w-8 items-center justify-center text-muted-foreground"
            aria-hidden
          >
            <MoreHorizontal className="h-4 w-4" />
          </span>
        ) : (
          <Button
            key={page}
            variant={page === currentPage ? "default" : "outline"}
            size="sm"
            onClick={() => onPageChange(page)}
            aria-current={page === currentPage ? "page" : undefined}
          >
            {page}
          </Button>
        )
      )}

      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        aria-label="Page suivante"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  )
}
