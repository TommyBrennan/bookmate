export default function Loading() {
  return (
    <div>
      <div className="text-center mb-8 mt-4">
        <div className="skeleton skeleton-heading mx-auto" style={{ width: "60%", height: "2rem" }} />
        <div className="skeleton skeleton-text mx-auto" style={{ width: "80%", maxWidth: "32rem" }} />
      </div>

      {/* Search bar skeleton */}
      <div className="mb-6">
        <div className="flex gap-3 items-center">
          <div className="flex-1 skeleton" style={{ height: "2.75rem" }} />
          <div className="skeleton" style={{ width: "6rem", height: "2.75rem" }} />
        </div>
      </div>

      {/* Listing card skeletons */}
      <div className="skeleton skeleton-text" style={{ width: "8rem", marginBottom: "0.75rem" }} />
      <div className="grid gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="card flex gap-4">
            <div className="skeleton" style={{ width: "4rem", height: "6rem", flexShrink: 0 }} />
            <div className="flex-1">
              <div className="skeleton skeleton-heading" style={{ width: "60%" }} />
              <div className="skeleton skeleton-text" style={{ width: "40%" }} />
              <div className="flex gap-2 mt-2">
                <div className="skeleton" style={{ width: "5rem", height: "1.5rem", borderRadius: "9999px" }} />
                <div className="skeleton" style={{ width: "4rem", height: "1.5rem", borderRadius: "9999px" }} />
                <div className="skeleton" style={{ width: "5.5rem", height: "1.5rem", borderRadius: "9999px" }} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
