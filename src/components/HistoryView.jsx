import React from 'react';
import { BookOpen, Clock, Droplets, Leaf, RotateCcw, ScanLine, Sprout, Trash2 } from 'lucide-react';

const formatDate = (dateString) =>
  new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(dateString));

const asList = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean);

  return [value];
};

const HistoryDetailBlock = ({ icon: Icon, title, children }) => (
  <section className="history-detail-block">
    <h4>
      <Icon className="w-4 h-4" />
      {title}
    </h4>
    {children}
  </section>
);

export default function HistoryView({ scans, onClearHistory, onScanAgain }) {
  if (scans.length === 0) {
    return (
      <section className="content-panel">
        <div className="empty-state">
          <Clock className="w-12 h-12" />
          <h3>No scan history yet</h3>
          <p>Scan a plant first, then your recent results will appear here.</p>
          <button type="button" className="primary-action" onClick={onScanAgain}>
            <ScanLine className="w-4 h-4" />
            <span>Start scanning</span>
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="content-panel">
      <div className="section-actions">
        <p>{scans.length} recent scan{scans.length === 1 ? '' : 's'} saved on this device.</p>
        <button type="button" className="secondary-action danger-action" onClick={onClearHistory}>
          <Trash2 className="w-4 h-4" />
          <span>Clear history</span>
        </button>
      </div>

      <div className="history-list">
        {scans.map((scan) => {
          const plant = scan.plantData;
          const commonNames = asList(plant.commonNames);
          const synonyms = asList(plant.synonyms).slice(0, 6);
          const edibleParts = asList(plant.edibleParts);
          const propagationMethods = asList(plant.propagationMethods);
          const taxonomyEntries = Object.entries(plant.taxonomy || {}).filter(([, value]) => value);
          const historyImage = scan.imagePreview || plant.imageUrl;

          return (
            <article className="history-item" key={scan.id}>
              <div className="history-summary">
                {historyImage && (
                  <img
                    className="history-photo"
                    src={historyImage}
                    alt={`${plant.commonName} scan`}
                  />
                )}

                <div className="history-heading">
                  <span className="match-pill">{scan.confidenceScore}% Match</span>
                  <h3>{plant.commonName}</h3>
                  <p><em>{plant.scientificName}</em></p>
                  <p className="history-meta">{formatDate(scan.scannedAt)}</p>
                </div>
              </div>

              <div className="history-detail">
                <p>{plant.description || 'Plant.id scan result'}</p>

                <div className="history-detail-grid">
                  <HistoryDetailBlock icon={Leaf} title="Names">
                    <p><strong>Scientific name:</strong> {plant.scientificName}</p>
                    {commonNames.length > 0 && <p><strong>Common names:</strong> {commonNames.join(', ')}</p>}
                    {synonyms.length > 0 && <p><strong>Synonyms:</strong> {synonyms.join(', ')}</p>}
                  </HistoryDetailBlock>

                  {taxonomyEntries.length > 0 && (
                    <HistoryDetailBlock icon={BookOpen} title="Taxonomy">
                      <dl className="history-taxonomy-list">
                        {taxonomyEntries.map(([key, value]) => (
                          <div key={key}>
                            <dt>{key}</dt>
                            <dd>{value}</dd>
                          </div>
                        ))}
                      </dl>
                    </HistoryDetailBlock>
                  )}

                  {(edibleParts.length > 0 || plant.watering) && (
                    <HistoryDetailBlock icon={Droplets} title="Care & Edibility">
                      {plant.watering && <p><strong>Watering:</strong> {plant.watering}</p>}
                      {edibleParts.length > 0 && <p><strong>Edible parts:</strong> {edibleParts.join(', ')}</p>}
                    </HistoryDetailBlock>
                  )}

                  {propagationMethods.length > 0 && (
                    <HistoryDetailBlock icon={Sprout} title="Propagation">
                      <p>{propagationMethods.join(', ')}</p>
                    </HistoryDetailBlock>
                  )}
                </div>
              </div>
            </article>
          );
        })}
      </div>

      <button type="button" className="primary-action history-scan-button" onClick={onScanAgain}>
        <RotateCcw className="w-4 h-4" />
        <span>Scan another plant</span>
      </button>
    </section>
  );
}
