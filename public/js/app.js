import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const $ = (id) => document.getElementById(id);

const elements = {
  apiStatus: $('apiStatus'),
  promptForm: $('promptForm'),
  textInput: $('textInput'),
  charCount: $('charCount'),
  submitBtn: $('submitBtn'),
  inputPanel: $('inputPanel'),
  outputPanel: $('outputPanel'),
  galleryPanel: $('galleryPanel'),
  userInputHeader: $('userInputHeader'),
  generatedImage: $('generatedImage'),
  imageSkeleton: $('imageSkeleton'),
  modelSkeleton: $('modelSkeleton'),
  modelContainer: $('modelContainer'),
  progressText: $('progressText'),
  downloadImageBtn: $('downloadImageBtn'),
  downloadModelBtn: $('downloadModelBtn'),
  newPromptBtn: $('newPromptBtn'),
  loadingOverlay: $('loadingOverlay'),
  loadingMessage: $('loadingMessage'),
  progressBarFill: $('progressBarFill'),
  toast: $('toast'),
  stepIndicator: $('stepIndicator'),
};

let threeContext = null;
let currentModelUrl = null;
let currentImageUrl = null;

function showToast(message, type = 'error') {
  elements.toast.textContent = message;
  elements.toast.classList.remove('hidden', 'is-info');
  if (type === 'info') {
    elements.toast.classList.add('is-info');
  }
  clearTimeout(showToast._timer);
  showToast._timer = setTimeout(() => {
    elements.toast.classList.add('hidden');
  }, 6000);
}

function setLoading(active, message = 'Working…', progress = null) {
  elements.loadingOverlay.classList.toggle('hidden', !active);
  elements.loadingMessage.textContent = message;
  if (progress !== null) {
    elements.progressBarFill.style.width = `${Math.min(100, progress)}%`;
  } else {
    elements.progressBarFill.style.width = '0%';
  }
}

function setStep(stepName) {
  const order = ['image', 'mesh', 'done'];
  const activeIndex = order.indexOf(stepName);

  elements.stepIndicator.querySelectorAll('.step').forEach((el) => {
    const step = el.dataset.step;
    const index = order.indexOf(step);
    el.classList.remove('is-active', 'is-done');
    if (index < activeIndex) {
      el.classList.add('is-done');
    } else if (index === activeIndex) {
      el.classList.add('is-active');
    }
  });
}

async function apiRequest(path, options = {}) {
  const response = await fetch(path, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || `Request failed (${response.status})`);
  }
  return data;
}

async function checkHealth() {
  try {
    const data = await apiRequest('/api/health');
    const { rapidapi, meshy } = data.services;
    if (rapidapi && meshy) {
      elements.apiStatus.textContent = 'APIs configured';
      elements.apiStatus.classList.add('is-ok');
    } else {
      elements.apiStatus.textContent = 'API keys missing on server';
      elements.apiStatus.classList.add('is-warn');
    }
  } catch {
    elements.apiStatus.textContent = 'Backend offline';
    elements.apiStatus.classList.add('is-warn');
  }
}

function disposeThreeContext() {
  if (!threeContext) return;

  const { renderer, controls, scene } = threeContext;
  controls?.dispose();
  scene?.traverse((child) => {
    if (child.geometry) child.geometry.dispose();
    if (child.material) {
      if (Array.isArray(child.material)) {
        child.material.forEach((m) => m.dispose());
      } else {
        child.material.dispose();
      }
    }
  });
  renderer?.dispose();
  elements.modelContainer.innerHTML = '';
  threeContext = null;
}

async function loadAndDisplayModel(modelUrl) {
  disposeThreeContext();

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x1c1d27);

  const width = elements.modelContainer.clientWidth || 480;
  const height = elements.modelContainer.clientHeight || 320;

  const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000);
  camera.position.set(0, 1, 3);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  elements.modelContainer.appendChild(renderer.domElement);

  const ambient = new THREE.AmbientLight(0xffffff, 0.65);
  const keyLight = new THREE.DirectionalLight(0xffffff, 1.2);
  keyLight.position.set(4, 6, 4);
  const fillLight = new THREE.DirectionalLight(0x8899ff, 0.4);
  fillLight.position.set(-3, 2, -2);
  scene.add(ambient, keyLight, fillLight);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.06;

  const loader = new GLTFLoader();

  await new Promise((resolve, reject) => {
    loader.load(
      modelUrl,
      (gltf) => {
        const model = gltf.scene;
        scene.add(model);

        const box = new THREE.Box3().setFromObject(model);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        const distance = maxDim * 1.8;

        model.position.sub(center);
        camera.position.set(distance * 0.6, distance * 0.4, distance);
        camera.lookAt(0, 0, 0);
        controls.target.set(0, 0, 0);
        controls.update();
        resolve();
      },
      undefined,
      reject
    );
  });

  function animate() {
    threeContext.animationId = requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
  }

  threeContext = { scene, camera, renderer, controls, animationId: null };
  animate();

  const onResize = () => {
    if (!threeContext) return;
    const w = elements.modelContainer.clientWidth;
    const h = elements.modelContainer.clientHeight || 320;
    threeContext.camera.aspect = w / h;
    threeContext.camera.updateProjectionMatrix();
    threeContext.renderer.setSize(w, h);
  };

  window.addEventListener('resize', onResize);
  threeContext.cleanupResize = () => window.removeEventListener('resize', onResize);
}

