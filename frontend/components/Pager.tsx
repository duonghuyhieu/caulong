// Thanh phan trang dung chung. Bo cuc: [Truoc] --- x/y · N don vi --- [Sau].
// Tren mobile phan "· N don vi" duoc an di cho gon (chi con x/y).

export function Pager({
  page,
  totalPages,
  total,
  unit,
  onPrev,
  onNext,
}: {
  page: number;
  totalPages: number;
  total: number;
  unit: string;
  onPrev: () => void;
  onNext: () => void;
}) {
  return (
    <div className="pager">
      <button
        type="button"
        className="ghost pager-btn"
        onClick={onPrev}
        disabled={page <= 1}
        aria-label="Trang trước"
      >
        <span aria-hidden="true">←</span>
        <span className="pager-btn-label">Trước</span>
      </button>

      <span className="pginfo">
        <span className="pg-pages">
          {page}/{totalPages}
        </span>
        <span className="pg-total">
          {" · "}
          {total} {unit}
        </span>
      </span>

      <button
        type="button"
        className="ghost pager-btn"
        onClick={onNext}
        disabled={page >= totalPages}
        aria-label="Trang sau"
      >
        <span className="pager-btn-label">Sau</span>
        <span aria-hidden="true">→</span>
      </button>
    </div>
  );
}
