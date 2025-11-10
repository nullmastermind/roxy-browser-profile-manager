let currentPage = 1;
const pageSize = 20;
let currentRestoreProfileId = '';
let currentTagFilter = null;
let currentSearchQuery = '';

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
    if (currentTagFilter !== null) {
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
    button.className = `px-2 py-1 text-xs border ${
      currentTagFilter === tag.id
        ? 'bg-blue-600 text-white border-blue-700'
        : 'bg-white text-gray-700 border-gray-400 hover:bg-gray-100'
    }`;
    button.textContent = tag.name;
    button.dataset.tagId = tag.id;
    button.addEventListener('click', () => filterByTag(tag.id));
    tagsList.appendChild(button);
  });
}

function filterByTag(tagId) {
  if (currentTagFilter === tagId) {
    currentTagFilter = null;
  } else {
    currentTagFilter = tagId;
  }
  currentPage = 1;
  fetchProfiles(1);
  fetchTags();
}

function clearTagFilter() {
  currentTagFilter = null;
  currentPage = 1;
  fetchProfiles(1);
  fetchTags();
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
    tbody.innerHTML =
      '<tr><td colspan="5" class="px-4 py-3 text-center text-gray-500 border-b border-gray-200">No profiles found</td></tr>';
    return;
  }

  data.profiles.forEach((profile) => {
    const row = document.createElement('tr');
    row.className = 'border-b border-gray-200 hover:bg-gray-50';

    const tagsHtml =
      profile.tags && profile.tags.length > 0
        ? profile.tags
            .map((tag) => {
              const isActive = currentTagFilter === tag.id;
              const tagClasses = isActive
                ? 'inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-blue-600 text-white border border-blue-700 mr-1 mb-1 cursor-pointer hover:bg-blue-700'
                : 'inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-blue-100 text-blue-800 border border-blue-300 mr-1 mb-1 cursor-pointer hover:bg-blue-200';

              return `
          <span class="${tagClasses}" data-tag-id="${tag.id}" data-tag-name="${escapeHtml(tag.name)}">
            <span class="tag-name-clickable">${escapeHtml(tag.name)}</span>
            <button class="remove-tag-btn hover:text-red-600" data-profile-id="${escapeHtml(profile.profileId)}" data-tag-id="${tag.id}" title="Remove tag">×</button>
          </span>
        `;
            })
            .join('')
        : '';

    row.innerHTML = `
      <td class="px-4 py-2 text-sm font-medium text-gray-900 border-r border-gray-200" style="width: 15%;">${escapeHtml(profile.profileId)}</td>
      <td class="px-4 py-2 text-sm text-gray-500 border-r border-gray-200" style="width: 30%;">
        <input type="text"
               value="${escapeHtml(profile.description || '')}"
               data-profile-id="${escapeHtml(profile.profileId)}"
               class="description-input w-full px-2 py-1 border border-gray-300 focus:outline-none focus:border-blue-500"
               placeholder="Add description">
      </td>
      <td class="px-4 py-2 text-sm text-gray-500 border-r border-gray-200" style="width: 15%;">
        <div class="flex flex-wrap items-center gap-1">
          ${tagsHtml}
          <button class="add-tag-btn text-xs text-blue-600 hover:text-blue-900 border border-blue-300 px-1.5 py-0.5" data-profile-id="${escapeHtml(profile.profileId)}" title="Add tag">+</button>
        </div>
      </td>
      <td class="px-4 py-2 text-sm text-gray-500 border-r border-gray-200" style="width: 15%;">${formatDate(profile.createdAt)}</td>
      <td class="px-4 py-2 text-sm font-medium" style="width: 25%;">
        <button class="backup-to-btn text-green-600 hover:text-green-900 font-medium mr-3" data-profile-id="${escapeHtml(profile.profileId)}">
          Backup To
        </button>
        <button class="restore-btn text-blue-600 hover:text-blue-900 font-medium mr-3" data-profile-id="${escapeHtml(profile.profileId)}">
          Restore
        </button>
        <button class="delete-btn text-red-600 hover:text-red-900 font-medium" data-profile-id="${escapeHtml(profile.profileId)}">
          Delete
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
        filterByTag(tagId);
      }
    });
  });
}

function updatePagination(data) {
  const pageInfo = document.getElementById('pageInfo');
  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');

  pageInfo.textContent = `Page ${data.page} of ${data.totalPages} (${data.total} total profiles)`;
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
    confirmModal.className =
      'fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center';
    confirmModal.innerHTML = `
      <div class="bg-white border border-gray-400 p-4 max-w-md">
        <h3 class="text-lg font-medium text-gray-900 mb-3 pb-2 border-b border-gray-300">Confirm Overwrite</h3>
        <p class="text-sm text-gray-700 mb-4">Are you sure you want to overwrite backup <strong>${escapeHtml(targetProfileId)}</strong>? All existing files in this backup will be deleted and replaced.</p>
        <div class="flex gap-2 justify-end pt-2 border-t border-gray-300">
          <button id="cancelOverwrite" class="px-3 py-1.5 bg-gray-200 text-gray-700 border border-gray-400 hover:bg-gray-300">Cancel</button>
          <button id="proceedOverwrite" class="px-3 py-1.5 bg-orange-600 text-white border border-orange-700 hover:bg-orange-700">Proceed</button>
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
  return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

async function confirmDeleteProfile(profileId) {
  const confirmModal = document.createElement('div');
  confirmModal.className =
    'fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center';
  confirmModal.innerHTML = `
    <div class="bg-white border border-gray-400 p-4 max-w-md">
      <h3 class="text-lg font-medium text-gray-900 mb-3 pb-2 border-b border-gray-300">Confirm Delete</h3>
      <p class="text-sm text-gray-700 mb-4">Are you sure you want to delete profile <strong>${escapeHtml(profileId)}</strong>? This will permanently delete the backup files and database record.</p>
      <div class="flex gap-2 justify-end pt-2 border-t border-gray-300">
        <button id="cancelDelete" class="px-3 py-1.5 bg-gray-200 text-gray-700 border border-gray-400 hover:bg-gray-300">Cancel</button>
        <button id="proceedDelete" class="px-3 py-1.5 bg-red-600 text-white border border-red-700 hover:bg-red-700">
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

fetchProfiles(1);
fetchTags();
