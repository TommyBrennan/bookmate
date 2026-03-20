export default function ListingLoading() {
  return (
    <div style={{ maxWidth: "48rem", margin: "0 auto" }}>
      <div className="skeleton skeleton-text" style={{ width: "5rem", marginBottom: "1.5rem" }} />
      <div className="card">
        <div className="flex gap-6" style={{ flexWrap: "wrap" }}>
          <div className="skeleton" style={{ width: "8rem", height: "12rem", flexShrink: 0 }} />
          <div className="flex-1" style={{ minWidth: "16rem" }}>
            <div className="skeleton skeleton-heading" style={{ width: "70%", height: "1.75rem" }} />
            <div className="skeleton skeleton-text" style={{ width: "40%" }} />
            <div className="skeleton skeleton-text" style={{ width: "50%", marginTop: "1rem" }} />
            <div className="flex gap-2 mt-3">
              <div className="skeleton" style={{ width: "5rem", height: "1.5rem", borderRadius: "9999px" }} />
              <div className="skeleton" style={{ width: "4rem", height: "1.5rem", borderRadius: "9999px" }} />
              <div className="skeleton" style={{ width: "6rem", height: "1.5rem", borderRadius: "9999px" }} />
            </div>
          </div>
        </div>
        <div style={{ marginTop: "1.5rem", borderTop: "1px solid var(--color-border)", paddingTop: "1.5rem" }}>
          <div className="skeleton skeleton-heading" style={{ width: "6rem" }} />
          <div className="flex gap-2 mt-2">
            <div className="skeleton" style={{ width: "2rem", height: "2rem", borderRadius: "50%" }} />
            <div className="skeleton" style={{ width: "2rem", height: "2rem", borderRadius: "50%" }} />
          </div>
        </div>
      </div>
    </div>
  );
}