async function pollMeshyTask(taskId) {
  const maxAttempts = 120;
  let attempt = 0;

  while (attempt < maxAttempts) {
    const data = await apiRequest(`/api/image-to-3d/${encodeURIComponent(taskId)}`);
    const status = data.status;

    if (data.progress != null) {
      const pct = Math.round(data.progress * 100);
      elements.progressText.textContent = `Meshy: ${pct}%`;
      elements.progressText.classList.remove('hidden');
      setLoading(true, `Building 3D mesh… ${pct}%`, 35 + pct * 0.6);
    }

    if (status === 'SUCCEEDED') {
      return data.modelUrls;
    }

    if (status === 'FAILED') {
      throw new Error(data.taskError?.message || '3D conversion failed on Meshy.');
    }

    await new Promise((r) => setTimeout(r, 5000));
    attempt += 1;
  }

  throw new Error('3D generation timed out. Try again later.');
}

function showOutputView(prompt) {
  elements.inputPanel.classList.add('hidden');
  elements.galleryPanel.classList.add('hidden');
  elements.outputPanel.classList.remove('hidden');
  elements.userInputHeader.textContent = `"${prompt}"`;

  elements.generatedImage.classList.add('hidden');
  elements.imageSkeleton.classList.remove('hidden');
  elements.modelSkeleton.classList.remove('hidden');
  elements.progressText.classList.add('hidden');
  elements.downloadImageBtn.classList.add('hidden');
  elements.downloadModelBtn.classList.add('hidden');
  disposeThreeContext();
}

function resetToInput() {
  elements.outputPanel.classList.add('hidden');
  elements.inputPanel.classList.remove('hidden');
  elements.galleryPanel.classList.remove('hidden');
  elements.textInput.value = '';
  elements.charCount.textContent = '0';
  disposeThreeContext();
  currentModelUrl = null;
  currentImageUrl = null;
}

async function handleGenerate(prompt) {
  showOutputView(prompt);
  setStep('image');
  setLoading(true, 'Generating reference image…', 10);

  try {
    const imageResult = await apiRequest('/api/text-to-image', {
      method: 'POST',
      body: JSON.stringify({ prompt }),
    });

    currentImageUrl = imageResult.imageUrl;
    elements.generatedImage.src = currentImageUrl;
    elements.generatedImage.classList.remove('hidden');
    elements.imageSkeleton.classList.add('hidden');
    elements.downloadImageBtn.href = currentImageUrl;
    elements.downloadImageBtn.classList.remove('hidden');

    setStep('mesh');
    setLoading(true, 'Submitting image to 3D converter…', 30);

    const taskResult = await apiRequest('/api/image-to-3d', {
      method: 'POST',
      body: JSON.stringify({ imageUrl: currentImageUrl }),
    });

    setLoading(true, 'Building 3D mesh…', 40);
    const modelUrls = await pollMeshyTask(taskResult.taskId);
    const modelUrl = modelUrls?.glb || modelUrls?.GLB;

    if (!modelUrl) {
      throw new Error('Meshy succeeded but no GLB URL was returned.');
    }

    currentModelUrl = modelUrl;
    elements.modelSkeleton.classList.add('hidden');
    elements.progressText.classList.add('hidden');
    elements.downloadModelBtn.href = modelUrl;
    elements.downloadModelBtn.classList.remove('hidden');

    await loadAndDisplayModel(modelUrl);
    setStep('done');
    setLoading(false);
    showToast('3D model ready!', 'info');
  } catch (error) {
    setLoading(false);
    showToast(error.message);
    console.error(error);
  }
}

elements.promptForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const prompt = elements.textInput.value.trim();
  if (!prompt) {
    showToast('Please enter a text prompt.');
    return;
  }
  handleGenerate(prompt);
});

elements.textInput.addEventListener('input', () => {
  elements.charCount.textContent = String(elements.textInput.value.length);
});

document.querySelectorAll('.chip').forEach((chip) => {
  chip.addEventListener('click', () => {
    const prompt = chip.dataset.prompt || '';
    elements.textInput.value = prompt;
    elements.charCount.textContent = String(prompt.length);
    elements.textInput.focus();
  });
});

elements.newPromptBtn.addEventListener('click', resetToInput);

checkHealth();
