export const BOOK_STYLES = [
  { bg: "var(--high-tint)", border: "var(--high)", accent: "var(--high)" },
  { bg: "var(--medium-tint)", border: "var(--medium)", accent: "var(--medium)" },
  { bg: "var(--low-tint)", border: "var(--low)", accent: "var(--low)" },
];

export function truncateFilename(name, max = 28) {
  if (name.length <= max) return name;
  const ext = name.includes(".") ? name.slice(name.lastIndexOf(".")) : "";
  const base = name.slice(0, name.length - ext.length);
  return `${base.slice(0, max - ext.length - 1)}…${ext}`;
}

export default function BookSpine({
  index = 0,
  title,
  onActivate,
  meta,
  body,
  actions,
  className = "",
  ariaLabel,
}) {
  const style = BOOK_STYLES[index % BOOK_STYLES.length];

  function handleKeyDown(e) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onActivate?.();
    }
  }

  return (
    <article
      className={`book-spine${className ? ` ${className}` : ""}`}
      style={{
        background: style.bg,
        borderColor: style.border,
      }}
      onClick={onActivate}
      role="button"
      tabIndex={0}
      aria-label={ariaLabel || title}
      onKeyDown={handleKeyDown}
    >
      <div className="book-spine-top" style={{ borderBottomColor: style.border }}>
        <h3 className="book-spine-title" style={{ color: style.accent }}>
          {title}
        </h3>
        {meta}
      </div>
      {body ? <div className="book-spine-body">{body}</div> : null}
      {actions ? <div className="book-spine-actions">{actions}</div> : null}
    </article>
  );
}
