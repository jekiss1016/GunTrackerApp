/**
 * app.js - Main logic for ArmoryVault Pro
 * Connects the UI events, Chart.js visualizations, and Supabase cloud operations.
 * Relies on window.ArmoryDB namespace to support direct file:// protocol loading.
 */

// Default base64 image (Stylized SVG placeholder)
const DEFAULT_IMAGE = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 200" width="100%" height="100%"><defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%231a2230" /><stop offset="100%" stop-color="%230f131a" /></linearGradient></defs><rect width="400" height="200" fill="url(%23g)" /><circle cx="200" cy="100" r="40" stroke="%23d4a359" stroke-width="2" stroke-dasharray="5,5" fill="none" opacity="0.3" /><path d="M185 100 H215 M200 85 V115" stroke="%23d4a359" stroke-width="2" opacity="0.3" /><text x="50%" y="155" dominant-baseline="middle" text-anchor="middle" fill="%2364748b" font-family="'Space Grotesk', sans-serif" font-size="11" letter-spacing="2">NO IMAGE RECORDED</text></svg>`;

// State variables
let firearmsList = [];
let base64ImageString = '';
let manufacturerChartInstance = null;
let caliberChartInstance = null;
let currentUser = null;
let currentUserRole = 'readonly'; // Default fallback
let currentFactorId = null; // Stored during MFA enrollment

// DOM Elements - Counters
const gridEl = document.getElementById('firearmsGrid');
const totalCountEl = document.getElementById('valTotalCount');
const totalValueEl = document.getElementById('valTotalValue');
const manufacturersCountEl = document.getElementById('valManufacturersCount');
const calibersCountEl = document.getElementById('valCalibersCount');

// Search & Filters controls
const searchInput = document.getElementById('searchInput');
const filterType = document.getElementById('filterType');
const filterManufacturer = document.getElementById('filterManufacturer');
const filterCaliber = document.getElementById('filterCaliber');
const sortControl = document.getElementById('sortControl');

// Modals
const formModal = document.getElementById('formModal');
const detailModal = document.getElementById('detailModal');
const settingsModal = document.getElementById('settingsModal');
const reportModal = document.getElementById('reportModal');
const reportTableContainer = document.getElementById('reportTableContainer');

// Form inputs
const firearmForm = document.getElementById('firearmForm');
const firearmIdInput = document.getElementById('firearmId');
const typeInput = document.getElementById('type');
const manufacturerInput = document.getElementById('manufacturer');
const modelInput = document.getElementById('model');
const caliberInput = document.getElementById('caliber');
const serialInput = document.getElementById('serialNumber');
const actionTypeInput = document.getElementById('actionType');
const sightTypeInput = document.getElementById('sightType');
const valueInput = document.getElementById('estimatedValue');
const conditionInput = document.getElementById('condition');
const dateAcquiredInput = document.getElementById('dateAcquired');
const notesInput = document.getElementById('notes');

// Image upload components
const imageUploadZone = document.getElementById('imageUploadZone');
const imageFileInput = document.getElementById('imageFile');
const uploadPrompt = document.getElementById('uploadPrompt');
const imagePreviewContainer = document.getElementById('imagePreviewContainer');
const imagePreview = document.getElementById('imagePreview');
const btnRemoveImage = document.getElementById('btnRemoveImage');

// Details View
const detailImage = document.getElementById('detailImage');
const detailType = document.getElementById('detailType');
const detailManufacturer = document.getElementById('detailManufacturer');
const detailName = document.getElementById('detailName');
const detailCaliber = document.getElementById('detailCaliber');
const detailAction = document.getElementById('detailAction');
const detailSight = document.getElementById('detailSight');
const detailSerial = document.getElementById('detailSerial');
const detailValue = document.getElementById('detailValue');
const detailCondition = document.getElementById('detailCondition');
const detailAcquired = document.getElementById('detailAcquired');
const detailNotes = document.getElementById('detailNotes');

// Security & Login DOM Elements
const loginOverlay = document.getElementById('loginOverlay');
const loginForm = document.getElementById('loginForm');
const loginEmail = document.getElementById('loginEmail');
const loginPassword = document.getElementById('loginPassword');
const btnLogout = document.getElementById('btnLogout');
const userInfoBadge = document.getElementById('userInfoBadge');
const userEmailLabel = document.getElementById('userEmailLabel');
const userRoleBadge = document.getElementById('userRoleBadge');

// MFA Forms
const mfaVerifyForm = document.getElementById('mfaVerifyForm');
const mfaCode = document.getElementById('mfaCode');
const btnBackToLogin = document.getElementById('btnBackToLogin');
const mfaEnrollSection = document.getElementById('mfaEnrollSection');
const mfaQrImg = document.getElementById('mfaQrImg');
const mfaSecretVal = document.getElementById('mfaSecretVal');
const mfaEnrollForm = document.getElementById('mfaEnrollForm');
const mfaEnrollCode = document.getElementById('mfaEnrollCode');

// Admin Console Form & List
const adminUserConsole = document.getElementById('adminUserConsole');
const createUserForm = document.getElementById('createUserForm');
const newUserEmail = document.getElementById('newUserEmail');
const newUserPassword = document.getElementById('newUserPassword');
const newUserRole = document.getElementById('newUserRole');
const userListBody = document.getElementById('userListBody');

// Settings Sections to restrict
const settingsImportSection = document.getElementById('settingsImportSection');
const settingsWipeSection = document.getElementById('settingsWipeSection');

// Active Firearm for Detail actions
let activeFirearmId = null;

// Initialize App
window.addEventListener('DOMContentLoaded', async () => {
  try {
    // 1. Initialize Supabase client
    await window.ArmoryDB.initDB();
    setupEventListeners();
    
    // 2. Perform Session/Auth check
    await checkAuthSession();
  } catch (err) {
    console.error('Initialization error:', err);
    // If Supabase config is missing, prompt setting configurations
    showConfigError();
  }
});

// Setup Config Error display
function showConfigError() {
  loginOverlay.classList.add('active');
  loginForm.style.display = 'none';
  mfaVerifyForm.style.display = 'none';
  mfaEnrollSection.style.display = 'none';
  
  const card = loginOverlay.querySelector('.login-card');
  const errorDiv = document.createElement('div');
  errorDiv.style.textAlign = 'center';
  errorDiv.style.marginTop = '1rem';
  errorDiv.innerHTML = `
    <i class="fa-solid fa-triangle-exclamation text-gold" style="font-size: 2.5rem; margin-bottom: 1rem;"></i>
    <h3 style="color: #fff; margin-bottom: 0.5rem;">Supabase Connection Missing</h3>
    <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 1.5rem;">
      Please open and configure <strong>config.js</strong> with your Supabase Project URL and Anon API Key.
    </p>
    <button class="btn btn-secondary btn-block" onclick="location.reload()">Retry Connection</button>
  `;
  card.appendChild(errorDiv);
}

// Check if user session exists and manages MFA routing
async function checkAuthSession() {
  try {
    const sessionRes = await window.ArmoryDB.getSession();
    const session = sessionRes.data.session;
    
    if (!session) {
      showLoginForm();
      return;
    }

    currentUser = session.user;
    
    // Check Multi-Factor Authentication (MFA) Status
    const client = window.supabaseClientInstance;
    const { data: mfaFactors, error: listError } = await client.auth.mfa.listFactors();
    
    if (listError) throw listError;

    const { data: assuranceLevel, error: aalError } = await client.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aalError) throw aalError;

    // Case A: User has MFA enrolled, but has only completed AAL1 (password).
    // Prompt for 6-digit Authenticator Code.
    if (assuranceLevel.nextLevel === 'aal2' && assuranceLevel.currentLevel !== 'aal2') {
      showMfaVerifyForm();
      return;
    }

    // Case B: User has NO MFA enrolled. Because MFA is mandated, force enrollment now.
    if (mfaFactors.all.length === 0) {
      await startMfaEnrollment();
      return;
    }

    // Case C: Logged in and MFA is fully satisfied (AAL2). Load the application.
    await resolveUserProfileAndLoad();

  } catch (err) {
    console.error('Session verification failed:', err);
    showLoginForm();
  }
}

// Fetch user profile role and toggle UI controls
async function resolveUserProfileAndLoad() {
  try {
    const profileRes = await window.ArmoryDB.getUserProfile(currentUser.id);
    if (profileRes.error) throw profileRes.error;
    
    currentUserRole = profileRes.data.role || 'readonly';
    
    // UI custom displays based on Roles
    applyRolePermissions();
    
    // Hide login panel and load data
    loginOverlay.classList.remove('active');
    
    // Header UI
    userInfoBadge.style.display = 'flex';
    btnLogout.style.display = 'inline-flex';
    userEmailLabel.textContent = currentUser.email;
    userRoleBadge.textContent = currentUserRole.toUpperCase();
    
    // Load firearms records
    await loadFirearms();
  } catch (err) {
    console.error('Failed to load user profile role:', err);
    alert('Failed to verify access permissions: ' + err.message);
    window.ArmoryDB.logout();
    showLoginForm();
  }
}

// Apply role checks across UI elements
function applyRolePermissions() {
  const btnAdd = document.getElementById('btnAddFirearm');
  const btnEditDetail = document.getElementById('btnEditDetail');
  const btnDeleteDetail = document.getElementById('btnDeleteDetail');

  if (currentUserRole === 'readonly') {
    // Read-Only: Hide all modifying inputs
    btnAdd.style.display = 'none';
    btnEditDetail.style.display = 'none';
    btnDeleteDetail.style.display = 'none';
    settingsImportSection.style.display = 'none';
    settingsWipeSection.style.display = 'none';
    adminUserConsole.style.display = 'none';
  } else if (currentUserRole === 'editor') {
    // Editor: CRUD allowed, user management & wipe database blocked
    btnAdd.style.display = 'inline-flex';
    btnEditDetail.style.display = 'inline-flex';
    btnDeleteDetail.style.display = 'inline-flex';
    settingsImportSection.style.display = 'block';
    settingsWipeSection.style.display = 'none';
    adminUserConsole.style.display = 'none';
  } else if (currentUserRole === 'admin') {
    // Admin: Full access to everything
    btnAdd.style.display = 'inline-flex';
    btnEditDetail.style.display = 'inline-flex';
    btnDeleteDetail.style.display = 'inline-flex';
    settingsImportSection.style.display = 'block';
    settingsWipeSection.style.display = 'block';
    adminUserConsole.style.display = 'block';
    
    // Load Admin Console details
    loadAdminConsoleUsers();
  }
}

// Displays authentication login form
function showLoginForm() {
  loginOverlay.classList.add('active');
  loginForm.style.display = 'block';
  mfaVerifyForm.style.display = 'none';
  mfaEnrollSection.style.display = 'none';
  userInfoBadge.style.display = 'none';
  btnLogout.style.display = 'none';
}

// Displays MFA challenge verification input
function showMfaVerifyForm() {
  loginOverlay.classList.add('active');
  loginForm.style.display = 'none';
  mfaVerifyForm.style.display = 'block';
  mfaEnrollSection.style.display = 'none';
  mfaCode.value = '';
  mfaCode.focus();
}

// Begins TOTP MFA Enrollment flow (generates QR Code)
async function startMfaEnrollment() {
  loginOverlay.classList.add('active');
  loginForm.style.display = 'none';
  mfaVerifyForm.style.display = 'none';
  mfaEnrollSection.style.display = 'block';
  
  try {
    const enrollRes = await window.ArmoryDB.enrollMFA();
    if (enrollRes.error) throw enrollRes.error;
    
    currentFactorId = enrollRes.data.id;
    mfaQrImg.src = enrollRes.data.totp.qr_code;
    mfaSecretVal.textContent = enrollRes.data.totp.secret;
    mfaEnrollCode.value = '';
    mfaEnrollCode.focus();
  } catch (err) {
    console.error('MFA enrollment generation failed:', err);
    alert('Failed to initiate Multi-Factor Authentication setup: ' + err.message);
    await window.ArmoryDB.logout();
    showLoginForm();
  }
}

// Setup Event Listeners
function setupEventListeners() {
  // Authentication Forms
  loginForm.addEventListener('submit', handleLoginSubmit);
  mfaVerifyForm.addEventListener('submit', handleMfaVerification);
  mfaEnrollForm.addEventListener('submit', handleMfaEnrollmentConfirmation);
  btnBackToLogin.addEventListener('click', async () => {
    await window.ArmoryDB.logout();
    showLoginForm();
  });
  btnLogout.addEventListener('click', async () => {
    if (confirm('Are you sure you want to sign out?')) {
      await window.ArmoryDB.logout();
      showLoginForm();
    }
  });

  // Admin User Creation
  createUserForm.addEventListener('submit', handleAdminCreateUserSubmit);

  // Modal toggling
  document.getElementById('btnAddFirearm').addEventListener('click', openAddModal);
  document.getElementById('btnCloseFormModal').addEventListener('click', () => closeModal(formModal));
  document.getElementById('btnCancelForm').addEventListener('click', () => closeModal(formModal));
  
  document.getElementById('btnCloseDetailModal').addEventListener('click', () => closeModal(detailModal));
  document.getElementById('btnSettings').addEventListener('click', () => openModal(settingsModal));
  document.getElementById('btnCloseSettingsModal').addEventListener('click', () => closeModal(settingsModal));
  document.getElementById('btnCloseSettings').addEventListener('click', () => closeModal(settingsModal));

  // Report Modal events
  document.getElementById('btnReport').addEventListener('click', openReportModal);
  document.getElementById('btnCloseReportModal').addEventListener('click', () => closeModal(reportModal));
  document.getElementById('btnCloseReport').addEventListener('click', () => closeModal(reportModal));
  document.getElementById('btnPrintReport').addEventListener('click', () => window.print());

  // Search & Filtering events
  searchInput.addEventListener('input', renderGrid);
  filterType.addEventListener('change', renderGrid);
  filterManufacturer.addEventListener('change', renderGrid);
  filterCaliber.addEventListener('change', renderGrid);
  sortControl.addEventListener('change', renderGrid);

  // Firearm Form Submit
  firearmForm.addEventListener('submit', handleFormSubmit);

  // Detail view actions
  document.getElementById('btnEditDetail').addEventListener('click', handleEditDetail);
  document.getElementById('btnDeleteDetail').addEventListener('click', handleDeleteDetail);

  // Drag and Drop files
  imageUploadZone.addEventListener('click', () => imageFileInput.click());
  imageFileInput.addEventListener('change', handleFileSelect);
  
  imageUploadZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    imageUploadZone.classList.add('dragover');
  });
  imageUploadZone.addEventListener('dragleave', () => {
    imageUploadZone.classList.remove('dragover');
  });
  imageUploadZone.addEventListener('drop', (e) => {
    e.preventDefault();
    imageUploadZone.classList.remove('dragover');
    if (e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
  });

  btnRemoveImage.addEventListener('click', (e) => {
    e.stopPropagation();
    clearImagePreview();
  });

  // Tools Actions
  document.getElementById('btnExportDB').addEventListener('click', exportCollection);
  document.getElementById('btnTriggerImport').addEventListener('click', () => document.getElementById('importFileInput').click());
  document.getElementById('importFileInput').addEventListener('change', importCollection);
  document.getElementById('btnWipeDB').addEventListener('click', wipeDatabase);

  // Close modals clicking outside
  window.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal-overlay')) {
      closeModal(e.target);
    }
  });
}

// Handle login submission
async function handleLoginSubmit(e) {
  e.preventDefault();
  const email = loginEmail.value.trim();
  const password = loginPassword.value;
  const btn = document.getElementById('btnLoginSubmit');
  
  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Authenticating...';

  try {
    const loginRes = await window.ArmoryDB.login(email, password);
    if (loginRes.error) throw loginRes.error;
    
    // Check next factors / MFA enrollment
    await checkAuthSession();
  } catch (err) {
    console.error('Login failed:', err);
    alert('Authentication Failed: ' + err.message);
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="fa-solid fa-key"></i> Authenticate';
  }
}

// Handle MFA code verification during login
async function handleMfaVerification(e) {
  e.preventDefault();
  const code = mfaCode.value.trim();
  if (code.length !== 6) return;

  try {
    const client = window.supabaseClientInstance;
    const factors = await client.auth.mfa.listFactors();
    if (factors.error) throw factors.error;

    // Get active factor ID
    const activeFactor = factors.data.totp[0];
    if (!activeFactor) throw new Error("No active MFA factor registered.");

    const verifyRes = await window.ArmoryDB.challengeAndVerifyMFA(activeFactor.id, code);
    if (verifyRes.error) throw verifyRes.error;

    // MFA succeeded! Upgrade session and load profile.
    await checkAuthSession();
  } catch (err) {
    console.error('MFA validation error:', err);
    alert('MFA Verification Failed. Invalid or expired token.');
    mfaCode.value = '';
    mfaCode.focus();
  }
}

// Confirm first-time MFA setup
async function handleMfaEnrollmentConfirmation(e) {
  e.preventDefault();
  const code = mfaEnrollCode.value.trim();
  if (code.length !== 6 || !currentFactorId) return;

  try {
    const verifyRes = await window.ArmoryDB.challengeAndVerifyMFA(currentFactorId, code);
    if (verifyRes.error) throw verifyRes.error;

    alert('Authenticator app successfully enrolled! MFA is now enabled.');
    
    // Reload database connections and session cleanly
    location.reload();
  } catch (err) {
    console.error('MFA confirmation failed:', err);
    alert('Verification failed. Please double-check your code.');
    mfaEnrollCode.value = '';
    mfaEnrollCode.focus();
  }
}

// Admin user creation handler
async function handleAdminCreateUserSubmit(e) {
  e.preventDefault();
  const email = newUserEmail.value.trim();
  const password = newUserPassword.value;
  const role = newUserRole.value;

  // Enforce password criteria: 8+ characters, alphanumeric (at least one letter and one number)
  const passwordRegex = /^(?=.*[a-zA-Z])(?=.*[0-9]).{8,}$/;
  if (!passwordRegex.test(password)) {
    alert("Password does not meet criteria: It must be at least 8 characters long and contain both letters and numbers.");
    return;
  }

  const btn = createUserForm.querySelector('button[type="submit"]');
  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Processing...';

  try {
    await window.ArmoryDB.adminCreateUser(email, password, role);
    alert(`Account created successfully for ${email} as role: ${role}`);
    createUserForm.reset();
    
    // Refresh user list
    await loadAdminConsoleUsers();
  } catch (err) {
    console.error('User creation failed:', err);
    alert('Failed to create user account: ' + err.message);
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="fa-solid fa-user-plus"></i> Create User';
  }
}

// Load users list for Admin Console
async function loadAdminConsoleUsers() {
  try {
    const { data: users, error } = await window.ArmoryDB.getAllUserProfiles();
    if (error) throw error;

    userListBody.innerHTML = '';
    users.forEach(u => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td style="padding: 0.5rem 0.75rem;">${u.email}</td>
        <td style="padding: 0.5rem 0.75rem;"><span class="badge-role" style="font-weight: 600;">${u.role}</span></td>
      `;
      userListBody.appendChild(row);
    });
  } catch (err) {
    console.error('Failed to load system users:', err);
  }
}

