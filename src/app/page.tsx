'use client';

import { useEffect, useRef, useState } from 'react';

export default function Portfolio() {
  const dotRef  = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const [lbxIdx, setLbxIdx] = useState<number | null>(null);

  const works = [
    { num:'01', tag:'Portrait',   name:'Light Through Stone', year:'Photography — 2023', src:'/images/portrait-window.jpg',  alt:'Portrait in Gothic window niche, backlit' },
    { num:'02', tag:'Group',      name:'Class of \'23',       year:'Event — 2023',       src:'/images/group-arch.jpg',       alt:'Group portrait under Cornell arch' },
    { num:'03', tag:'Portrait',   name:'Golden Hour',         year:'Photography — 2023', src:'/images/golden-hour.jpg',     alt:'Couple portrait at golden hour' },
    { num:'04', tag:'Event',      name:'Celebration',         year:'Event — 2021',       src:'/images/celebration.jpg',     alt:'Graduation celebration at McGraw Tower' },
    { num:'05', tag:'Portrait',   name:'Gothic Light',        year:'Photography — 2023', src:'/images/gothic-arch.jpg',      alt:'Portrait framed in Gothic arch at Cornell' },
    { num:'06', tag:'Event',      name:'The Toast',           year:'Event — 2023',       src:'/images/champagne-toast.jpg',  alt:'Group champagne toast under Gothic arch' },
    { num:'07', tag:'Portrait',   name:'McGraw Hour',         year:'Photography — 2023', src:'/images/mcgraw-tower.jpg',     alt:'Portrait at McGraw Tower during golden hour' },
    { num:'08', tag:'Portrait',   name:'Stone Corridor',      year:'Photography — 2023', src:'/images/arch-corridor.jpg',    alt:'Portrait under Gothic arch corridor at Cornell' },
    { num:'09', tag:'Portrait',   name:'Golden Stole',        year:'Photography — 2023', src:'/images/golden-stole.jpg',     alt:'Graduate in golden stole at sunset' },
    { num:'10', tag:'Portrait',   name:'Spring Light',        year:'Photography — 2023', src:'/images/mcgraw-duo.jpg',       alt:'Two graduates at McGraw Tower with spring foliage' },
    { num:'11', tag:'Portrait',   name:'Warm Stone',          year:'Photography — 2023', src:'/images/duo-stone.jpg',        alt:'Two graduates on stone ledge at golden hour' },
    { num:'12', tag:'Portrait',   name:'Last Light',          year:'Photography — 2023', src:'/images/sunset-portrait.jpg',  alt:'Graduate portrait at sunset against Cornell stone' },
    { num:'13', tag:'Event',      name:'Blue Hour',           year:'Event — 2026',       src:'/images/blue-hour.jpg',         alt:'Group portrait against blue backdrop' },
    { num:'14', tag:'Event',      name:'929',                 year:'Event — 2026',       src:'/images/jazz-vocalist.jpg',     alt:'Jazz vocalist performing at 929 NYC' },
    { num:'15', tag:'Editorial',  name:'The Room',            year:'Event — 2026',       src:'/images/jazz-bar.jpg',          alt:'Jazz bar ambiance, candlelit table' },
    { num:'16', tag:'Portrait',   name:'Harvest',             year:'Photography — 2026', src:'/images/apple-juggle.jpg',      alt:'Portrait in apple orchard, Fishkill Farms' },
  ];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      setLbxIdx(prev => {
        if (prev === null) return null;
        if (e.key === 'Escape') return null;
        if (e.key === 'ArrowRight') return (prev + 1) % works.length;
        if (e.key === 'ArrowLeft')  return (prev - 1 + works.length) % works.length;
        return prev;
      });
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const dot  = dotRef.current;
    const ring = ringRef.current;
    if (!dot || !ring) return;

    let mx = window.innerWidth / 2, my = window.innerHeight / 2;
    let rx = mx, ry = my;
    let rafId: number;

    const onMove  = (e: MouseEvent) => { mx = e.clientX; my = e.clientY; };
    const onLeave = () => { dot!.style.opacity = '0'; ring!.style.opacity = '0'; };
    const onEnter = () => { dot!.style.opacity = '1'; ring!.style.opacity = '1'; };

    function loop() {
      dot!.style.left = mx + 'px';
      dot!.style.top  = my + 'px';
      rx += (mx - rx) * 0.07;
      ry += (my - ry) * 0.07;
      ring!.style.left = rx + 'px';
      ring!.style.top  = ry + 'px';
      rafId = requestAnimationFrame(loop);
    }
    loop();

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseleave', onLeave);
    document.addEventListener('mouseenter', onEnter);

    function addHover(selector: string, cls: string) {
      document.querySelectorAll(selector).forEach(el => {
        el.addEventListener('mouseenter', () => document.body.classList.add(cls));
        el.addEventListener('mouseleave', () => document.body.classList.remove(cls));
      });
    }
    addHover('a, .n-badge, .svc-item', 'c-link');
    addHover('.wi', 'c-work');

    const nav = document.getElementById('nav');
    const onScroll = () => nav?.classList.toggle('on', window.scrollY > 55);
    window.addEventListener('scroll', onScroll, { passive: true });

    const emailEl = document.querySelector('.ct-email') as HTMLElement | null;
    const onEmailClick = () => {
      navigator.clipboard.writeText('rtwong02@gmail.com').then(() => {
        if (!emailEl) return;
        const orig = emailEl.textContent;
        emailEl.textContent = 'Copied!';
        setTimeout(() => { if (emailEl) emailEl.textContent = orig; }, 1800);
      }).catch(() => {});
    };
    emailEl?.addEventListener('click', onEmailClick);

    return () => {
      cancelAnimationFrame(rafId);
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseleave', onLeave);
      document.removeEventListener('mouseenter', onEnter);
      window.removeEventListener('scroll', onScroll);
      emailEl?.removeEventListener('click', onEmailClick);
    };
  }, []);

  return (
    <>
      {/* ── CURSOR ───────────────────────────────────────────────────────── */}
      <div ref={dotRef}  id="c-dot"  aria-hidden="true" />
      <div ref={ringRef} id="c-ring" aria-hidden="true" />

      {/* ── NAV ──────────────────────────────────────────────────────────── */}
      <nav id="nav" role="navigation" aria-label="Main">
        <a className="n-logo" href="#" aria-label="Ryan Wong — home">R.W</a>
        <ul className="n-links" role="list">
          <li><a href="#work">Work</a></li>
          <li><a href="#services">Services</a></li>
          <li><a href="#contact">Contact</a></li>
        </ul>
        <div className="n-badge" aria-label="Currently available for work">
          <div className="n-dot" />Available
        </div>
      </nav>

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <section className="hero" aria-labelledby="hero-name">
        <div className="hero-bg" aria-hidden="true" />
        <div className="h-count" aria-label="24 selected works">
          <div className="h-count-n">24</div>
          <div className="h-count-l">Selected Works</div>
        </div>
        <div className="hero-inner">
          <p className="h-eyebrow" aria-hidden="true">Portfolio &mdash; 2024</p>
          <h1 className="h-name" id="hero-name">
            <span className="h-n1">RYAN</span>
            <span className="h-n2">WONG</span>
          </h1>
          <div className="h-foot">
            <p className="h-sub">
              Photography &amp; Cinematography<br />
              New York, New York
            </p>
            <div className="h-scroll" aria-hidden="true">
              <span className="h-scroll-lbl">Scroll</span>
              <div className="h-scroll-line" />
            </div>
          </div>
        </div>
      </section>

      {/* ── MARQUEE ──────────────────────────────────────────────────────── */}
      <div className="marquee" aria-hidden="true">
        <div className="marquee-track">
          {['Photography','Cinematography','Editorial','Portrait','Commercial','Documentary','Short Film',
            'Photography','Cinematography','Editorial','Portrait','Commercial','Documentary','Short Film'].map((t, i) => (
            <div className="mq-item" key={i}>
              <span>{t}</span><div className="mq-sep" />
            </div>
          ))}
        </div>
      </div>

      {/* ── WORK ─────────────────────────────────────────────────────────── */}
      <section className="work" id="work" aria-labelledby="work-title">
        <div className="s-head">
          <h2 className="s-title" id="work-title">Selected Work</h2>
          <span className="s-meta">2022&ndash;2024</span>
        </div>
        <div className="wgrid" role="list">
          {works.map(({ num, tag, name, year, src, alt }, i) => (
            <article
              className="wi"
              role="listitem"
              tabIndex={0}
              aria-label={`${name} — ${year}`}
              key={num}
              onClick={() => setLbxIdx(i)}
              onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setLbxIdx(i); } }}
            >
              <img className="wi-img" src={src} alt={alt} loading="lazy" />
              <div className="wi-shade" />
              <span className="wi-num" aria-hidden="true">{num}</span>
              <span className="wi-tag">{tag}</span>
              <div className="wi-info">
                <div className="wi-name">{name}</div>
                <div className="wi-year">{year}</div>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* ── SERVICES ─────────────────────────────────────────────────────── */}
      <section className="services" id="services" aria-labelledby="svc-title">
        <div className="s-head">
        </div>
        <ul className="svc-list" role="list">
          {[
            ['01','Photography'],
            ['02','Cinematography'],
            ['03','Editorial'],
            ['04','Commercial Film'],
          ].map(([n, name]) => (
            <li className="svc-item" key={n}>
              <span className="svc-n">{n}</span>
              <span className="svc-name">{name}</span>
              <span className="svc-arr" aria-hidden="true">→</span>
            </li>
          ))}
        </ul>
      </section>

      {/* ── LIGHTBOX ─────────────────────────────────────────────────────── */}
      {lbxIdx !== null && (() => {
        const w = works[lbxIdx];
        return (
          <div
            className="lbx"
            role="dialog"
            aria-modal="true"
            aria-label={w.name}
            onClick={() => setLbxIdx(null)}
          >
            <span className="lbx-counter">{String(lbxIdx + 1).padStart(2,'0')} / {String(works.length).padStart(2,'0')}</span>
            <button className="lbx-close" onClick={() => setLbxIdx(null)} aria-label="Close lightbox">✕</button>
            <button className="lbx-nav lbx-prev" onClick={e => { e.stopPropagation(); setLbxIdx((lbxIdx - 1 + works.length) % works.length); }} aria-label="Previous">←</button>
            <img
              className="lbx-img"
              src={w.src}
              alt={w.alt}
              onClick={e => e.stopPropagation()}
            />
            <button className="lbx-nav lbx-next" onClick={e => { e.stopPropagation(); setLbxIdx((lbxIdx + 1) % works.length); }} aria-label="Next">→</button>
            <div className="lbx-meta" onClick={e => e.stopPropagation()}>
              <div className="lbx-name">{w.name}</div>
              <div className="lbx-year">{w.year}</div>
            </div>
          </div>
        );
      })()}

      {/* ── CONTACT ──────────────────────────────────────────────────────── */}
      <section className="contact" id="contact" aria-labelledby="ct-heading">
        <p className="ct-eyebrow">Get in touch</p>
        <div className="ct-big" id="ct-heading">
          <span>Let&rsquo;s</span>
          <span className="ct-italic">Work.</span>
        </div>
        <div className="ct-foot">
          <span className="ct-email" role="button" tabIndex={0} title="Click to copy email">
            rtwong02@gmail.com
          </span>
          <span className="ct-copy">&copy; 2024 Ryan Wong</span>
        </div>
      </section>
    </>
  );
}
