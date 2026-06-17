import React, { useEffect, useMemo, useState } from 'react';
import { Activity, BookOpen, ExternalLink, Globe2, Loader2, Search, ShieldAlert } from 'lucide-react';
import { plantDatabase } from '../data/plantdatabase';

const fallbackColors = [
  ['#1d4a34', '#9caf5d'],
  ['#2f6b4c', '#d49a32'],
  ['#647a38', '#f3ecd8'],
  ['#123524', '#8bac56'],
];

const createPlantFallback = (plant) => {
  const colorPair = fallbackColors[
    plant.id.replace(/\D/g, '') % fallbackColors.length
  ];
  const initials = plant.commonName
    .split(/[ (]/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase();

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 360" role="img" aria-label="${plant.imageAlt}">
      <defs>
        <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stop-color="${colorPair[0]}"/>
          <stop offset="1" stop-color="${colorPair[1]}"/>
        </linearGradient>
      </defs>
      <rect width="600" height="360" fill="url(#bg)"/>
      <circle cx="460" cy="86" r="86" fill="#fffdf7" opacity=".14"/>
      <path d="M300 262 C238 202 238 126 300 76 C362 126 362 202 300 262Z" fill="#fffdf7" opacity=".78"/>
      <path d="M300 262 C300 190 300 130 300 76" stroke="#1d4a34" stroke-width="10" stroke-linecap="round" opacity=".45"/>
      <path d="M286 190 C226 152 164 152 118 194 C178 222 238 220 286 190Z" fill="#e8f4df" opacity=".86"/>
      <path d="M314 190 C374 152 436 152 482 194 C422 222 362 220 314 190Z" fill="#e8f4df" opacity=".86"/>
      <text x="300" y="302" text-anchor="middle" font-family="Arial, sans-serif" font-size="54" font-weight="700" fill="#fffdf7">${initials}</text>
    </svg>
  `;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
};

const createCompleteSummary = (text, maxSentences = 3) => {
  const sentences = text
    .replace(/\s+/g, ' ')
    .match(/[^.!?]+[.!?]+/g);

  if (!sentences) {
    return text.replace(/\s+/g, ' ').trim();
  }

  return sentences.slice(0, maxSentences).join(' ').trim();
};

const fetchOnlinePlants = async (searchTerm, signal) => {
  const params = new URLSearchParams({
    action: 'query',
    generator: 'search',
    gsrsearch: `${searchTerm} plant`,
    gsrlimit: '4',
    prop: 'extracts|pageimages|info',
    exintro: '1',
    explaintext: '1',
    piprop: 'thumbnail',
    pithumbsize: '500',
    inprop: 'url',
    redirects: '1',
    format: 'json',
    origin: '*',
  });

  const response = await fetch(`https://en.wikipedia.org/w/api.php?${params.toString()}`, { signal });

  if (!response.ok) {
    throw new Error('Online plant search failed.');
  }

  const data = await response.json();
  const pages = Object.values(data?.query?.pages || {});

  return pages
    .filter((page) => page?.title && page?.extract)
    .map((page) => ({
      id: `wiki-${page.pageid}`,
      commonName: page.title,
      scientificName: '',
      family: 'Online source',
      description: createCompleteSummary(page.extract),
      imageUrl: page.thumbnail?.source || '',
      imageAlt: `${page.title} plant image`,
      url: page.fullurl,
    }));
};

export default function PlantLibrary() {
  const [query, setQuery] = useState('');
  const [selectedSystem, setSelectedSystem] = useState('All systems');
  const [onlinePlants, setOnlinePlants] = useState([]);
  const [isOnlineSearchLoading, setIsOnlineSearchLoading] = useState(false);
  const [onlineSearchError, setOnlineSearchError] = useState('');

  const systems = useMemo(() => {
    const allSystems = plantDatabase.flatMap((plant) => plant.ayushSystems);
    return ['All systems', ...Array.from(new Set(allSystems)).sort()];
  }, []);

  const filteredPlants = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return plantDatabase.filter((plant) => {
      const matchesSystem =
        selectedSystem === 'All systems' || plant.ayushSystems.includes(selectedSystem);

      const searchableText = [
        plant.commonName,
        plant.scientificName,
        plant.family,
        plant.description,
        ...plant.ayushSystems,
        ...plant.uses,
        ...plant.precautions,
        ...plant.activeCompounds,
        ...plant.similarPlants,
      ].join(' ').toLowerCase();

      return matchesSystem && (!normalizedQuery || searchableText.includes(normalizedQuery));
    });
  }, [query, selectedSystem]);

  useEffect(() => {
    const normalizedQuery = query.trim();

    setOnlinePlants([]);
    setOnlineSearchError('');

    if (
      normalizedQuery.length < 3 ||
      selectedSystem !== 'All systems' ||
      filteredPlants.length > 0
    ) {
      setIsOnlineSearchLoading(false);
      return undefined;
    }

    const controller = new AbortController();
    const timeoutId = window.setTimeout(async () => {
      setIsOnlineSearchLoading(true);

      try {
        const results = await fetchOnlinePlants(normalizedQuery, controller.signal);
        setOnlinePlants(results);
        setOnlineSearchError(results.length === 0 ? 'No online plant result found. Try a more specific plant name.' : '');
      } catch (error) {
        if (error.name !== 'AbortError') {
          setOnlineSearchError('Could not reach online plant sources. Check your internet connection and try again.');
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsOnlineSearchLoading(false);
        }
      }
    }, 450);

    return () => {
      controller.abort();
      window.clearTimeout(timeoutId);
    };
  }, [query, selectedSystem, filteredPlants.length]);

  const hasResults = filteredPlants.length > 0 || onlinePlants.length > 0;

  return (
    <section className="content-panel">
      <div className="library-toolbar">
        <label className="search-field">
          <Search className="w-5 h-5" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search any plant name..."
          />
        </label>

        <select
          className="system-select"
          value={selectedSystem}
          onChange={(event) => setSelectedSystem(event.target.value)}
        >
          {systems.map((system) => (
            <option key={system}>{system}</option>
          ))}
        </select>
      </div>

      <div className="plant-grid">
        {filteredPlants.map((plant) => (
          <article className="plant-card" key={plant.id}>
            <figure className="plant-photo-frame">
              <img
                src={plant.imageUrl || createPlantFallback(plant)}
                alt={plant.imageAlt}
                loading="lazy"
                onError={(event) => {
                  event.currentTarget.onerror = null;
                  event.currentTarget.src = createPlantFallback(plant);
                }}
              />
            </figure>

            <div className="plant-card-header">
              <div>
                <h3>{plant.commonName}</h3>
                <p><em>{plant.scientificName}</em></p>
              </div>
              <span>{plant.family}</span>
            </div>

            <p className="plant-description">{plant.description}</p>

            <div className="tag-row">
              {plant.ayushSystems.map((system) => (
                <span className="tag tag-blue" key={system}>{system}</span>
              ))}
            </div>

            <div className="plant-info-grid">
              <div>
                <h4><Activity className="w-4 h-4" /> Uses</h4>
                <p>{plant.uses.join(', ')}</p>
              </div>
              <div>
                <h4><BookOpen className="w-4 h-4" /> Compounds</h4>
                <p>{plant.activeCompounds.join(', ')}</p>
              </div>
              <div className="warning-block">
                <h4><ShieldAlert className="w-4 h-4" /> Precautions</h4>
                <p>{plant.precautions.join(' ')}</p>
              </div>
            </div>
          </article>
        ))}

        {onlinePlants.map((plant) => (
          <article className="plant-card online-plant-card" key={plant.id}>
            <figure className="plant-photo-frame">
              <img
                src={plant.imageUrl || createPlantFallback(plant)}
                alt={plant.imageAlt}
                loading="lazy"
                onError={(event) => {
                  event.currentTarget.onerror = null;
                  event.currentTarget.src = createPlantFallback(plant);
                }}
              />
            </figure>

            <div className="plant-card-header">
              <div>
                <h3>{plant.commonName}</h3>
                <p>Online plant result</p>
              </div>
              <span>{plant.family}</span>
            </div>

            <p className="plant-description">{plant.description}</p>

            <div className="tag-row">
              <span className="tag tag-blue">Wikipedia</span>
              <span className="tag tag-green">Open source</span>
            </div>

            <div className="plant-info-grid">
              <div>
                <h4><Globe2 className="w-4 h-4" /> Source</h4>
                <p>This result comes from an online open source and is summarized into a short answer.</p>
              </div>
            </div>

            {plant.url && (
              <a className="secondary-action online-source-link" href={plant.url} target="_blank" rel="noreferrer">
                <ExternalLink className="w-4 h-4" />
                Read source
              </a>
            )}
          </article>
        ))}
      </div>

      {isOnlineSearchLoading && (
        <div className="empty-state online-search-state">
          <Loader2 className="w-12 h-12 animate-spin" />
          <h3>Searching online plant sources</h3>
          <p>Looking for a relevant plant result for “{query.trim()}”.</p>
        </div>
      )}

      {!isOnlineSearchLoading && !hasResults && (
        <div className="empty-state">
          <BookOpen className="w-12 h-12" />
          <h3>No plants found</h3>
          <p>{onlineSearchError || 'Try a different plant name, compound, use, or AYUSH system.'}</p>
        </div>
      )}
    </section>
  );
}