// Open modal utilities
function openModal(modal) {
  modal.classList.add('active');
}

function closeModal(modal) {
  modal.classList.remove('active');
  if (modal === formModal) {
    firearmForm.reset();
    clearImagePreview();
  }
}

// Load firearms list from database
async function loadFirearms() {
  try {
    firearmsList = await window.ArmoryDB.getAllFirearms();
    updateStats();
    populateFilters();
    renderCharts();
    renderGrid();
  } catch (err) {
    console.error('Error loading collection:', err);
  }
}

// Update Stats Dashboard
function updateStats() {
  totalCountEl.textContent = firearmsList.length;
  
  const totalValue = firearmsList.reduce((sum, item) => sum + parseFloat(item.value || 0), 0);
  totalValueEl.textContent = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(totalValue);

  const manufacturers = new Set(firearmsList.map(item => item.manufacturer.trim().toLowerCase()));
  manufacturersCountEl.textContent = manufacturers.size;

  const calibers = new Set(firearmsList.map(item => item.caliber.trim().toLowerCase()));
  calibersCountEl.textContent = calibers.size;
}

// Populate filters dynamically
function populateFilters() {
  const currentMfg = filterManufacturer.value;
  const currentCal = filterCaliber.value;

  // Extract unique and sorted values
  const manufacturers = [...new Set(firearmsList.map(item => item.manufacturer.trim()))].sort();
  const calibers = [...new Set(firearmsList.map(item => item.caliber.trim()))].sort();

  // Reset dropdowns
  filterManufacturer.innerHTML = '<option value="">All Manufacturers</option>';
  filterCaliber.innerHTML = '<option value="">All Calibers</option>';

  manufacturers.forEach(mfg => {
    const opt = document.createElement('option');
    opt.value = mfg;
    opt.textContent = mfg;
    filterManufacturer.appendChild(opt);
  });

  calibers.forEach(cal => {
    const opt = document.createElement('option');
    opt.value = cal;
    opt.textContent = cal;
    filterCaliber.appendChild(opt);
  });

  // Restore selections
  if (manufacturers.includes(currentMfg)) filterManufacturer.value = currentMfg;
  if (calibers.includes(currentCal)) filterCaliber.value = currentCal;
}

