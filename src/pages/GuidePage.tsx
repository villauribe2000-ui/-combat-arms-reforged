import { useEffect, useRef, useState } from 'react';
import {
  BookOpen, ChevronDown, Crosshair, Medal, MousePointer2, Search, Shield, ShoppingBag, Swords, X,
} from 'lucide-react';
import {
  EMPORIUM, HUD_IMAGE, HUD_NOTES, KEYBOARD_GROUPS, MEDALS, MISSIONS, MODE_ICONS, MOUSE_CONTROLS, RANK_GROUPS,
  type GuideImage,
} from '@/data/guideContent';

const TABS = [
  { id: 'interface-controls', label: 'Interface & Controls', icon: Crosshair },
  { id: 'achievement', label: 'Achievement', icon: Medal },
  { id: 'the-emporium', label: 'The Emporium', icon: ShoppingBag },
  { id: 'missions', label: 'Missions', icon: Swords },
  { id: 'rank', label: 'Rank', icon: Shield },
] as const;

type TabId = (typeof TABS)[number]['id'];

function Picture({ image, onOpen, eager = false }: { image: GuideImage; onOpen: (img: GuideImage) => void; eager?: boolean }) {
  return (
    <button className="guide-picture" type="button" onClick={() => onOpen(image)} aria-label={`Enlarge ${image.alt}`}>
      <img src={image.src} alt={image.alt} width={image.width} height={image.height} loading={eager ? 'eager' : 'lazy'} decoding="async" />
      <span className="guide-picture-zoom" aria-hidden="true">
        <Search className="h-3.5 w-3.5" /> Enlarge
      </span>
    </button>
  );
}

