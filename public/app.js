let currentPage = 1;
const pageSize = 20;
let currentRestoreProfileId = '';
let currentTagFilter = null;
let currentSearchQuery = '';
let currentTagFilters = [];
let currentTagFilterMode = 'AND';
let roxyProfileNames = {};

async function fetchRoxyProfileNames() {
  try {
    const response = await fetch('/api/roxy-profile-names');
    if (!response.ok) {
      return roxyProfileNames;
    }
    const data = await response.json();
    if (data && typeof data === 'object') {
      roxyProfileNames = data;
    }
  } catch (error) {
    console.error('Error fetching Roxy profile names:', error);
  }
  return roxyProfileNames;
}

function formatProfileLabel(id) {
  const name = roxyProfileNames[id];
  return name ? `${name} (${id})` : id;
}

function initDarkMode() {
  const savedTheme = localStorage.getItem('darkMode');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const isDarkMode = savedTheme === 'true' || (savedTheme === null && prefersDark);

  if (isDarkMode) {
    document.body.classList.add('dark-mode');
    updateDarkModeIcon(true);
  }
}

function toggleDarkMode() {
  const isDarkMode = document.body.classList.toggle('dark-mode');
  localStorage.setItem('darkMode', isDarkMode);
  updateDarkModeIcon(isDarkMode);
}

const SUN_ICON = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>`;
const MOON_ICON = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`;

function updateDarkModeIcon(isDarkMode) {
  const icon = document.getElementById('darkModeIcon');
  icon.innerHTML = isDarkMode ? SUN_ICON : MOON_ICON;
}

function showToast(message, type = 'success') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('hiding');
    setTimeout(() => {
      container.removeChild(toast);
    }, 300);
  }, 3000);
}

function setButtonLoading(button, isLoading) {
  const textSpan = button.querySelector('.btn-text');
  if (isLoading) {
    button.disabled = true;
    const spinner = document.createElement('span');
    spinner.className = 'spinner';
    button.insertBefore(spinner, textSpan);
  } else {
    button.disabled = false;
    const spinner = button.querySelector('.spinner');
    if (spinner) {
      button.removeChild(spinner);
    }
  }
}

async function fetchProfiles(page = 1) {
  try {
    let url = `/api/profiles?page=${page}&pageSize=${pageSize}`;

    // Use multiple tag filtering if available, otherwise fall back to single tag filter
    if (currentTagFilters.length > 0) {
      url += `&tagIds=${currentTagFilters.join(',')}`;
      url += `&tagFilterMode=${currentTagFilterMode}`;
    } else if (currentTagFilter !== null) {
      url += `&tagId=${currentTagFilter}`;
    }

    if (currentSearchQuery && currentSearchQuery.trim() !== '') {
      url += `&search=${encodeURIComponent(currentSearchQuery.trim())}`;
    }
    const response = await fetch(url);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to fetch profiles');
    }

    renderProfiles(data);
    updatePagination(data);
    currentPage = page;
  } catch (error) {
    console.error('Error fetching profiles:', error);
    showToast(`Failed to load profiles: ${error.message}`, 'error');
  }
}

async function fetchTags() {
  try {
    const response = await fetch('/api/tags');
    const tags = await response.json();

    if (!response.ok) {
      throw new Error(tags.error || 'Failed to fetch tags');
    }

    renderTags(tags);
  } catch (error) {
    console.error('Error fetching tags:', error);
    showToast(`Failed to load tags: ${error.message}`, 'error');
  }
}

function renderTags(tags) {
  const tagsList = document.getElementById('tagsList');
  tagsList.innerHTML = '';

  tags.forEach((tag) => {
    const button = document.createElement('button');
    const isSelected = currentTagFilters.includes(tag.id);
    button.className = isSelected ? 'chip active' : 'chip';
    button.textContent = tag.name;
    button.dataset.tagId = tag.id;
    button.addEventListener('click', () => toggleTagFilter(tag.id));
    tagsList.appendChild(button);
  });
}