// Process selected image file
function handleFileSelect(e) {
  if (e.target.files.length > 0) {
    processFile(e.target.files[0]);
  }
}

function processFile(file) {
  if (!file.type.startsWith('image/')) {
    alert('Please upload an image file (PNG, JPG, JPEG).');
    return;
  }

  // Cap file size at 2.5MB to keep database payload sizes manageable
  if (file.size > 2.5 * 1024 * 1024) {
    alert('Image size is too large. Please upload an image under 2.5MB.');
    return;
  }

  const reader = new FileReader();
  reader.onload = (event) => {
    base64ImageString = event.target.result;
    imagePreview.src = base64ImageString;
    uploadPrompt.style.display = 'none';
    imagePreviewContainer.style.display = 'block';
  };
  reader.onerror = () => {
    alert('Failed to read file.');
  };
  reader.readAsDataURL(file);
}

function clearImagePreview() {
  base64ImageString = '';
  imageFileInput.value = '';
  imagePreview.src = '';
  uploadPrompt.style.display = 'block';
  imagePreviewContainer.style.display = 'none';
}

// Form logic
function openAddModal() {
  document.getElementById('formModalTitle').textContent = 'Add Firearm';
  firearmIdInput.value = '';
  firearmForm.reset();
  clearImagePreview();
  
  // Set default acquisition date to today
  const today = new Date().toISOString().split('T')[0];
  dateAcquiredInput.value = today;

  openModal(formModal);
}

