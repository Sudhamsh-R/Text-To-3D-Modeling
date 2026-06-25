const MESHY_API_KEY = process.env.MESHY_API_KEY;
const MESHY_BASE_URL = 'https://api.meshy.ai/v1/image-to-3d';

async function meshyFetch(path, options = {}) {
  const response = await fetch(`${MESHY_BASE_URL}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${MESHY_API_KEY}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  const bodyText = await response.text();
  let data;

  try {
    data = JSON.parse(bodyText);
  } catch {
    data = { message: bodyText };
  }

  return { response, data };
}

function createApiError(message, status, details) {
  const error = new Error(message);
  error.status = status;
  error.details = details;
  return error;
}

async function createImageTo3DTask(imageUrl) {
  if (!MESHY_API_KEY) {
    throw createApiError('Meshy API key is not configured on the server.', 500);
  }

  if (!imageUrl || typeof imageUrl !== 'string') {
    throw createApiError('A valid image URL is required.', 400);
  }

  const { response, data } = await meshyFetch('', {
    method: 'POST',
    body: JSON.stringify({ image_url: imageUrl, enable_pbr: true }),
  });

  if (response.status === 401) {
    throw createApiError('Invalid Meshy API key.', 401, data);
  }

  if (response.status === 402) {
    throw createApiError(
      data.message ||
        'Meshy plan does not allow new tasks. Upgrade your subscription at meshy.ai.',
      402,
      data
    );
  }

  if (!response.ok) {
    throw createApiError(
      data.message || 'Failed to create Meshy image-to-3D task.',
      response.status,
      data
    );
  }

  const taskId = data.result || data.task_id || data.id;
  if (!taskId) {
    throw createApiError('Meshy did not return a task ID.', 502, data);
  }

  return { taskId };
}

async function getTaskStatus(taskId) {
  if (!MESHY_API_KEY) {
    throw createApiError('Meshy API key is not configured on the server.', 500);
  }

  if (!taskId) {
    throw createApiError('Task ID is required.', 400);
  }

  const { response, data } = await meshyFetch(`/${encodeURIComponent(taskId)}`, {
    method: 'GET',
  });

  if (response.status === 401) {
    throw createApiError('Invalid Meshy API key.', 401, data);
  }

  if (!response.ok) {
    throw createApiError(
      data.message || 'Failed to fetch Meshy task status.',
      response.status,
      data
    );
  }

  return {
    status: data.status,
    progress: data.progress ?? null,
    modelUrls: data.model_urls || null,
    taskError: data.task_error || null,
    raw: data,
  };
}

module.exports = { createImageTo3DTask, getTaskStatus };