function toggleTagFilter(tagId) {
  const index = currentTagFilters.indexOf(tagId);
  if (index > -1) {
    // Tag is already selected, remove it
    currentTagFilters.splice(index, 1);
  } else {
    // Tag is not selected, add it
    currentTagFilters.push(tagId);
  }
  currentPage = 1;
  fetchProfiles(1);
  fetchTags();
}

function clearTagFilter() {
  currentTagFilter = null;
  currentTagFilters = [];
  currentPage = 1;
  fetchProfiles(1);
  fetchTags();
}

function setTagFilterMode(mode) {
  currentTagFilterMode = mode;
  updateTagFilterModeUI();
  if (currentTagFilters.length > 0) {
    currentPage = 1;
    fetchProfiles(1);
  }
}

function updateTagFilterModeUI() {
  const orBtn = document.getElementById('tagFilterModeOr');
  const andBtn = document.getElementById('tagFilterModeAnd');

  if (currentTagFilterMode === 'OR') {
    orBtn.classList.add('active');
    andBtn.classList.remove('active');
  } else {
    andBtn.classList.add('active');
    orBtn.classList.remove('active');
  }
}

function handleSearch() {
  const searchInput = document.getElementById('searchInput');
  currentSearchQuery = searchInput.value;
  currentPage = 1;
  fetchProfiles(1);
}

function clearSearch() {
  const searchInput = document.getElementById('searchInput');
  searchInput.value = '';
  currentSearchQuery = '';
  currentPage = 1;
  fetchProfiles(1);
}