async function handleFormSubmit(e) {
  e.preventDefault();

  const id = firearmIdInput.value;
  const firearm = {
    type: typeInput.value,
    manufacturer: manufacturerInput.value.trim(),
    model: modelInput.value.trim(),
    caliber: caliberInput.value.trim(),
    serialNumber: serialInput.value.trim() || 'N/A',
    actionType: actionTypeInput.value.trim() || 'N/A',
    sightType: sightTypeInput.value.trim() || 'N/A',
    value: parseFloat(valueInput.value) || 0,
    condition: conditionInput.value,
    dateAcquired: dateAcquiredInput.value || 'N/A',
    image: base64ImageString || DEFAULT_IMAGE,
    notes: notesInput.value.trim()
  };

  try {
    if (id) {
      // Edit mode
      firearm.id = parseInt(id);
      await window.ArmoryDB.updateFirearm(firearm);
    } else {
      // Add mode
      await window.ArmoryDB.addFirearm(firearm);
    }

    closeModal(formModal);
    await loadFirearms();
  } catch (err) {
    console.error('Error saving firearm:', err);
    alert('Error saving record: ' + err.message);
  }
}

// Edit actions from detail view
function handleEditDetail() {
  closeModal(detailModal);
  if (!activeFirearmId) return;

  const item = firearmsList.find(x => x.id === activeFirearmId);
  if (!item) return;

  document.getElementById('formModalTitle').textContent = 'Edit Firearm';
  firearmIdInput.value = item.id;
  typeInput.value = item.type || 'Rifle';
  manufacturerInput.value = item.manufacturer;
  modelInput.value = item.model;
  caliberInput.value = item.caliber;
  serialInput.value = item.serialNumber === 'N/A' ? '' : item.serialNumber;
  actionTypeInput.value = item.actionType === 'N/A' ? '' : item.actionType;
  sightTypeInput.value = item.sightType === 'N/A' ? '' : item.sightType;
  valueInput.value = item.value;
  conditionInput.value = item.condition;
  dateAcquiredInput.value = item.dateAcquired === 'N/A' ? '' : item.dateAcquired;
  notesInput.value = item.notes;

  if (item.image && item.image !== DEFAULT_IMAGE) {
    base64ImageString = item.image;
    imagePreview.src = item.image;
    uploadPrompt.style.display = 'none';
    imagePreviewContainer.style.display = 'block';
  } else {
    clearImagePreview();
  }

  openModal(formModal);
}

