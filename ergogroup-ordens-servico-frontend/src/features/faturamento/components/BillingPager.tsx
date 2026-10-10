import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';

export function BillingPager({
  page,
  totalPages,
  setPage,
}: {
  page: number;
  totalPages: number;
  setPage: (v: number) => void;
}) {
  if (totalPages <= 1) return null;
  const items: (number | 'ellipsis')[] = [];
  if (totalPages <= 7) {
    for (let p = 1; p <= totalPages; p++) items.push(p);
  } else {
    items.push(1);
    const start = Math.max(2, page - 1);
    const end = Math.min(totalPages - 1, page + 1);
    if (start > 2) items.push('ellipsis');
    for (let p = start; p <= end; p++) items.push(p);
    if (end < totalPages - 1) items.push('ellipsis');
    items.push(totalPages);
  }
  return (
    <div className="pt-4">
      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious href="#" onClick={(e) => { e.preventDefault(); if (page > 1) setPage(page - 1); }} className={page === 1 ? 'pointer-events-none opacity-50' : ''} />
          </PaginationItem>
          {items.map((item, idx) => (
            <PaginationItem key={`${item}-${idx}`}>
              {item === 'ellipsis' ? <PaginationEllipsis /> : (
                <PaginationLink href="#" isActive={item === page} onClick={(e) => { e.preventDefault(); setPage(item as number); }}>{item}</PaginationLink>
              )}
            </PaginationItem>
          ))}
          <PaginationItem>
            <PaginationNext href="#" onClick={(e) => { e.preventDefault(); if (page < totalPages) setPage(page + 1); }} className={page === totalPages ? 'pointer-events-none opacity-50' : ''} />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  );
}
