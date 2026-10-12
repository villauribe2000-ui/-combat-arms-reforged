type Props = {
  leaving?: boolean;
};

export default function PageLoader({ leaving = false }: Props) {
  return (
    <div className="page-transition" data-phase={leaving ? 'leaving' : 'entering'} role="status" aria-live="polite">
      <div className="page-transition-scan" />
      <div className="page-transition-content">
        <span className="page-transition-bracket-tr" />
        <span className="page-transition-bracket-bl" />
        <div className="page-transition-emblem">
          <span className="page-transition-orbit" />
          <img src="/caevo/loading-avatar.png" alt="" />
        </div>
        <div className="page-transition-wordmark">COMBAT <span>ARMS</span></div>
        <div className="page-transition-status">
          Loading<span className="page-transition-sr-only"> page</span>
        </div>
        <div className="page-transition-track" aria-hidden="true">
          <span />
        </div>
      </div>
    </div>
  );
}