function renderProfiles(data) {
  const tbody = document.getElementById('profilesBody');
  tbody.innerHTML = '';

  if (data.profiles.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="px-3 py-6 text-center" style="color: var(--text-faint); font-size: 12px;">No profiles found</td></tr>`;
    return;
  }

  data.profiles.forEach((profile) => {
    const row = document.createElement('tr');

    const tagsHtml =
      profile.tags && profile.tags.length > 0
        ? profile.tags
            .map((tag) => {
              const isActive = currentTagFilters.includes(tag.id);
              const cls = isActive ? 'chip active' : 'chip';
              return `
          <span class="${cls}" data-tag-id="${tag.id}" data-tag-name="${escapeHtml(tag.name)}">
            <span class="tag-name-clickable">${escapeHtml(tag.name)}</span>
            <button class="chip-remove remove-tag-btn" data-profile-id="${escapeHtml(profile.profileId)}" data-tag-id="${tag.id}" title="Remove tag" aria-label="Remove tag">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="pointer-events:none;"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </span>`;
            })
            .join('')
        : '';

    row.innerHTML = `
      <td><span class="mono" style="color: var(--text-primary); font-weight: 500;">${escapeHtml(profile.profileId)}</span></td>
      <td>
        <input type="text"
               value="${escapeHtml(profile.description || '')}"
               data-profile-id="${escapeHtml(profile.profileId)}"
               class="description-input row-description-input"
               placeholder="Add description...">
      </td>
      <td>
        <div class="flex flex-wrap items-center gap-1">
          ${tagsHtml}
          <button class="chip-add add-tag-btn" data-profile-id="${escapeHtml(profile.profileId)}" title="Add tag">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Add
          </button>
        </div>
      </td>
      <td>
        <div class="flex items-center gap-1">
          <span class="size-value mono" data-profile-id="${escapeHtml(profile.profileId)}" style="color: var(--text-secondary);">${formatSize(profile.backupSizeInBytes)}</span>
          <span class="refresh-size-icon" data-profile-id="${escapeHtml(profile.profileId)}" title="Recalculate size">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="pointer-events:none;"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
          </span>
        </div>
      </td>
      <td><span class="mono" style="color: var(--text-muted); font-size: 11.5px;">${formatDate(profile.createdAt)}</span></td>
      <td>
        <div class="flex items-center gap-1">
          <button class="action-btn success backup-to-btn" data-profile-id="${escapeHtml(profile.profileId)}" title="Backup">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="pointer-events:none;"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
            Backup
          </button>
          <button class="action-btn info restore-btn" data-profile-id="${escapeHtml(profile.profileId)}" title="Restore">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="pointer-events:none;"><path d="M3 9v4a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9"/><polyline points="7 12 12 17 17 12"/><line x1="12" y1="17" x2="12" y2="3"/></svg>
            Restore
          </button>
          <button class="action-btn warning run-btn" data-profile-id="${escapeHtml(profile.profileId)}" title="Run">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="0" stroke-linecap="round" stroke-linejoin="round" style="pointer-events:none;"><polygon points="6 4 20 12 6 20 6 4"/></svg>
            Run
          </button>
          <button class="action-btn danger delete-btn" data-profile-id="${escapeHtml(profile.profileId)}" title="Delete">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="pointer-events:none;"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            Delete
          </button>
        </div>
      </td>
    `;
    tbody.appendChild(row);
  });

  document.querySelectorAll('.description-input').forEach((input) => {
    let timeout;
    input.addEventListener('input', (e) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => updateDescription(e.target), 1000);
    });
  });

  document.querySelectorAll('.backup-to-btn').forEach((btn) => {
    btn.addEventListener('click', (e) =>
      openBackupModalWithTarget(e.currentTarget.dataset.profileId),
    );
  });

  document.querySelectorAll('.restore-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => openRestoreModal(e.currentTarget.dataset.profileId));
  });

  document.querySelectorAll('.run-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => startRunFlow(e.currentTarget.dataset.profileId));
  });

  document.querySelectorAll('.delete-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => confirmDeleteProfile(e.currentTarget.dataset.profileId));
  });

  document.querySelectorAll('.add-tag-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => openAddTagModal(e.currentTarget.dataset.profileId));
  });

  document.querySelectorAll('.remove-tag-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const target = e.currentTarget;
      removeTag(target.dataset.profileId, target.dataset.tagId);
    });
  });

  document.querySelectorAll('.tag-name-clickable').forEach((tagNameSpan) => {
    tagNameSpan.addEventListener('click', (e) => {
      e.stopPropagation();
      const tagSpan = e.target.closest('[data-tag-id]');
      if (tagSpan) {
        const tagId = Number.parseInt(tagSpan.dataset.tagId, 10);
        toggleTagFilter(tagId);
      }
    });
  });

  document.querySelectorAll('.refresh-size-icon').forEach((icon) => {
    icon.addEventListener('click', (e) => {
      recalculateProfileSize(e.currentTarget.dataset.profileId);
    });
  });
}

function updatePagination(data) {
  const pageInfo = document.getElementById('pageInfo');
  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');

  pageInfo.textContent = `Page ${data.page} of ${data.totalPages} · ${data.total} profile${data.total === 1 ? '' : 's'}`;
  prevBtn.disabled = data.page <= 1;
  nextBtn.disabled = data.page >= data.totalPages;
}

async function updateDescription(input) {
  const profileId = input.dataset.profileId;
  const description = input.value;

  try {
    const response = await fetch(`/api/profiles/${encodeURIComponent(profileId)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ description }),
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Failed to update description');
    }

    input.classList.add('saved');
    setTimeout(() => input.classList.remove('saved'), 1500);
  } catch (error) {
    console.error('Error updating description:', error);
    showToast(`Failed to update description: ${error.message}`, 'error');
  }
}

async function openBackupModal() {
  const modal = document.getElementById('backupModal');
  const sourceSelect = document.getElementById('profileSelect');
  const targetSelect = document.getElementById('targetProfileSelect');

  modal.classList.remove('hidden');
  sourceSelect.innerHTML = '<option value="">Loading...</option>';
  targetSelect.innerHTML = '<option value="">Create new backup</option>';

  try {
    const [availableResponse, backedUpResponse] = await Promise.all([
      fetch('/api/available-profiles'),
      fetch('/api/profiles?page=1&pageSize=1000'),
      fetchRoxyProfileNames(),
    ]);

    const availableProfiles = await availableResponse.json();
    const backedUpData = await backedUpResponse.json();

    if (!availableResponse.ok) {
      throw new Error(availableProfiles.error || 'Failed to fetch available profiles');
    }

    if (!backedUpResponse.ok) {
      throw new Error(backedUpData.error || 'Failed to fetch backed up profiles');
    }

    sourceSelect.innerHTML = '<option value="">Select a source profile</option>';
    availableProfiles.forEach((profile) => {
      const option = document.createElement('option');
      option.value = profile.name;
      option.textContent = formatProfileLabel(profile.name);
      sourceSelect.appendChild(option);
    });

    targetSelect.innerHTML = '<option value="">Create new backup</option>';
    backedUpData.profiles.forEach((profile) => {
      const option = document.createElement('option');
      option.value = profile.profileId;
      option.textContent = formatProfileLabel(profile.profileId);
      targetSelect.appendChild(option);
    });
  } catch (error) {
    console.error('Error fetching profiles:', error);
    showToast(`Failed to load profiles: ${error.message}`, 'error');
    modal.classList.add('hidden');
  }
}

