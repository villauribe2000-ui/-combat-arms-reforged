import { useState } from 'react';
import {
  ArrowDownToLine, ArrowRight, Check, ChevronRight, Cpu, Download, HardDrive, Info, Monitor, Package, Play, Settings2, ShieldCheck, Wifi,
} from 'lucide-react';
import EvolutionGuard from '@/components/EvolutionGuard';
import { CLIENT_DOWNLOAD_URL } from '@/lib/client';

export { CLIENT_DOWNLOAD_URL };

const SPECS = [
  { icon: Cpu, name: 'Processor', sub: 'CPU', min: 'Intel Pentium III · 1 GHz+', rec: 'Intel Pentium 4 · 2.4 GHz+' },
  { icon: Monitor, name: 'Memory', sub: 'RAM', min: '256 MB', rec: '512 MB' },
  { icon: Monitor, name: 'Graphics', sub: 'GPU', min: 'NVIDIA GeForce 2 MX', rec: 'NVIDIA GeForce FX 5600 or better' },
  { icon: HardDrive, name: 'Storage', sub: 'AVAILABLE SPACE', min: '2 GB', rec: '2 GB' },
  { icon: Monitor, name: 'Operating system', sub: 'LEGACY GAME LISTING', min: 'Windows XP*', rec: 'Windows 7 or newer*' },
  { icon: Package, name: 'DirectX', sub: 'RUNTIME', min: 'Version 9.0c', rec: 'Version 9.0c' },
  { icon: Wifi, name: 'Network', sub: 'INTERNET', min: 'Broadband connection', rec: 'Broadband connection' },
];

export default function DownloadPage() {
  const [guardOpen, setGuardOpen] = useState(false);

  return (
    <div className="inner-page page-width download-page">
      <header className="page-heading">
        <div>
          <p className="eyebrow"><span className="tiny-square" /> PREPARE FOR DEPLOYMENT</p>
          <h1>THE FRONTLINE IS WAITING.</h1>
          <p className="page-heading-description">Your next match starts here. Get the game client and prepare for the battlefield.</p>
        </div>
        <div className="page-heading-aside">
          <span className="download-platform">
            <Monitor size={16} aria-hidden /> WINDOWS PC
          </span>
        </div>
      </header>

      <section className="download-client" aria-labelledby="client-title">
        <img className="download-client-art" src="/caevo/hero.jpg" alt="" width={1920} height={620} />
        <div className="download-client-content">
          <div className="download-file-icon">
            <ArrowDownToLine size={28} strokeWidth={1.7} />
          </div>
          <div className="download-client-meta">
            <span>FULL GAME CLIENT</span>
            <span className="download-free">FREE TO PLAY</span>
          </div>
          <h2 id="client-title">COMBAT ARMS<span>GAME CLIENT</span></h2>
          <p>The original battlefield. Your next chapter.</p>
          <div className="download-release-meta">
            <span>Windows installer</span>
            <span>2.70 GB</span>
            <span>.EXE</span>
          </div>
          <div className="download-buttons">
            <button type="button" className="btn-evo btn-evo-primary" onClick={() => setGuardOpen(true)}>
              <Play size={18} /> START GAME
            </button>
            <a className="btn-evo btn-evo-outline" href={CLIENT_DOWNLOAD_URL} target="_blank" rel="noopener noreferrer">
              <Download size={18} /> DOWNLOAD CLIENT
            </a>
            <a className="download-requirements-link" href="#requirements-title">
              System requirements <ArrowRight size={14} />
            </a>
          </div>
          <span className="download-availability" role="status">
            <Info size={15} />
            Start Game runs CA Evolution Guard checks, then launches the client.
          </span>
          <details className="download-integrity">
            <summary>
              <ShieldCheck size={14} /> File information
            </summary>
            <p>CombatArmsEvolution-Setup.exe</p>
            <span>Download source</span>
            <code>MediaFire</code>
          </details>
        </div>
        <div className="download-art-caption" aria-hidden="true">
          <span>CA / PC</span>
          <span>AVAILABLE NOW</span>
        </div>
      </section>

      <div className="download-steps" aria-label="Installation steps">
        <div>
          <span className="download-step-num">01</span>
          <div>
            <h3>GET THE CLIENT</h3>
            <p>Download the latest Windows installer.</p>
          </div>
          <ChevronRight size={18} />
        </div>
        <div>
          <span className="download-step-num">02</span>
          <div>
            <h3>INSTALL &amp; UPDATE</h3>
            <p>Run the installer and complete any updates.</p>
          </div>
          <ChevronRight size={18} />
        </div>
        <div>
          <span className="download-step-num">03</span>
          <div>
            <h3>JOIN THE FIGHT</h3>
            <p>Use Start Game — Guard scans, then the client opens.</p>
          </div>
          <Check size={18} />
        </div>
      </div>

      <section className="download-requirements" aria-labelledby="requirements-title">
        <div className="download-section-header">
          <div>
            <Settings2 size={22} />
            <h2 id="requirements-title">SYSTEM REQUIREMENTS</h2>
          </div>
          <span>CLASSIC · LEGACY REFERENCE</span>
        </div>
        <div className="download-os-note">
          <Info size={19} />
          <p>
            <strong>Classic specifications, for reference.</strong> These are legacy Combat Arms: the Classic requirements. Requirements for this standalone client will be confirmed before its release.
          </p>
        </div>
        <p className="download-scroll-hint">Swipe the table to compare minimum and recommended specifications.</p>
        <div className="download-table-scroll" role="region" tabIndex={0} aria-label="Minimum and recommended system requirements">
          <table className="download-spec-table">
            <caption className="download-sr-only">Legacy Combat Arms: the Classic requirements.</caption>
            <thead>
              <tr>
                <th scope="col">SPECIFICATION</th>
                <th scope="col"><span>MINIMUM</span><small>Legacy baseline</small></th>
                <th scope="col"><span>RECOMMENDED</span><small>Legacy recommendation</small></th>
              </tr>
            </thead>
            <tbody>
              {SPECS.map(row => {
                const Icon = row.icon;
                return (
                  <tr key={row.name}>
                    <th scope="row">
                      <div className="download-spec-name">
                        <Icon size={18} />
                        <span>{row.name}<small>{row.sub}</small></span>
                      </div>
                    </th>
                    <td>{row.min}</td>
                    <td>{row.rec}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="download-source">
          <p>* Older operating systems are listed for historical reference. Supported Windows versions and the storage needed for this client will be published with the download.</p>
        </div>
      </section>

      <div className="download-support">
        <div className="download-support-icon">
          <Info size={23} />
        </div>
        <div>
          <h2>BEFORE YOU INSTALL</h2>
          <p>Check the requirements, choose an installation folder with enough space, and let all updates finish before launching.</p>
        </div>
      </div>

      <EvolutionGuard open={guardOpen} onClose={() => setGuardOpen(false)} />
    </div>
  );
}
