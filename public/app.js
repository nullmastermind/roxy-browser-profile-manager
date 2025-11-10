let currentPage = 1;
const pageSize = 20;
let currentRestoreProfileId = '';
let currentTagFilter = null;
let currentSearchQuery = '';
let currentTagFilters = [];
let currentTagFilterMode = 'AND';

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

function updateDarkModeIcon(isDarkMode) {
  const icon = document.getElementById('darkModeIcon');
  icon.textContent = isDarkMode ? '[LIGHT]' : '[DARK]';
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
    button.style.padding = '3px 8px';
    button.style.border = '1px solid var(--border-primary)';
    if (isSelected) {
      button.style.backgroundColor = 'var(--bg-tertiary)';
      button.style.color = 'var(--text-primary)';
      button.style.fontWeight = 'bold';
      button.textContent = `[${tag.name.toUpperCase()}]`;
    } else {
      button.style.backgroundColor = 'var(--bg-secondary)';
      button.style.color = 'var(--text-tertiary)';
      button.textContent = tag.name.toUpperCase();
    }
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
    orBtn.style.backgroundColor = 'var(--bg-tertiary)';
    orBtn.style.color = 'var(--text-primary)';
    orBtn.style.fontWeight = 'bold';
    andBtn.style.backgroundColor = 'var(--bg-secondary)';
    andBtn.style.color = 'var(--text-tertiary)';
    andBtn.style.fontWeight = 'normal';
  } else {
    andBtn.style.backgroundColor = 'var(--bg-tertiary)';
    andBtn.style.color = 'var(--text-primary)';
    andBtn.style.fontWeight = 'bold';
    orBtn.style.backgroundColor = 'var(--bg-secondary)';
    orBtn.style.color = 'var(--text-tertiary)';
    orBtn.style.fontWeight = 'normal';
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
    tbody.innerHTML = `<tr><td colspan="5" class="px-3 py-2 text-center" style="color: var(--text-secondary); border-bottom: 1px solid var(--border-secondary); font-size: 11px;">// NO_PROFILES_FOUND</td></tr>`;
    return;
  }

  data.profiles.forEach((profile) => {
    const row = document.createElement('tr');
    row.style.borderBottom = '1px solid var(--border-secondary)';
    row.addEventListener('mouseenter', () => {
      row.style.backgroundColor = 'var(--bg-hover)';
    });
    row.addEventListener('mouseleave', () => {
      row.style.backgroundColor = '';
    });

    const tagsHtml =
      profile.tags && profile.tags.length > 0
        ? profile.tags
            .map((tag) => {
              const isActive = currentTagFilters.includes(tag.id);
              const tagStyle = isActive
                ? 'background-color: var(--bg-tertiary); color: var(--text-primary); border: 1px solid var(--border-primary); font-weight: bold;'
                : 'background-color: var(--bg-secondary); color: var(--text-tertiary); border: 1px solid var(--border-primary);';

              return `
          <span class="inline-flex items-center gap-1 px-1 py-0.5 mr-1 mb-1 cursor-pointer" style="${tagStyle} font-size: 10px;" data-tag-id="${tag.id}" data-tag-name="${escapeHtml(tag.name)}">
            <span class="tag-name-clickable">${isActive ? `[${escapeHtml(tag.name.toUpperCase())}]` : escapeHtml(tag.name.toUpperCase())}</span>
            <button class="remove-tag-btn" data-profile-id="${escapeHtml(profile.profileId)}" data-tag-id="${tag.id}" title="Remove tag" style="color: var(--console-red); font-weight: bold;">x</button>
          </span>
        `;
            })
            .join('')
        : '';

    row.innerHTML = `
      <td class="px-3 py-1" style="color: var(--text-primary); border-right: 1px solid var(--border-secondary); width: 15%; font-size: 11px; font-weight: bold;">${escapeHtml(profile.profileId)}</td>
      <td class="px-3 py-1" style="color: var(--text-secondary); border-right: 1px solid var(--border-secondary); width: 30%;">
        <input type="text"
               value="${escapeHtml(profile.description || '')}"
               data-profile-id="${escapeHtml(profile.profileId)}"
               class="description-input w-full px-2 py-1 focus:outline-none"
               style="border: 1px solid var(--border-primary); background-color: var(--bg-primary); color: var(--text-primary); font-size: 11px;"
               placeholder="description...">
      </td>
      <td class="px-3 py-1" style="color: var(--text-secondary); border-right: 1px solid var(--border-secondary); width: 15%;">
        <div class="flex flex-wrap items-center gap-1">
          ${tagsHtml}
          <button class="add-tag-btn" data-profile-id="${escapeHtml(profile.profileId)}" title="Add tag" style="border: 1px solid var(--border-primary); background-color: var(--bg-secondary); color: var(--text-tertiary); padding: 2px 6px; font-size: 10px;">[+]</button>
        </div>
      </td>
      <td class="px-3 py-1" style="color: var(--text-secondary); border-right: 1px solid var(--border-secondary); width: 15%; font-size: 10px;">${formatDate(profile.createdAt)}</td>
      <td class="px-3 py-1" style="width: 25%; font-size: 10px;">
        <button class="backup-to-btn mr-2" data-profile-id="${escapeHtml(profile.profileId)}" style="color: var(--console-green); background: none; border: none; padding: 0; font-weight: bold;">
          [BACKUP]
        </button>
        <button class="restore-btn mr-2" data-profile-id="${escapeHtml(profile.profileId)}" style="color: var(--console-blue); background: none; border: none; padding: 0; font-weight: bold;">
          [RESTORE]
        </button>
        <button class="delete-btn" data-profile-id="${escapeHtml(profile.profileId)}" style="color: var(--console-red); background: none; border: none; padding: 0; font-weight: bold;">
          [DELETE]
        </button>
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
    btn.addEventListener('click', (e) => openBackupModalWithTarget(e.target.dataset.profileId));
  });

  document.querySelectorAll('.restore-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => openRestoreModal(e.target.dataset.profileId));
  });

  document.querySelectorAll('.delete-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => confirmDeleteProfile(e.target.dataset.profileId));
  });

  document.querySelectorAll('.add-tag-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => openAddTagModal(e.target.dataset.profileId));
  });

  document.querySelectorAll('.remove-tag-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      removeTag(e.target.dataset.profileId, e.target.dataset.tagId);
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
}

function updatePagination(data) {
  const pageInfo = document.getElementById('pageInfo');
  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');

  pageInfo.textContent = `PAGE: ${data.page}/${data.totalPages} | TOTAL: ${data.total}`;
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

    input.classList.add('border-green-500');
    setTimeout(() => input.classList.remove('border-green-500'), 2000);
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
      option.textContent = profile.name;
      sourceSelect.appendChild(option);
    });

    targetSelect.innerHTML = '<option value="">Create new backup</option>';
    backedUpData.profiles.forEach((profile) => {
      const option = document.createElement('option');
      option.value = profile.profileId;
      option.textContent = profile.profileId;
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
      option.textContent = profile.name;
      sourceSelect.appendChild(option);
    });

    targetSelect.innerHTML = '<option value="">Create new backup</option>';
    backedUpData.profiles.forEach((profile) => {
      const option = document.createElement('option');
      option.value = profile.profileId;
      option.textContent = profile.profileId;
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
    confirmModal.className = 'fixed inset-0 flex items-center justify-center';
    confirmModal.style.backgroundColor = 'var(--modal-overlay)';
    confirmModal.innerHTML = `
      <div class="p-4 max-w-md" style="background-color: var(--bg-secondary); border: 2px solid var(--border-primary);">
        <h3 class="mb-3 pb-2" style="color: var(--text-primary); border-bottom: 2px solid var(--border-primary); font-size: 12px; font-weight: bold; letter-spacing: 1px;">&gt; CONFIRM_OVERWRITE</h3>
        <p class="mb-4" style="color: var(--text-tertiary); font-size: 11px;">OVERWRITE BACKUP: <strong style="color: var(--text-primary);">${escapeHtml(targetProfileId)}</strong></p>
        <p class="mb-4" style="color: var(--console-orange); font-size: 10px; font-weight: bold;">! WARNING: All existing files will be deleted and replaced</p>
        <div class="flex gap-2 justify-end pt-2" style="border-top: 2px solid var(--border-primary);">
          <button id="cancelOverwrite" style="background-color: var(--bg-tertiary); color: var(--text-tertiary); padding: 4px 12px;">[ESC]</button>
          <button id="proceedOverwrite" style="background-color: var(--bg-tertiary); color: var(--console-orange); padding: 4px 12px; font-weight: bold;">[PROCEED]</button>
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
    const response = await fetch('/api/available-profiles');
    const profiles = await response.json();

    if (!response.ok) {
      throw new Error(profiles.error || 'Failed to fetch available profiles');
    }

    select.innerHTML = '<option value="">Select a target folder</option>';
    profiles.forEach((profile) => {
      const option = document.createElement('option');
      option.value = profile.name;
      option.textContent = profile.name;
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

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

async function confirmDeleteProfile(profileId) {
  const confirmModal = document.createElement('div');
  confirmModal.className = 'fixed inset-0 flex items-center justify-center';
  confirmModal.style.backgroundColor = 'var(--modal-overlay)';
  confirmModal.innerHTML = `
    <div class="p-4 max-w-md" style="background-color: var(--bg-secondary); border: 2px solid var(--border-primary);">
      <h3 class="mb-3 pb-2" style="color: var(--text-primary); border-bottom: 2px solid var(--border-primary); font-size: 12px; font-weight: bold; letter-spacing: 1px;">&gt; CONFIRM_DELETE</h3>
      <p class="mb-4" style="color: var(--text-tertiary); font-size: 11px;">DELETE PROFILE: <strong style="color: var(--text-primary);">${escapeHtml(profileId)}</strong></p>
      <p class="mb-4" style="color: var(--console-red); font-size: 10px; font-weight: bold;">! WARNING: This will permanently delete backup files and database record</p>
      <div class="flex gap-2 justify-end pt-2" style="border-top: 2px solid var(--border-primary);">
        <button id="cancelDelete" style="background-color: var(--bg-tertiary); color: var(--text-tertiary); padding: 4px 12px;">[ESC]</button>
        <button id="proceedDelete" style="background-color: var(--bg-tertiary); color: var(--console-red); padding: 4px 12px; font-weight: bold;">
          <span class="btn-text">[DELETE]</span>
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
  const tagInput = prompt('Enter tag name(s) (separate multiple tags with commas):');
  if (!tagInput || tagInput.trim() === '') {
    return;
  }

  const tagNames = tagInput
    .split(',')
    .map((tag) => tag.trim())
    .filter((tag) => tag !== '');

  if (tagNames.length === 0) {
    return;
  }

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
  } catch (error) {
    console.error('Error adding tag:', error);
    showToast(`Failed to add tag: ${error.message}`, 'error');
  }
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

initDarkMode();
fetchProfiles(1);
fetchTags();