async function openBackupModalWithTarget(targetProfileId) {
  const modal = document.getElementById('backupModal');
  const sourceSelect = document.getElementById('profileSelect');
  const targetSelect = document.getElementById('targetProfileSelect');

  modal.classList.remove('hidden');
  sourceSelect.innerHTML = '<option value="">Loading...</option>';
  targetSelect.innerHTML = '<option value="">Loading...</option>';

  try {
    const [availableResponse, backedUpResponse] = await Promise.all([
      fetch('/api/available-profiles'),
      fetch('/api/profiles?page=1&pageSize=1000'),
      fetchRoxyProfileNames(),
    ]);

    const availableProfiles = await availableResponse.json();
    const backedUpData = await backedUpResponse.json();

    if (!availableResponse.ok) {
      throw new Error(availableProfiles.error || 'Failed to fetch available profiles');
    }

    if (!backedUpResponse.ok) {
      throw new Error(backedUpData.error || 'Failed to fetch backed up profiles');
    }

    sourceSelect.innerHTML = '<option value="">Select a source profile</option>';
    availableProfiles.forEach((profile) => {
      const option = document.createElement('option');
      option.value = profile.name;
      option.textContent = formatProfileLabel(profile.name);
      sourceSelect.appendChild(option);
    });

    targetSelect.innerHTML = '<option value="">Create new backup</option>';
    backedUpData.profiles.forEach((profile) => {
      const option = document.createElement('option');
      option.value = profile.profileId;
      option.textContent = formatProfileLabel(profile.profileId);
      targetSelect.appendChild(option);
    });

    targetSelect.value = targetProfileId;
  } catch (error) {
    console.error('Error fetching profiles:', error);
    showToast(`Failed to load profiles: ${error.message}`, 'error');
    modal.classList.add('hidden');
  }
}

function closeBackupModal() {
  document.getElementById('backupModal').classList.add('hidden');
  document.getElementById('profileSelect').value = '';
  document.getElementById('targetProfileSelect').value = '';
  document.getElementById('descriptionInput').value = '';
}

async function confirmBackup() {
  const sourceProfileId = document.getElementById('profileSelect').value;
  const targetProfileId = document.getElementById('targetProfileSelect').value;
  const description = document.getElementById('descriptionInput').value;
  const confirmBtn = document.getElementById('confirmBackupBtn');

  if (!sourceProfileId) {
    showToast('Please select a source profile', 'error');
    return;
  }

  if (targetProfileId) {
    const confirmModal = document.createElement('div');
    confirmModal.className = 'modal-overlay';
    confirmModal.innerHTML = `
      <div class="modal-card">
        <div class="modal-header">Confirm overwrite</div>
        <div class="modal-body">
          <p style="color: var(--text-secondary); margin-bottom: 10px;">Overwrite existing backup: <span class="mono" style="color: var(--text-primary); font-weight: 500;">${escapeHtml(targetProfileId)}</span>?</p>
          <div class="alert-warning">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0; margin-top:1px;"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            <span>All existing files will be deleted and replaced.</span>
          </div>
        </div>
        <div class="modal-footer">
          <button id="cancelOverwrite" class="btn">Cancel</button>
          <button id="proceedOverwrite" class="btn-danger">Overwrite</button>
        </div>
      </div>
    `;
    document.body.appendChild(confirmModal);

    confirmModal.querySelector('#cancelOverwrite').addEventListener('click', () => {
      document.body.removeChild(confirmModal);
    });

    confirmModal.querySelector('#proceedOverwrite').addEventListener('click', async () => {
      document.body.removeChild(confirmModal);
      await performBackup(sourceProfileId, targetProfileId, description, confirmBtn);
    });
  } else {
    await performBackup(sourceProfileId, targetProfileId, description, confirmBtn);
  }
}

