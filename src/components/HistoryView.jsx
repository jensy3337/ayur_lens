import React from 'react';
import { Clock, RotateCcw, ScanLine, Trash2 } from 'lucide-react';

const formatDate = (dateString) =>
  new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(dateString));

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
          const summaryParts = [
            scan.plantData.description,
            scan.plantData.commonNames?.join(', '),
            scan.plantData.rank && `Rank: ${scan.plantData.rank}`,
          ].filter(Boolean);

          return (
            <article className="history-item" key={scan.id}>
              <div>
                <h3>{scan.plantData.commonName}</h3>
                <p><em>{scan.plantData.scientificName}</em></p>
                <p className="history-meta">{formatDate(scan.scannedAt)}</p>
              </div>

              <div className="history-detail">
                <span className="match-pill">{scan.confidenceScore}% Match</span>
                <p>{summaryParts[0] || 'Plant.id scan result'}</p>
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
