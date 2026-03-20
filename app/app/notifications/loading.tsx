export default function NotificationsLoading() {
  return (
    <div style={{ maxWidth: "40rem", margin: "0 auto" }}>
      <div className="skeleton skeleton-heading" style={{ width: "10rem", height: "1.75rem", marginBottom: "1.5rem" }} />
      <div className="grid gap-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="card" style={{ padding: "1rem 1.25rem" }}>
            <div className="flex gap-3 items-start">
              <div className="skeleton" style={{ width: "2rem", height: "2rem", borderRadius: "50%", flexShrink: 0 }} />
              <div className="flex-1">
                <div className="skeleton skeleton-text" style={{ width: "80%" }} />
                <div className="skeleton skeleton-text" style={{ width: "30%", height: "0.75rem" }} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