async function performBackup(sourceProfileId, targetProfileId, description, confirmBtn) {
  setButtonLoading(confirmBtn, true);

  try {
    const requestBody = { sourceProfileId, description };
    if (targetProfileId) {
      requestBody.targetProfileId = targetProfileId;
    }

    const response = await fetch('/api/backup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to backup profile');
    }

    showToast('Profile backed up successfully!');
    closeBackupModal();
    fetchProfiles(currentPage);
  } catch (error) {
    console.error('Error backing up profile:', error);
    showToast(`Failed to backup profile: ${error.message}`, 'error');
  } finally {
    setButtonLoading(confirmBtn, false);
  }
}

async function openRestoreModal(profileId) {
  currentRestoreProfileId = profileId;
  const modal = document.getElementById('restoreModal');
  const select = document.getElementById('targetFolderSelect');
  const profileIdSpan = document.getElementById('restoreProfileId');

  modal.classList.remove('hidden');
  profileIdSpan.textContent = profileId;
  select.innerHTML = '<option value="">Loading...</option>';

  try {
    const [response] = await Promise.all([
      fetch('/api/available-profiles'),
      fetchRoxyProfileNames(),
    ]);
    const profiles = await response.json();

    if (!response.ok) {
      throw new Error(profiles.error || 'Failed to fetch available profiles');
    }

    select.innerHTML = '<option value="">Select a target folder</option>';
    profiles.forEach((profile) => {
      const option = document.createElement('option');
      option.value = profile.name;
      option.textContent = formatProfileLabel(profile.name);
      select.appendChild(option);
    });
  } catch (error) {
    console.error('Error fetching available profiles:', error);
    showToast(`Failed to load available profiles: ${error.message}`, 'error');
    modal.classList.add('hidden');
  }
}

function closeRestoreModal() {
  document.getElementById('restoreModal').classList.add('hidden');
  document.getElementById('targetFolderSelect').value = '';
  document.getElementById('customTargetFolderInput').value = '';
  currentRestoreProfileId = '';
}

async function confirmRestore() {
  const customTargetFolder = document.getElementById('customTargetFolderInput').value.trim();
  const selectedTargetFolder = document.getElementById('targetFolderSelect').value;
  const targetFolderId = customTargetFolder || selectedTargetFolder;
  const confirmBtn = document.getElementById('confirmRestoreBtn');

  if (!targetFolderId) {
    showToast('Please select a target folder or enter a custom path', 'error');
    return;
  }

  setButtonLoading(confirmBtn, true);

  try {
    const response = await fetch('/api/restore', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ profileId: currentRestoreProfileId, targetFolderId }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to restore profile');
    }

    showToast('Profile restored successfully!');
    closeRestoreModal();
  } catch (error) {
    console.error('Error restoring profile:', error);
    showToast(`Failed to restore profile: ${error.message}`, 'error');
  } finally {
    setButtonLoading(confirmBtn, false);
  }
}

function setRunStepState(stepKey, state, detail) {
  const stepEl = document.querySelector(`#runSteps .run-step[data-step="${stepKey}"]`);
  if (!stepEl) return;
  stepEl.classList.remove('is-running', 'is-done', 'is-error');
  if (state === 'running') stepEl.classList.add('is-running');
  if (state === 'done') stepEl.classList.add('is-done');
  if (state === 'error') stepEl.classList.add('is-error');

  const iconEl = stepEl.querySelector('.run-step-icon');
  const originalNumber = stepEl.dataset.stepNumber || iconEl.dataset.number || iconEl.textContent;
  if (!iconEl.dataset.number) iconEl.dataset.number = originalNumber;
  if (state === 'running') {
    iconEl.innerHTML =
      '<span class="spinner" style="width:11px;height:11px;border-color:currentColor;border-top-color:transparent;"></span>';
  } else if (state === 'done') {
    iconEl.textContent = '✓';
  } else if (state === 'error') {
    iconEl.textContent = '✕';
  } else {
    iconEl.textContent = iconEl.dataset.number;
  }

  const detailEl = stepEl.querySelector('[data-step-detail]');
  if (detailEl) {
    detailEl.textContent = detail || '';
  }
}

