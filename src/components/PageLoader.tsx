export default function PageLoader() {
  return (
    <div className="page-loader" role="status" aria-live="polite" aria-label="Loading">
      <img src="/caevo/loading.png" alt="" className="page-loader-art" />
    </div>
  );
}
