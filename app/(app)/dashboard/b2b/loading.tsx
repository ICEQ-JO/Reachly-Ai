export default function Loading() {
  return (
    <div style={{ padding: "28px 32px", maxWidth: "960px" }}>
      <div style={{ height: "56px", background: "var(--bg-subtle)", borderRadius: "10px", marginBottom: "28px", animation: "pulse 1.5s ease-in-out infinite" }} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px", marginBottom: "24px" }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} style={{ height: "120px", background: "var(--bg-subtle)", borderRadius: "10px", animation: "pulse 1.5s ease-in-out infinite", animationDelay: `${i * 0.1}s` }} />
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
        <div style={{ height: "220px", background: "var(--bg-subtle)", borderRadius: "10px", animation: "pulse 1.5s ease-in-out infinite" }} />
        <div style={{ height: "220px", background: "var(--bg-subtle)", borderRadius: "10px", animation: "pulse 1.5s ease-in-out infinite", animationDelay: "0.1s" }} />
      </div>
    </div>
  );
}
