import React from 'react';
import { motion } from 'framer-motion';
import { Activity, BookOpen, Droplets, ExternalLink, Leaf, RefreshCw, Sprout } from 'lucide-react';

const asList = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean);

  return [value];
};

const DetailBlock = ({ icon: Icon, title, children }) => (
  <section className="plant-detail-block">
    <h3>
      <Icon className="w-5 h-5" />
      {title}
    </h3>
    {children}
  </section>
);

export default function PlantResult({ result, imagePreview, onReset }) {
  const { plantData, confidenceScore, isPlantProbability } = result;
  const taxonomyEntries = Object.entries(plantData.taxonomy || {}).filter(([, value]) => value);
  const commonNames = asList(plantData.commonNames);
  const synonyms = asList(plantData.synonyms);
  const edibleParts = asList(plantData.edibleParts);
  const propagationMethods = asList(plantData.propagationMethods);
  const similarImages = asList(plantData.similarImages).slice(0, 3);
  const heroImage = plantData.imageUrl || imagePreview;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="result-card bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100"
    >
      <div className="result-hero relative bg-emerald-900">
        <img src={heroImage} className="result-hero-image object-cover opacity-60" alt={plantData.commonName} />
        <div className="result-title text-white">
          <h2 className="text-3xl font-bold">{plantData.commonName}</h2>
          <p className="text-emerald-200 italic">{plantData.scientificName}</p>
        </div>
        <div className="result-match bg-emerald-500 text-white px-3 py-1 rounded-full text-sm font-bold shadow-md">
          {confidenceScore}% Match
        </div>
      </div>

      <div className="p-6 space-y-6">
        <div>
          <p className="text-gray-700 leading-relaxed">{plantData.description}</p>
          <div className="result-chip-row">
            {isPlantProbability > 0 && <span>Plant likelihood: {isPlantProbability}%</span>}
            {plantData.rank && <span>Rank: {plantData.rank}</span>}
            {plantData.gbifId && <span>GBIF: {plantData.gbifId}</span>}
            {plantData.inaturalistId && <span>iNaturalist: {plantData.inaturalistId}</span>}
          </div>
        </div>

        <div className="plant-result-grid">
          <DetailBlock icon={Leaf} title="Names">
            <p><strong>Scientific name:</strong> {plantData.scientificName}</p>
            {commonNames.length > 0 && <p><strong>Common names:</strong> {commonNames.join(', ')}</p>}
            {synonyms.length > 0 && <p><strong>Synonyms:</strong> {synonyms.slice(0, 8).join(', ')}</p>}
          </DetailBlock>

          {taxonomyEntries.length > 0 && (
            <DetailBlock icon={BookOpen} title="Taxonomy">
              <dl className="taxonomy-list">
                {taxonomyEntries.map(([key, value]) => (
                  <div key={key}>
                    <dt>{key}</dt>
                    <dd>{value}</dd>
                  </div>
                ))}
              </dl>
            </DetailBlock>
          )}

          {(edibleParts.length > 0 || plantData.watering) && (
            <DetailBlock icon={Droplets} title="Care & Edibility">
              {plantData.watering && <p><strong>Watering:</strong> {plantData.watering}</p>}
              {edibleParts.length > 0 && <p><strong>Edible parts:</strong> {edibleParts.join(', ')}</p>}
            </DetailBlock>
          )}

          {propagationMethods.length > 0 && (
            <DetailBlock icon={Sprout} title="Propagation">
              <p>{propagationMethods.join(', ')}</p>
            </DetailBlock>
          )}
        </div>

        {similarImages.length > 0 && (
          <DetailBlock icon={Activity} title="Similar Images">
            <div className="similar-image-grid">
              {similarImages.map((image, index) => (
                <img
                  key={image.url || image.id || index}
                  src={image.url}
                  alt={`${plantData.commonName} similar result ${index + 1}`}
                />
              ))}
            </div>
          </DetailBlock>
        )}

        <div className="result-action-row">
          {plantData.url && (
            <a className="secondary-action" href={plantData.url} target="_blank" rel="noreferrer">
              <ExternalLink className="w-4 h-4" />
              More details
            </a>
          )}
          <button
            onClick={onReset}
            className="primary-action"
            type="button"
          >
            <RefreshCw className="w-4 h-4" />
            Scan Another Plant
          </button>
        </div>
      </div>
    </motion.div>
  );
}
