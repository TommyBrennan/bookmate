export default function ProfileLoading() {
  return (
    <div style={{ maxWidth: "40rem", margin: "0 auto" }}>
      <div className="skeleton skeleton-heading" style={{ width: "8rem", height: "1.75rem", marginBottom: "1.5rem" }} />
      <div className="card mb-6">
        <div className="flex items-center gap-4 mb-4">
          <div className="skeleton" style={{ width: "4rem", height: "4rem", borderRadius: "50%" }} />
          <div className="flex-1">
            <div className="skeleton skeleton-heading" style={{ width: "40%" }} />
            <div className="skeleton skeleton-text" style={{ width: "60%" }} />
          </div>
        </div>
        <div className="skeleton skeleton-text" style={{ width: "100%" }} />
        <div className="skeleton skeleton-text" style={{ width: "80%" }} />
      </div>

      <div className="skeleton skeleton-heading" style={{ width: "10rem", marginBottom: "1rem" }} />
      <div className="grid gap-3">
        {[1, 2].map((i) => (
          <div key={i} className="card flex gap-3">
            <div className="skeleton" style={{ width: "3rem", height: "4.5rem", flexShrink: 0 }} />
            <div className="flex-1">
              <div className="skeleton skeleton-heading" style={{ width: "50%" }} />
              <div className="skeleton skeleton-text" style={{ width: "35%" }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