function resetRunSteps() {
  for (const key of ['create', 'restore', 'open']) {
    setRunStepState(key, 'pending', '');
  }
}

function openRunModal(profileId) {
  const modal = document.getElementById('runModal');
  document.getElementById('runProfileId').textContent = profileId;
  resetRunSteps();
  const closeBtn = document.getElementById('closeRunBtn');
  closeBtn.disabled = true;
  modal.classList.remove('hidden');
}

function closeRunModal() {
  document.getElementById('runModal').classList.add('hidden');
}

async function startRunFlow(profileId) {
  openRunModal(profileId);

  let dirId = '';
  let workspaceId;

  try {
    setRunStepState('create', 'running', '');
    const createResp = await fetch('/api/roxy/create-profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sourceProfileId: profileId,
        windowName: `Run from ${profileId.slice(0, 8)}`,
      }),
    });
    const createData = await createResp.json();
    if (!createResp.ok) throw new Error(createData.error || 'Failed to create Roxy profile');
    dirId = createData.dirId;
    workspaceId = createData.workspaceId;
    let createDetail;
    if (createData.reused) {
      createDetail = `Reused existing profile: ${dirId}`;
    } else if (createData.replacedPrevious) {
      createDetail = `Replaced previous profile. New: ${dirId}`;
    } else {
      createDetail = `Created new profile: ${dirId}`;
    }
    setRunStepState('create', 'done', createDetail);

    setRunStepState('restore', 'running', `Target: ${dirId}`);
    const restoreResp = await fetch('/api/restore', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ profileId, targetFolderId: dirId }),
    });
    const restoreData = await restoreResp.json();
    if (!restoreResp.ok) throw new Error(restoreData.error || 'Failed to restore backup');
    setRunStepState('restore', 'done', `Restored into ${dirId}`);

    setRunStepState('open', 'running', '');
    const openResp = await fetch('/api/roxy/open-profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dirId, workspaceId }),
    });
    const openData = await openResp.json();
    if (!openResp.ok) throw new Error(openData.error || 'Failed to open browser');
    const detail = openData.http ? `Browser running (${openData.http})` : 'Browser running';
    setRunStepState('open', 'done', detail);

    showToast('Profile is running!');
  } catch (error) {
    console.error('Run flow failed:', error);
    const runningStep = document.querySelector('#runSteps .run-step.is-running');
    if (runningStep) {
      setRunStepState(runningStep.dataset.step, 'error', error.message);
    }
    showToast(`Run failed: ${error.message}`, 'error');
  } finally {
    document.getElementById('closeRunBtn').disabled = false;
  }
}

