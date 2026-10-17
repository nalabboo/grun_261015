"use client";

type PageTurnButtonProps = {
  onTurn: () => void;
  label?: string;
};

/** Bottom-right corner control — folded paper, like turning a page. */
export default function PageTurnButton({
  onTurn,
  label = "2장",
}: PageTurnButtonProps) {
  return (
    <button
      type="button"
      className="page-turn"
      aria-label="다음 장으로 넘기기"
      onClick={(event) => {
        event.stopPropagation();
        onTurn();
      }}
    >
      <span className="page-turn__sheet" aria-hidden />
      <span className="page-turn__label">{label}</span>
    </button>
  );
}
