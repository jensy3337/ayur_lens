const PLANT_ID_ENDPOINT = 'https://plant.id/api/v3/identification';

const requestedDetails = [
  'common_names',
  'url',
  'description',
  'taxonomy',
  'rank',
  'gbif_id',
  'inaturalist_id',
  'image',
  'synonyms',
  'edible_parts',
  'watering',
  'propagation_methods',
];

const fileToBase64 = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const result = String(reader.result || '');
      resolve(result.split(',')[1] || result);
    };

    reader.onerror = () => reject(new Error('Could not read the selected image.'));
    reader.readAsDataURL(file);
  });

const readDetailValue = (value, fallback = '') => {
  if (!value) return fallback;
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value.filter(Boolean);
  if (typeof value === 'object' && 'value' in value) return readDetailValue(value.value, fallback);

  return fallback;
};

const formatProbability = (probability) => Math.round((Number(probability) || 0) * 100);

const normalizePlantIdResponse = (data) => {
  const classification = data?.result?.classification;
  const suggestion = classification?.suggestions?.[0];
  const details = suggestion?.details || {};
  const commonNames = readDetailValue(details.common_names, []);
  const description = readDetailValue(details.description, '');
  const image = readDetailValue(details.image, '');

  if (!suggestion) {
    return {
      success: false,
      confidenceScore: 0,
      message: 'Plant.id could not find a confident plant match for this image. Try a clearer photo with leaves, flowers, or fruit in focus.',
    };
  }

  const scientificName = suggestion.name || 'Unknown plant';
  const commonName = commonNames[0] || scientificName;

  return {
    success: true,
    confidenceScore: formatProbability(suggestion.probability),
    matchBasis: 'Plant.id image identification',
    isPlantProbability: formatProbability(data?.result?.is_plant?.probability),
    plantData: {
      id: suggestion.id || data.access_token || scientificName,
      commonName,
      commonNames,
      scientificName,
      description: description || 'No description was returned for this plant.',
      imageUrl: image,
      url: readDetailValue(details.url, ''),
      taxonomy: details.taxonomy || {},
      rank: readDetailValue(details.rank, ''),
      gbifId: readDetailValue(details.gbif_id, ''),
      inaturalistId: readDetailValue(details.inaturalist_id, ''),
      synonyms: readDetailValue(details.synonyms, []),
      edibleParts: readDetailValue(details.edible_parts, []),
      watering: readDetailValue(details.watering, ''),
      propagationMethods: readDetailValue(details.propagation_methods, []),
      similarImages: suggestion.similar_images || [],
    },
    raw: data,
  };
};

export const identifyPlant = async (imageFile) => {
  const apiKey = import.meta.env.VITE_PLANT_ID_API_KEY;

  if (!apiKey) {
    return {
      success: false,
      confidenceScore: 0,
      message: 'Plant.id API key is missing. Add VITE_PLANT_ID_API_KEY to your .env file and restart the dev server.',
    };
  }

  const imageBase64 = await fileToBase64(imageFile);
  const response = await fetch(`${PLANT_ID_ENDPOINT}?details=${requestedDetails.join(',')}`, {
    method: 'POST',
    headers: {
      'Api-Key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      images: [imageBase64],
      similar_images: true,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || `Plant.id request failed with status ${response.status}.`);
  }

  return normalizePlantIdResponse(await response.json());
};