// Delete action from detail view
async function handleDeleteDetail() {
  if (!activeFirearmId) return;
  
  const item = firearmsList.find(x => x.id === activeFirearmId);
  if (!item) return;

  if (confirm(`Are you sure you want to permanently delete the ${item.manufacturer} ${item.model} from your collection?`)) {
    try {
      await window.ArmoryDB.deleteFirearm(activeFirearmId);
      closeModal(detailModal);
      await loadFirearms();
    } catch (err) {
      console.error('Error deleting firearm:', err);
      alert('Failed to delete firearm record.');
    }
  }
}

// Open firearm details modal
function viewFirearmDetail(id) {
  const item = firearmsList.find(x => x.id === id);
  if (!item) return;

  activeFirearmId = item.id;

  detailImage.src = item.image || DEFAULT_IMAGE;
  detailImage.alt = `${item.manufacturer} ${item.model}`;
  
  detailManufacturer.textContent = item.manufacturer;
  detailName.textContent = item.model;
  detailType.textContent = item.type || 'Rifle';
  detailCaliber.textContent = item.caliber;
  detailAction.textContent = item.actionType || 'N/A';
  detailSight.textContent = item.sightType || 'N/A';
  detailSerial.textContent = item.serialNumber;
  detailValue.textContent = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(item.value);
  detailCondition.textContent = item.condition;
  detailAcquired.textContent = item.dateAcquired;
  detailNotes.textContent = item.notes || 'No additional details recorded.';

  // Hide/Show details buttons based on roles
  const editBtn = document.getElementById('btnEditDetail');
  const deleteBtn = document.getElementById('btnDeleteDetail');
  if (currentUserRole === 'readonly') {
    editBtn.style.display = 'none';
    deleteBtn.style.display = 'none';
  } else {
    editBtn.style.display = 'inline-flex';
    deleteBtn.style.display = 'inline-flex';
  }

  openModal(detailModal);
}