export default function GuidePage() {
  const [tab, setTab] = useState<TabId>('interface-controls');
  const [preview, setPreview] = useState<GuideImage | null>(null);
  const [query, setQuery] = useState('');
  const dialogRef = useRef<HTMLDialogElement>(null);
  const filtered = MISSIONS.filter(m => m.title.toLowerCase().includes(query.trim().toLowerCase()));

  useEffect(() => {
    const d = dialogRef.current;
    if (preview && d && !d.open) d.showModal();
    if (!preview && d?.open) d.close();
  }, [preview]);

  useEffect(() => {
    if (!preview) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [preview]);

  return (
    <div className="inner-page page-width guide-page">
      <header className="page-heading">
        <div>
          <p className="eyebrow"><span className="tiny-square" /> KNOW YOUR BATTLEFIELD</p>
          <h1>GAME GUIDE.</h1>
          <p className="page-heading-description">Learn the controls. Know your equipment. Make every match count.</p>
        </div>
        <div className="page-heading-aside">
          <span className="preview-badge">
            <BookOpen className="h-4 w-4" /> CLASSIC FIELD MANUAL
          </span>
        </div>
      </header>

      <div className="guide-tabs" role="tablist" aria-label="Guide sections">
        {TABS.map(item => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              id={`guide-tab-${item.id}`}
              role="tab"
              type="button"
              aria-selected={tab === item.id}
              aria-controls={`guide-panel-${item.id}`}
              onClick={() => setTab(item.id)}
            >
              <Icon size={18} aria-hidden />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      {tab === 'interface-controls' && (
        <section className="guide-panel" id="guide-panel-interface-controls" role="tabpanel">
          <div className="guide-section-title">
            <span>01 / THE BASICS</span>
            <h2>YOUR INTERFACE, DECODED.</h2>
            <p>The numbers in the screenshot match the notes below. Select any illustration for a closer look.</p>
          </div>
          <div className="guide-hud guide-card">
            <Picture eager image={HUD_IMAGE} onOpen={setPreview} />
            <ol className="guide-hud-legend">
              {HUD_NOTES.map(([title, desc], i) => (
                <li key={title}>
                  <span>{String(i + 1).padStart(2, '0')}</span>
                  <div>
                    <h3>{title}</h3>
                    <p>{desc}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
          <div className="guide-section-title">
            <span>02 / AIM & FIRE</span>
            <h2>MOUSE CONTROLS</h2>
          </div>
          <div className="guide-mouse-grid">
            {MOUSE_CONTROLS.map(([title, desc, file]) => (
              <article key={file} className="guide-mouse-card guide-card">
                <img src={`/caevo/guide/${file}`} alt={`${title}: ${desc}`} width={183} height={200} loading="lazy" />
                <div>
                  <MousePointer2 size={16} aria-hidden />
                  <h3>{title}</h3>
                  <p>{desc}</p>
                </div>
              </article>
            ))}
          </div>
          <div className="guide-section-title">
            <span>03 / TAKE CONTROL</span>
            <h2>KEYBOARD CONTROLS</h2>
            <p>Default Classic bindings. Check the in-game settings if you have customized your controls.</p>
          </div>
          <div className="guide-controls-grid">
            {KEYBOARD_GROUPS.map(group => (
              <article key={group.title} className="guide-controls-card guide-card">
                <h3>{group.title}</h3>
                <Picture image={group.image} onOpen={setPreview} />
                <dl className="guide-key-list">
                  {group.bindings.map(([key, action]) => (
                    <div key={key}>
                      <dt><kbd>{key}</kbd></dt>
                      <dd>{action}</dd>
                    </div>
                  ))}
                </dl>
              </article>
            ))}
          </div>
        </section>
      )}

      {tab === 'achievement' && (
        <section className="guide-panel" role="tabpanel">
          <div className="guide-section-title">
            <span>YOUR RECORD OF SERVICE</span>
            <h2>BUILD YOUR MEDAL COLLECTION.</h2>
            <p>Achievements recognize milestones in combat, teamwork, and play time. Find your medals in the in-game Player Profile.</p>
          </div>
          <div className="guide-achievement-grid">
            {MEDALS.map(m => (
              <article key={m.id} className="guide-achievement guide-card">
                <div className="guide-achievement-title">
                  <img src={m.image.src} alt={m.image.alt} width={m.image.width} height={m.image.height} loading="lazy" />
                  <h3>{m.title}</h3>
                </div>
                <details>
                  <summary>Requirements <ChevronDown size={16} aria-hidden /></summary>
                  <ul>{m.requirements.map(r => <li key={r}>{r}</li>)}</ul>
                </details>
              </article>
            ))}
          </div>
        </section>
      )}

      {tab === 'the-emporium' && (
        <section className="guide-panel" role="tabpanel">
          <div className="guide-section-title">
            <span>BUILD YOUR LOADOUT</span>
            <h2>THE EMPORIUM</h2>
            <p>Explore the shop, crafting, and weapon customization systems.</p>
          </div>
          <div className="guide-chapter-list">
            {EMPORIUM.map((chapter, i) => (
              <article key={chapter.id} className="guide-chapter guide-card">
                <div className="guide-chapter-copy">
                  <span className="guide-chapter-number">{String(i + 1).padStart(2, '0')}</span>
                  <h3>{chapter.title}</h3>
                  <p>{chapter.summary}</p>
                  {chapter.steps.length > 0 && <ul>{chapter.steps.map(s => <li key={s}>{s}</li>)}</ul>}
                </div>
                <div className="guide-gallery">
                  {chapter.images.map(image => <Picture key={image.src} image={image} onOpen={setPreview} />)}
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {tab === 'missions' && (
        <section className="guide-panel" role="tabpanel">
          <div className="guide-section-title">
            <span>CHOOSE YOUR OBJECTIVE</span>
            <h2>GAME MODES</h2>
            <p>Find your next match. Explore team battles, solo challenges, and cooperative operations.</p>
          </div>
          <div className="guide-mode-toolbar">
            <label className="guide-mode-search">
              <Search size={18} aria-hidden />
              <input type="search" aria-label="Search game modes" placeholder="Search game modes..." value={query} onChange={e => setQuery(e.target.value)} />
              {query && (
                <button type="button" aria-label="Clear game mode search" onClick={() => setQuery('')}>
                  <X size={16} />
                </button>
              )}
            </label>
            <p role="status">{query.trim() ? `${filtered.length} of ${MISSIONS.length} modes` : `${MISSIONS.length} game modes`}</p>
          </div>
          <div className="guide-mission-list">
            {filtered.map(mission => (
              <details key={mission.id} className="guide-mission guide-card">
                <summary>
                  <span className="guide-chapter-number" aria-hidden>
                    {MODE_ICONS[mission.id]
                      ? <img src={MODE_ICONS[mission.id]} width={100} height={100} alt="" loading="lazy" />
                      : <Swords size={24} />}
                  </span>
                  <span><h3>{mission.title}</h3></span>
                  <ChevronDown size={20} aria-hidden />
                </summary>
                <div className="guide-mission-body">
                  <p className="guide-mission-intro">{mission.summary}</p>
                  {mission.steps.length > 0 && <ul>{mission.steps.map(s => <li key={s}>{s}</li>)}</ul>}
                  <div className="guide-gallery">
                    {mission.images.map(image => <Picture key={image.src} image={image} onOpen={setPreview} />)}
                  </div>
                </div>
              </details>
            ))}
          </div>
          {filtered.length === 0 && (
            <div className="guide-mode-empty guide-card">
              <Search size={26} aria-hidden />
              <h3>No matching game modes</h3>
              <p>Try a name such as Elimination, VIP, or Fireteam.</p>
              <button type="button" onClick={() => setQuery('')}>Show all game modes</button>
            </div>
          )}
        </section>
      )}

      {tab === 'rank' && (
        <section className="guide-panel" role="tabpanel">
          <div className="guide-section-title">
            <span>RECOGNIZE THE INSIGNIA</span>
            <h2>FROM RECRUIT TO COMMANDER.</h2>
            <p>Explore the ranks and insignia, from your first match through Commander in Chief V.</p>
          </div>
          <div className="guide-rank-groups">
            {RANK_GROUPS.map((group, i) => (
              <article key={group.title} className="guide-rank-group guide-card">
                <header>
                  <Shield size={20} aria-hidden />
                  <h3>{group.title}</h3>
                  <span>{String(i + 1).padStart(2, '0')}</span>
                </header>
                <ul>
                  {group.ranks.map(r => (
                    <li key={r.name}>
                      <div>
                        <span className="guide-rank-code">{r.abbreviation}</span>
                        <h4>{r.name}</h4>
                      </div>
                      <div className="guide-insignia">
                        {r.images.map((image, t) => (
                          <img
                            key={image.src}
                            src={image.src}
                            alt={`${r.name}${r.images.length > 1 ? `, tier ${t + 1}` : ''}`}
                            title={r.images.length > 1 ? `${r.abbreviation} ${t + 1}` : r.abbreviation}
                            width={image.width}
                            height={image.height}
                            loading="lazy"
                          />
                        ))}
                      </div>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </section>
      )}

      <dialog
        ref={dialogRef}
        className="guide-image-dialog"
        aria-label={preview ? preview.alt : 'Guide image preview'}
        onCancel={() => setPreview(null)}
        onClose={() => setPreview(null)}
        onClick={e => { if (e.target === e.currentTarget) setPreview(null); }}
      >
        {preview && (
          <div className="guide-image-dialog-content">
            <header>
              <p>{preview.alt}</p>
              <button type="button" aria-label="Close image preview" onClick={() => setPreview(null)}>
                <X size={22} />
              </button>
            </header>
            <img src={preview.src} alt={preview.alt} width={preview.width} height={preview.height} />
          </div>
        )}
      </dialog>
    </div>
  );
}