function formatDate(dateString) {
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day}_${hours}:${minutes}:${seconds}`;
}

function formatSize(backupSizeInBytes) {
  if (backupSizeInBytes === null || backupSizeInBytes === undefined) {
    return 'N/A';
  }
  // Convert BigInt to Number for calculation
  const sizeInBytes =
    typeof backupSizeInBytes === 'bigint' ? Number(backupSizeInBytes) : backupSizeInBytes;
  const sizeInMB = (sizeInBytes / (1024 * 1024)).toFixed(2);
  return `${sizeInMB} MB`;
}

async function recalculateProfileSize(profileId) {
  const icon = document.querySelector(`.refresh-size-icon[data-profile-id="${profileId}"]`);
  const sizeValue = document.querySelector(`.size-value[data-profile-id="${profileId}"]`);

  if (!icon || !sizeValue) {
    return;
  }

  const originalHtml = icon.innerHTML;
  icon.innerHTML = '<span class="spinner" style="width:11px;height:11px;"></span>';
  icon.style.cursor = 'wait';
  icon.style.pointerEvents = 'none';

  try {
    const response = await fetch(
      `/api/profiles/${encodeURIComponent(profileId)}/recalculate-size`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      },
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to recalculate size');
    }

    const sizeInBytes = BigInt(data.backupSizeInBytes);
    sizeValue.textContent = formatSize(sizeInBytes);

    showToast('Size recalculated successfully!');
  } catch (error) {
    console.error('Error recalculating size:', error);
    showToast(`Failed to recalculate size: ${error.message}`, 'error');
  } finally {
    icon.innerHTML = originalHtml;
    icon.style.cursor = 'pointer';
    icon.style.pointerEvents = 'auto';
  }
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

async function confirmDeleteProfile(profileId) {
  const confirmModal = document.createElement('div');
  confirmModal.className = 'modal-overlay';
  confirmModal.innerHTML = `
    <div class="modal-card">
      <div class="modal-header">Delete profile</div>
      <div class="modal-body">
        <p style="color: var(--text-secondary); margin-bottom: 10px;">Permanently delete <span class="mono" style="color: var(--text-primary); font-weight: 500;">${escapeHtml(profileId)}</span>?</p>
        <div class="alert-danger">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0; margin-top:1px;"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          <span>Backup files and the database record will be removed. This cannot be undone.</span>
        </div>
      </div>
      <div class="modal-footer">
        <button id="cancelDelete" class="btn">Cancel</button>
        <button id="proceedDelete" class="btn-danger">
          <span class="btn-text">Delete</span>
        </button>
      </div>
    </div>
  `;
  document.body.appendChild(confirmModal);

  confirmModal.querySelector('#cancelDelete').addEventListener('click', () => {
    document.body.removeChild(confirmModal);
  });

  confirmModal.querySelector('#proceedDelete').addEventListener('click', async () => {
    const deleteBtn = confirmModal.querySelector('#proceedDelete');
    setButtonLoading(deleteBtn, true);

    try {
      const response = await fetch(`/api/profiles/${encodeURIComponent(profileId)}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete profile');
      }

      showToast('Profile deleted successfully!');
      document.body.removeChild(confirmModal);
      fetchProfiles(currentPage);
    } catch (error) {
      console.error('Error deleting profile:', error);
      showToast(`Failed to delete profile: ${error.message}`, 'error');
      setButtonLoading(deleteBtn, false);
    }
  });
}

async function openAddTagModal(profileId) {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal-card">
      <div class="modal-header">Add tag</div>
      <div class="modal-body">
        <div class="field">
          <span class="modal-label">Profile</span>
          <div class="mono" style="color: var(--text-primary); font-weight: 500;">${escapeHtml(profileId)}</div>
        </div>
        <div class="field">
          <label for="addTagInput" class="modal-label">Tag name(s)</label>
          <input type="text" id="addTagInput" class="w-full" placeholder="tag1, tag2, ...">
          <p class="modal-help">Separate multiple tags with commas.</p>
        </div>
      </div>
      <div class="modal-footer">
        <button id="cancelAddTag" class="btn">Cancel</button>
        <button id="confirmAddTag" class="btn-primary">
          <span class="btn-text">Add</span>
        </button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  const input = modal.querySelector('#addTagInput');
  const confirmBtn = modal.querySelector('#confirmAddTag');
  const cancelBtn = modal.querySelector('#cancelAddTag');
  input.focus();

  const close = () => {
    document.removeEventListener('keydown', escHandler);
    if (modal.parentNode) {
      document.body.removeChild(modal);
    }
  };

  const escHandler = (e) => {
    if (e.key === 'Escape') {
      close();
    }
  };
  document.addEventListener('keydown', escHandler);

  cancelBtn.addEventListener('click', close);

  const submit = async () => {
    const tagInput = input.value;
    if (!tagInput || tagInput.trim() === '') {
      close();
      return;
    }

    const tagNames = tagInput
      .split(',')
      .map((tag) => tag.trim())
      .filter((tag) => tag !== '');

    if (tagNames.length === 0) {
      close();
      return;
    }

    setButtonLoading(confirmBtn, true);

    try {
      let successCount = 0;
      let failCount = 0;
      const errors = [];

      for (const tagName of tagNames) {
        try {
          const response = await fetch(`/api/profiles/${encodeURIComponent(profileId)}/tags`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tagName }),
          });

          const data = await response.json();

          if (!response.ok) {
            throw new Error(data.error || 'Failed to add tag');
          }

          successCount++;
        } catch (error) {
          failCount++;
          errors.push(`${tagName}: ${error.message}`);
        }
      }

      if (successCount > 0) {
        const message =
          tagNames.length === 1
            ? 'Tag added successfully!'
            : `${successCount} tag(s) added successfully!`;
        showToast(message);
        fetchProfiles(currentPage);
        fetchTags();
      }

      if (failCount > 0) {
        const errorMessage =
          failCount === 1 ? `Failed to add tag: ${errors[0]}` : `Failed to add ${failCount} tag(s)`;
        showToast(errorMessage, 'error');
      }

      close();
    } catch (error) {
      console.error('Error adding tag:', error);
      showToast(`Failed to add tag: ${error.message}`, 'error');
      setButtonLoading(confirmBtn, false);
    }
  };

  confirmBtn.addEventListener('click', submit);

  input.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      submit();
    }
  });
}

