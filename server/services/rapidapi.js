const RAPIDAPI_HOST = process.env.RAPIDAPI_HOST || 'ai-text-to-image-generator-api.p.rapidapi.com';
const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;

function getEndpointPaths() {
  const primary = process.env.RAPIDAPI_PATH || '/3D';
  const fallbacks = (process.env.RAPIDAPI_FALLBACK_PATHS || '')
    .split(',')
    .map((path) => path.trim())
    .filter(Boolean);

  return [...new Set([primary, ...fallbacks])];
}

async function requestImage(path, prompt) {
  const response = await fetch(`https://${RAPIDAPI_HOST}${path}`, {
    method: 'POST',
    headers: {
      'x-rapidapi-key': RAPIDAPI_KEY,
      'x-rapidapi-host': RAPIDAPI_HOST,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ inputs: prompt }),
  });

  const bodyText = await response.text();
  let data;

  try {
    data = JSON.parse(bodyText);
  } catch {
    data = { raw: bodyText };
  }

  return { response, data };
}

async function generateImageFromText(prompt) {
  if (!RAPIDAPI_KEY) {
    const error = new Error('RapidAPI key is not configured on the server.');
    error.status = 500;
    throw error;
  }

  const trimmed = String(prompt || '').trim();
  if (!trimmed) {
    const error = new Error('Prompt cannot be empty.');
    error.status = 400;
    throw error;
  }

  if (trimmed.length > 500) {
    const error = new Error('Prompt must be 500 characters or fewer.');
    error.status = 400;
    throw error;
  }

  const attempts = [];

  for (const path of getEndpointPaths()) {
    const { response, data } = await requestImage(path, trimmed);
    attempts.push({ path, status: response.status, data });

    if (response.status === 403) {
      const error = new Error(
        data.message || 'RapidAPI subscription required for this API.'
      );
      error.status = 403;
      error.details = { attempts };
      throw error;
    }

    if (response.status === 404) {
      continue;
    }

    if (!response.ok) {
      continue;
    }

    const imageUrl = data.url || data.image_url || data.output || data.result;
    if (imageUrl) {
      return { imageUrl, endpoint: path };
    }
  }

  const error = new Error(
    'Text-to-image generation failed. The API endpoint may have changed or the upstream service is unavailable.'
  );
  error.status = 502;
  error.details = { attempts };
  throw error;
}

module.exports = { generateImageFromText };
