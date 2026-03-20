import Link from "next/link";

export default function NotFound() {
  return (
    <div className="text-center py-20">
      <h1
        className="text-6xl font-bold mb-4"
        style={{ color: "var(--color-accent)" }}
      >
        404
      </h1>
      <h2
        className="text-2xl mb-2"
        style={{ color: "var(--color-text)" }}
      >
        Page not found
      </h2>
      <p
        className="mb-8 max-w-md mx-auto"
        style={{ color: "var(--color-text-secondary)", fontFamily: "system-ui, sans-serif" }}
      >
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
        Maybe you&apos;ll find a great book to read instead?
      </p>
      <Link href="/" className="btn-primary" style={{ padding: "0.75rem 2rem" }}>
        Browse listings
      </Link>
    </div>
  );
}