async function removeTag(profileId, tagId) {
  try {
    const response = await fetch(
      `/api/profiles/${encodeURIComponent(profileId)}/tags/${encodeURIComponent(tagId)}`,
      {
        method: 'DELETE',
      },
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to remove tag');
    }

    showToast('Tag removed successfully!');
    fetchProfiles(currentPage);
    fetchTags();
  } catch (error) {
    console.error('Error removing tag:', error);
    showToast(`Failed to remove tag: ${error.message}`, 'error');
  }
}

async function calculateTotalSize() {
  const calculateBtn = document.getElementById('calculateSizeBtn');
  setButtonLoading(calculateBtn, true);

  try {
    const response = await fetch('/api/backup-size');
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to calculate backup size');
    }

    const totalSizeBytes = data.totalSizeBytes;
    const totalSizeMB = (totalSizeBytes / (1024 * 1024)).toFixed(2);
    const totalSizeGB = (totalSizeBytes / (1024 * 1024 * 1024)).toFixed(2);

    const message = `Total Backup Size: ${totalSizeMB} MB (${totalSizeGB} GB)`;
    showToast(message);
  } catch (error) {
    console.error('Error calculating total size:', error);
    showToast(`Failed to calculate total size: ${error.message}`, 'error');
  } finally {
    setButtonLoading(calculateBtn, false);
  }
}

document.getElementById('calculateSizeBtn').addEventListener('click', calculateTotalSize);
document.getElementById('backupBtn').addEventListener('click', openBackupModal);
document.getElementById('cancelBackupBtn').addEventListener('click', closeBackupModal);
document.getElementById('confirmBackupBtn').addEventListener('click', confirmBackup);
document.getElementById('cancelRestoreBtn').addEventListener('click', closeRestoreModal);
document.getElementById('confirmRestoreBtn').addEventListener('click', confirmRestore);
document.getElementById('clearTagFilter').addEventListener('click', clearTagFilter);
document.getElementById('tagFilterModeOr').addEventListener('click', () => setTagFilterMode('OR'));
document
  .getElementById('tagFilterModeAnd')
  .addEventListener('click', () => setTagFilterMode('AND'));

const searchInput = document.getElementById('searchInput');
searchInput.addEventListener('input', () => {
  handleSearch();
});

searchInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    handleSearch();
  }
});

document.getElementById('clearSearchBtn').addEventListener('click', clearSearch);

document.getElementById('prevBtn').addEventListener('click', () => {
  if (currentPage > 1) {
    fetchProfiles(currentPage - 1);
  }
});

document.getElementById('nextBtn').addEventListener('click', () => {
  fetchProfiles(currentPage + 1);
});

document.getElementById('darkModeToggle').addEventListener('click', toggleDarkMode);
document.getElementById('closeRunBtn').addEventListener('click', closeRunModal);

initDarkMode();
fetchProfiles(1);
fetchTags();
