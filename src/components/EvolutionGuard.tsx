import { useEffect, useState } from 'react';
import {
  Check, Gamepad2, Info, Loader2, Shield, ShieldAlert, ShieldCheck, Settings, X,
} from 'lucide-react';
import { CLIENT_DOWNLOAD_URL, CLIENT_PROTOCOL } from '@/lib/client';

type StepStatus = 'pending' | 'active' | 'done';

type Step = {
  id: string;
  label: string;
  status: StepStatus;
};

const STEP_DEFS = [
  { id: 'init', label: 'Inicializando protección...' },
  { id: 'files', label: 'Verificando archivos del juego...' },
  { id: 'procs', label: 'Analizando procesos sospechosos...' },
  { id: 'server', label: 'Conectando con el servidor de seguridad...' },
  { id: 'active', label: 'Protección activa' },
] as const;

const STEP_MS = [900, 1400, 1600, 1200, 800];

type Props = {
  open: boolean;
  onClose: () => void;
  /** Called after checks finish and launch is attempted. */
  onLaunched?: () => void;
};

function statusLabel(status: StepStatus) {
  if (status === 'done') return 'Completado';
  if (status === 'active') return 'En progreso...';
  return 'Pendiente';
}

export default function EvolutionGuard({ open, onClose, onLaunched }: Props) {
  const [steps, setSteps] = useState<Step[]>(() =>
    STEP_DEFS.map((s) => ({ ...s, status: 'pending' as StepStatus }))
  );
  const [phase, setPhase] = useState<'scan' | 'ready' | 'launching'>('scan');
  const [nav, setNav] = useState<'monitor' | 'security' | 'settings' | 'about'>('monitor');

  useEffect(() => {
    if (!open) return undefined;

    setPhase('scan');
    setNav('monitor');
    setSteps(STEP_DEFS.map((s) => ({ ...s, status: 'pending' as StepStatus })));

    let cancelled = false;
    const timers: number[] = [];
    let elapsed = 0;

    STEP_DEFS.forEach((_, index) => {
      const startAt = elapsed;
      elapsed += STEP_MS[index];

      timers.push(
        window.setTimeout(() => {
          if (cancelled) return;
          setSteps((prev) =>
            prev.map((step, i) => {
              if (i < index) return { ...step, status: 'done' };
              if (i === index) return { ...step, status: 'active' };
              return { ...step, status: 'pending' };
            })
          );
        }, startAt)
      );

      timers.push(
        window.setTimeout(() => {
          if (cancelled) return;
          setSteps((prev) =>
            prev.map((step, i) => (i <= index ? { ...step, status: 'done' } : step))
          );
          if (index === STEP_DEFS.length - 1) setPhase('ready');
        }, elapsed)
      );
    });

    return () => {
      cancelled = true;
      timers.forEach((id) => window.clearTimeout(id));
    };
  }, [open]);

  useEffect(() => {
    if (!open || phase !== 'ready') return undefined;

    setPhase('launching');
    const t = window.setTimeout(() => {
      try {
        window.location.href = CLIENT_PROTOCOL;
      } catch {
        /* ignore */
      }
      window.setTimeout(() => {
        window.open(CLIENT_DOWNLOAD_URL, '_blank', 'noopener,noreferrer');
        onLaunched?.();
        onClose();
      }, 600);
    }, 700);

    return () => window.clearTimeout(t);
  }, [open, phase, onClose, onLaunched]);

  if (!open) return null;

  return (
    <div className="evo-guard" role="dialog" aria-modal="true" aria-labelledby="evo-guard-title">
      <div className="evo-guard-frame">
        <header className="evo-guard-top">
          <div className="evo-guard-brand">
            <span className="evo-guard-mark" aria-hidden>
              <ShieldCheck size={22} strokeWidth={2.2} />
            </span>
            <div>
              <strong id="evo-guard-title">CA EVOLUTION GUARD</strong>
              <small>ANTI-CHEAT</small>
            </div>
          </div>
          <button type="button" className="evo-guard-close" onClick={onClose} aria-label="Cerrar">
            <X size={18} />
          </button>
        </header>

        <div className="evo-guard-body">
          <aside className="evo-guard-side">
            <button type="button" className={nav === 'monitor' ? 'active' : ''} onClick={() => setNav('monitor')}>
              <Shield size={16} /> Monitoreando
            </button>
            <button type="button" className={nav === 'security' ? 'active' : ''} onClick={() => setNav('security')}>
              <ShieldAlert size={16} /> Seguridad
            </button>
            <button type="button" className={nav === 'settings' ? 'active' : ''} onClick={() => setNav('settings')}>
              <Settings size={16} /> Configuración
            </button>
            <button type="button" className={nav === 'about' ? 'active' : ''} onClick={() => setNav('about')}>
              <Info size={16} /> Acerca de
            </button>
          </aside>

          <main className="evo-guard-main">
            {nav === 'monitor' && (
              <>
                <h2>CA Evolution Guard está monitoreando Combat Arms Evolution</h2>
                <p>
                  Tu juego está protegido. Guard analiza el sistema para evitar el uso de trampas y
                  modificaciones no autorizadas.
                </p>

                <ul className="evo-guard-steps">
                  {steps.map((step) => (
                    <li key={step.id} className={`evo-guard-step evo-guard-step--${step.status}`}>
                      <span className="evo-guard-step-icon" aria-hidden>
                        {step.status === 'done' && <Check size={16} strokeWidth={3} />}
                        {step.status === 'active' && <Loader2 size={16} className="evo-guard-spin" />}
                        {step.status === 'pending' && <span className="evo-guard-dot" />}
                      </span>
                      <span className="evo-guard-step-label">{step.label}</span>
                      <span className="evo-guard-step-status">{statusLabel(step.status)}</span>
                    </li>
                  ))}
                </ul>

                {phase === 'launching' && (
                  <p className="evo-guard-launching">Protección lista. Iniciando Combat Arms Evolution…</p>
                )}
              </>
            )}

            {nav === 'security' && (
              <div className="evo-guard-panel">
                <h2>Seguridad</h2>
                <p>
                  Evolution Guard verifica integridad del cliente, procesos del sistema y la sesión
                  antes de permitir el acceso al lobby.
                </p>
              </div>
            )}

            {nav === 'settings' && (
              <div className="evo-guard-panel">
                <h2>Configuración</h2>
                <p>El monitoreo se ejecuta automáticamente al iniciar el juego. No requiere ajustes.</p>
              </div>
            )}

            {nav === 'about' && (
              <div className="evo-guard-panel">
                <h2>Acerca de</h2>
                <p>
                  CA Evolution Guard · v1.0.0 — capa de protección del launcher Combat Arms Evolution
                  (NxB).
                </p>
              </div>
            )}

            <footer className="evo-guard-foot">
              <Shield size={14} />
              <span>CA Evolution Guard — Seguridad en cada partida</span>
              <small>v1.0.0</small>
            </footer>
          </main>

          <aside className="evo-guard-art">
            <img src="/caevo/hero.jpg" alt="" />
            <div className="evo-guard-art-fade" />
            <div className="evo-guard-art-copy">
              <strong>COMBAT ARMS</strong>
              <span>EVOLUTION</span>
            </div>
            <div className="evo-guard-detected">
              <Gamepad2 size={16} />
              <div>
                <small>GAME DETECTED</small>
                <b>Combat Arms Evolution</b>
              </div>
            </div>
          </aside>
        </div>

        <div className="evo-guard-status" aria-live="polite">
          <span className="evo-guard-bars" aria-hidden />
          GUARD MONITORING
        </div>
      </div>
    </div>
  );
}
