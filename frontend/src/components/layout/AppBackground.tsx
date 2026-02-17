export function AppBackground() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(1200px_600px_at_15%_-10%,rgba(37,99,235,0.16),transparent_65%),radial-gradient(900px_520px_at_90%_0%,rgba(249,115,22,0.14),transparent_60%),linear-gradient(180deg,#f8fafc_0%,#f8fafc_35%,#fffdf8_100%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(15,23,42,0.045)_1px,transparent_1px),linear-gradient(to_bottom,rgba(15,23,42,0.045)_1px,transparent_1px)] bg-[size:34px_34px] opacity-40" />
    </div>
  );
}
