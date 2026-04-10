'use client';

import { useAppStore } from '@/hooks/useAppStore';
import { fmtFull, TODAY } from '@/lib/helpers';

export default function Header() {
  const { projects, currentProject, setCurrentProject, searchQuery, setSearchQuery, setModalOpen } = useAppStore();
  const projectKeys = Object.keys(projects);
  const proj = projects[currentProject];

  return (
    <header className="header">
      <button
        className="btn-menu"
        id="btnMenu"
        title="Menu"
        onClick={() => {
          document.getElementById('sidebar')?.classList.toggle('open');
          document.getElementById('sidebarOverlay')?.classList.toggle('open');
        }}
      >
        &#9776;
      </button>
      <div className="header-project">
        <select
          id="projectSelect"
          value={currentProject}
          onChange={(e) => setCurrentProject(e.target.value)}
        >
          {projectKeys.map((key) => (
            <option key={key} value={key}>
              {projects[key].name}
            </option>
          ))}
        </select>
      </div>
      <div className="header-search">
        <input
          type="text"
          placeholder="Search activities, trades, areas…"
          id="globalSearch"
          autoComplete="off"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <button className="voice-btn" id="voiceSearchBtn" title="Voice search">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
            <line x1="12" y1="19" x2="12" y2="23" />
            <line x1="8" y1="23" x2="16" y2="23" />
          </svg>
        </button>
        <div className="search-results-dropdown" id="searchDropdown" />
      </div>
      <div className="header-right">
        <span className="header-weather" id="headerWeather" title="Weather advisory">
          {proj?.weather || 'Loading weather...'}
        </span>
        <span className="header-date" id="headerDate">
          {fmtFull(TODAY)}
        </span>
        <button className="btn-primary" onClick={() => setModalOpen(true)}>
          + Activity
        </button>
      </div>
    </header>
  );
}