// Filter, Sort and Render Collection Grid
function renderGrid() {
  const query = searchInput.value.toLowerCase().trim();
  const typeFilter = filterType.value;
  const mfgFilter = filterManufacturer.value;
  const calFilter = filterCaliber.value;
  const sortVal = sortControl.value;

  // Filter list
  let filteredList = firearmsList.filter(item => {
    // Search query matches manufacturer, model, caliber, serial, notes, action, sights
    const matchesQuery = !query || 
      item.manufacturer.toLowerCase().includes(query) ||
      item.model.toLowerCase().includes(query) ||
      item.caliber.toLowerCase().includes(query) ||
      (item.serialNumber && item.serialNumber.toLowerCase().includes(query)) ||
      (item.notes && item.notes.toLowerCase().includes(query)) ||
      (item.actionType && item.actionType.toLowerCase().includes(query)) ||
      (item.sightType && item.sightType.toLowerCase().includes(query));

    const matchesType = !typeFilter || item.type === typeFilter;
    const matchesMfg = !mfgFilter || item.manufacturer === mfgFilter;
    const matchesCal = !calFilter || item.caliber === calFilter;

    return matchesQuery && matchesType && matchesMfg && matchesCal;
  });

  // Sort list
  filteredList.sort((a, b) => {
    switch (sortVal) {
      case 'name-asc':
        return `${a.manufacturer} ${a.model}`.localeCompare(`${b.manufacturer} ${b.model}`);
      case 'name-desc':
        return `${b.manufacturer} ${b.model}`.localeCompare(`${a.manufacturer} ${a.model}`);
      case 'value-desc':
        return b.value - a.value;
      case 'value-asc':
        return a.value - b.value;
      case 'acquired-desc':
        return b.dateAcquired.localeCompare(a.dateAcquired);
      case 'acquired-asc':
        return a.dateAcquired.localeCompare(b.dateAcquired);
      default:
        return 0;
    }
  });

  // Clear Grid
  gridEl.innerHTML = '';

  if (filteredList.length === 0) {
    gridEl.innerHTML = `
      <div class="empty-state">
        <i class="fa-solid fa-box-open empty-icon"></i>
        <h3 class="empty-title">No Firearms Found</h3>
        <p class="empty-desc">Try clearing your filters or adding a new firearm to populate your armory database.</p>
        <button class="btn btn-primary" id="btnEmptyAdd" style="display: ${currentUserRole === 'readonly' ? 'none' : 'inline-flex'};" onclick="document.getElementById('btnAddFirearm').click()">
          <i class="fa-solid fa-plus"></i> Add Firearm
        </button>
      </div>
    `;
    return;
  }

  // Render cards
  filteredList.forEach(item => {
    const card = document.createElement('div');
    card.className = 'firearm-card';
    card.dataset.id = item.id;
    
    const conditionClass = `badge-${item.condition.toLowerCase()}`;
    const formattedVal = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(item.value);
    
    // Type icon setup
    const typeIcon = (item.type === 'Handgun') ? 'fa-crosshairs' : 'fa-gun';
    const typeText = item.type || 'Rifle';

    card.innerHTML = `
      <div class="card-image-container">
        <img src="${item.image || DEFAULT_IMAGE}" alt="${item.manufacturer} ${item.model}" class="firearm-card-img">
        <span class="card-value-badge">${formattedVal}</span>
        <span class="card-condition-badge ${conditionClass}">${item.condition}</span>
      </div>
      <div class="card-details">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.25rem;">
          <div class="card-manufacturer">${item.manufacturer}</div>
          <div style="display: flex; gap: 0.35rem;">
            <span style="font-size: 0.7rem; background: rgba(0, 240, 255, 0.08); padding: 0.15rem 0.4rem; border-radius: 4px; border: 1px solid rgba(0, 240, 255, 0.2); color: var(--color-accent);"><i class="fa-solid ${typeIcon}" style="font-size: 0.6rem;"></i> ${typeText}</span>
          </div>
        </div>
        <h3 class="card-title" title="${item.model}">${item.model}</h3>
        <div class="specs-grid">
          <div class="spec-item">
            <span class="spec-label">Caliber</span>
            <span class="spec-value">${item.caliber}</span>
          </div>
          <div class="spec-item">
            <span class="spec-label">Serial</span>
            <span class="spec-value">${item.serialNumber}</span>
          </div>
        </div>
        <div class="card-actions">
          <button class="btn btn-secondary btn-view" style="padding: 0.4rem;"><i class="fa-solid fa-circle-info"></i> Details</button>
        </div>
      </div>
    `;

    // Click handler for card
    card.querySelector('.btn-view').addEventListener('click', (e) => {
      e.stopPropagation();
      viewFirearmDetail(item.id);
    });

    card.addEventListener('click', () => {
      viewFirearmDetail(item.id);
    });

    gridEl.appendChild(card);
  });
}

// Chart.js Visualization Engine
function renderCharts() {
  const chartCtxM = document.getElementById('chartManufacturerValue').getContext('2d');
  const chartCtxC = document.getElementById('chartCaliberDistribution').getContext('2d');

  // Destroy previous instances to prevent overlaps
  if (manufacturerChartInstance) manufacturerChartInstance.destroy();
  if (caliberChartInstance) caliberChartInstance.destroy();

  if (firearmsList.length === 0) {
    // Empty charts handling (display placeholder text instead)
    renderEmptyChart(chartCtxM, 'Value by Manufacturer');
    renderEmptyChart(chartCtxC, 'Caliber Distribution');
    return;
  }

  // 1. Manufacturer Chart Data Aggregation
  const mfgValueMap = {};
  firearmsList.forEach(item => {
    const mfg = item.manufacturer.trim();
    mfgValueMap[mfg] = (mfgValueMap[mfg] || 0) + item.value;
  });

  // Sort and top 5 + "Others"
  const sortedMfgList = Object.entries(mfgValueMap).sort((a, b) => b[1] - a[1]);
  let mfgLabels = [];
  let mfgValues = [];
  
  if (sortedMfgList.length > 5) {
    const top5 = sortedMfgList.slice(0, 5);
    const othersValue = sortedMfgList.slice(5).reduce((sum, entry) => sum + entry[1], 0);
    mfgLabels = [...top5.map(e => e[0]), 'Others'];
    mfgValues = [...top5.map(e => e[1]), othersValue];
  } else {
    mfgLabels = sortedMfgList.map(e => e[0]);
    mfgValues = sortedMfgList.map(e => e[1]);
  }

  // 2. Caliber Chart Data Aggregation
  const caliberCountMap = {};
  firearmsList.forEach(item => {
    const cal = item.caliber.trim();
    caliberCountMap[cal] = (caliberCountMap[cal] || 0) + 1;
  });

  const sortedCalList = Object.entries(caliberCountMap).sort((a, b) => b[1] - a[1]);
  let calLabels = [];
  let calValues = [];

  if (sortedCalList.length > 5) {
    const top5 = sortedCalList.slice(0, 5);
    const othersCount = sortedCalList.slice(5).reduce((sum, entry) => sum + entry[1], 0);
    calLabels = [...top5.map(e => e[0]), 'Others'];
    calValues = [...top5.map(e => e[1]), othersCount];
  } else {
    calLabels = sortedCalList.map(e => e[0]);
    calValues = sortedCalList.map(e => e[1]);
  }

  // Render Manufacturer Chart (Bar Chart)
  manufacturerChartInstance = new Chart(chartCtxM, {
    type: 'bar',
    data: {
      labels: mfgLabels,
      datasets: [{
        label: 'Total Value ($)',
        data: mfgValues,
        backgroundColor: 'rgba(212, 163, 89, 0.6)',
        borderColor: '#d4a359',
        borderWidth: 1.5,
        borderRadius: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#0d111a',
          titleFont: { family: 'Space Grotesk' },
          bodyFont: { family: 'Inter' },
          borderColor: 'rgba(212, 163, 89, 0.4)',
          borderWidth: 1,
          callbacks: {
            label: function(context) {
              return `Value: $${context.raw.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
            }
          }
        }
      },
      scales: {
        y: {
          grid: { color: 'rgba(255, 255, 255, 0.05)' },
          ticks: {
            color: '#8a99ad',
            font: { family: 'Inter', size: 10 },
            callback: value => `$${value}`
          }
        },
        x: {
          grid: { display: false },
          ticks: {
            color: '#8a99ad',
            font: { family: 'Inter', size: 11 }
          }
        }
      }
    }
  });

  // Render Caliber Chart (Doughnut Chart)
  caliberChartInstance = new Chart(chartCtxC, {
    type: 'doughnut',
    data: {
      labels: calLabels,
      datasets: [{
        data: calValues,
        backgroundColor: [
          'rgba(0, 240, 255, 0.7)',
          'rgba(212, 163, 89, 0.7)',
          'rgba(59, 130, 246, 0.7)',
          'rgba(139, 92, 246, 0.7)',
          'rgba(16, 185, 129, 0.7)',
          'rgba(100, 116, 139, 0.7)'
        ],
        borderColor: '#0a0d13',
        borderWidth: 2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'right',
          labels: {
            color: '#8a99ad',
            font: { family: 'Inter', size: 11 },
            boxWidth: 12
          }
        },
        tooltip: {
          backgroundColor: '#0d111a',
          titleFont: { family: 'Space Grotesk' },
          bodyFont: { family: 'Inter' },
          borderColor: 'rgba(0, 240, 255, 0.3)',
          borderWidth: 1
        }
      }
    }
  });
}

// Render empty placeholders for charts
function renderEmptyChart(ctx, title) {
  // Clear canvas
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  
  ctx.canvas.height = 200;
  ctx.fillStyle = 'rgba(255,255,255,0.02)';
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  
  ctx.fillStyle = '#64748b';
  ctx.font = '12px Space Grotesk';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('NO DATA AVAILABLE', ctx.canvas.width / 2, ctx.canvas.height / 2);
}

// Backup & Settings Engine
function exportCollection() {
  if (firearmsList.length === 0) {
    alert('Your collection is empty. Nothing to export.');
    return;
  }

  try {
    const dataStr = JSON.stringify(firearmsList, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const dateStr = new Date().toISOString().split('T')[0];
    const link = document.createElement('a');
    link.href = url;
    link.download = `armory_backup_${dateStr}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error('Backup failed:', err);
    alert('Failed to export collection: ' + err.message);
  }
}

async function importCollection(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async (event) => {
    try {
      const importedData = JSON.parse(event.target.result);
      
      // Validate structure
      if (!Array.isArray(importedData)) {
        throw new Error('Backup file must be a JSON array of firearms.');
      }

      // Quick validate records
      importedData.forEach((item, index) => {
        if (!item.manufacturer) {
          throw new Error(`Item at index ${index} is missing required field: Manufacturer.`);
        }
        // Auto-fill empty/missing fields with defaults
        if (!item.model) item.model = 'N/A';
        if (!item.caliber) item.caliber = 'N/A';
        if (!item.type) item.type = 'Rifle';
        if (!item.condition) item.condition = 'Good';
        if (item.value === undefined || item.value === null) item.value = 0;
      });

      if (confirm(`You are importing ${importedData.length} records. This will replace all current database entries. Do you wish to proceed?`)) {
        await window.ArmoryDB.importFirearms(importedData);
        alert('Collection restored successfully!');
        closeModal(settingsModal);
        await loadFirearms();
      }
    } catch (err) {
      console.error('Import error:', err);
      alert('Error parsing backup file: ' + err.message);
    }
  };
  reader.readAsText(file);
}

async function wipeDatabase() {
  const confirm1 = confirm('WARNING: You are about to permanently delete all firearm records and images in this database. This action is irreversible. Do you want to proceed?');
  if (confirm1) {
    const confirm2 = confirm('Type YES to confirm permanent database destruction.');
    if (confirm2) {
      try {
        await window.ArmoryDB.clearAllFirearms();
        alert('Database cleared.');
        closeModal(settingsModal);
        await loadFirearms();
      } catch (err) {
        console.error('Wipe failed:', err);
        alert('Failed to clear database: ' + err.message);
      }
    }
  }
}

// --- REPORT GENERATION ENGINE ---

function openReportModal() {
  generateReport();
  openModal(reportModal);
}

function generateReport() {
  if (firearmsList.length === 0) {
    reportTableContainer.innerHTML = '<div style="text-align: center; padding: 2rem; color: var(--text-muted);">No records available to generate report.</div>';
    return;
  }

  // 1. Sort the list by Manufacturer, then Caliber, then Model
  const sorted = [...firearmsList].sort((a, b) => {
    const mfgCompare = (a.manufacturer || "").localeCompare(b.manufacturer || "");
    if (mfgCompare !== 0) return mfgCompare;
    
    const calCompare = (a.caliber || "").localeCompare(b.caliber || "");
    if (calCompare !== 0) return calCompare;
    
    return (a.model || "").localeCompare(b.model || "");
  });

  // 2. Build the table HTML
  let html = `
    <table class="report-table">
      <thead>
        <tr>
          <th>Model</th>
          <th>Serial Number</th>
          <th>Condition</th>
          <th style="text-align: right;">Value</th>
        </tr>
      </thead>
      <tbody>
  `;

  let currentMfg = null;
  let currentCal = null;

  // Trackers for subtotals
  let mfgSubtotalCount = 0;
  let mfgSubtotalValue = 0;
  let calSubtotalCount = 0;
  let calSubtotalValue = 0;
  let grandTotalCount = 0;
  let grandTotalValue = 0;

  function formatCurrency(val) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
  }

  // Helpers to output subtotal rows
  function closeCaliberGroup() {
    if (currentCal !== null) {
      html += `
        <tr class="report-subtotal-row report-subtotal-caliber">
          <td colspan="3">${currentMfg} - ${currentCal} Subtotal (${calSubtotalCount} items)</td>
          <td style="text-align: right;">${formatCurrency(calSubtotalValue)}</td>
        </tr>
      `;
      calSubtotalCount = 0;
      calSubtotalValue = 0;
    }
  }

  function closeMfgGroup() {
    if (currentMfg !== null) {
      html += `
        <tr class="report-subtotal-row report-subtotal-manufacturer">
          <td colspan="3">${currentMfg} Total (${mfgSubtotalCount} items)</td>
          <td style="text-align: right;">${formatCurrency(mfgSubtotalValue)}</td>
        </tr>
      `;
      mfgSubtotalCount = 0;
      mfgSubtotalValue = 0;
    }
  }

  // Process sorted list
  sorted.forEach(item => {
    const itemMfg = item.manufacturer || 'N/A';
    const itemCal = item.caliber || 'N/A';
    const itemVal = parseFloat(item.value) || 0;

    // Check control breaks
    if (itemMfg !== currentMfg) {
      closeCaliberGroup();
      closeMfgGroup();
      
      // Open new Mfg group
      currentMfg = itemMfg;
      html += `
        <tr class="report-group-header">
          <td colspan="4">${currentMfg}</td>
        </tr>
      `;
      
      // Open new Caliber group
      currentCal = itemCal;
      html += `
        <tr class="report-subgroup-header">
          <td colspan="4">${currentCal}</td>
        </tr>
      `;
    } else if (itemCal !== currentCal) {
      closeCaliberGroup();
      
      // Open new Caliber group
      currentCal = itemCal;
      html += `
        <tr class="report-subgroup-header">
          <td colspan="4">${currentCal}</td>
        </tr>
      `;
    }

    // Render individual item row
    html += `
      <tr class="report-item-row">
        <td>${item.model || 'N/A'}</td>
        <td>${item.serialNumber || 'N/A'}</td>
        <td>${item.condition || 'N/A'}</td>
        <td style="text-align: right;">${formatCurrency(itemVal)}</td>
      </tr>
    `;

    // Accumulate values
    calSubtotalCount++;
    calSubtotalValue += itemVal;
    mfgSubtotalCount++;
    mfgSubtotalValue += itemVal;
    grandTotalCount++;
    grandTotalValue += itemVal;
  });

  // Close final groups
  closeCaliberGroup();
  closeMfgGroup();

  // Render Grand Total row
  html += `
        <tr class="report-grand-total-row">
          <td colspan="3">GRAND TOTAL (${grandTotalCount} items)</td>
          <td style="text-align: right;">${formatCurrency(grandTotalValue)}</td>
        </tr>
      </tbody>
    </table>
  `;

  reportTableContainer.innerHTML = html;
}
