let currentPage = 1;
const pageSize = 20;
let currentRestoreProfileId = '';

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
    const response = await fetch(`/api/profiles?page=${page}&pageSize=${pageSize}`);
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

function renderProfiles(data) {
  const tbody = document.getElementById('profilesBody');
  tbody.innerHTML = '';

  if (data.profiles.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="4" class="px-4 py-3 text-center text-gray-500 border-b border-gray-200">No profiles found</td></tr>';
    return;
  }

  data.profiles.forEach((profile) => {
    const row = document.createElement('tr');
    row.className = 'border-b border-gray-200 hover:bg-gray-50';
    row.innerHTML = `
      <td class="px-4 py-2 text-sm font-medium text-gray-900 border-r border-gray-200">${escapeHtml(profile.profileId)}</td>
      <td class="px-4 py-2 text-sm text-gray-500 border-r border-gray-200">
        <input type="text"
               value="${escapeHtml(profile.description || '')}"
               data-profile-id="${escapeHtml(profile.profileId)}"
               class="description-input w-full px-2 py-1 border border-gray-300 focus:outline-none focus:border-blue-500"
               placeholder="Add description">
      </td>
      <td class="px-4 py-2 text-sm text-gray-500 border-r border-gray-200">${formatDate(profile.createdAt)}</td>
      <td class="px-4 py-2 text-sm font-medium">
        <button class="restore-btn text-blue-600 hover:text-blue-900 font-medium" data-profile-id="${escapeHtml(profile.profileId)}">
          Restore
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

  document.querySelectorAll('.restore-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => openRestoreModal(e.target.dataset.profileId));
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
  const select = document.getElementById('profileSelect');

  modal.classList.remove('hidden');
  select.innerHTML = '<option value="">Loading...</option>';

  try {
    const response = await fetch('/api/available-profiles');
    const profiles = await response.json();

    if (!response.ok) {
      throw new Error(profiles.error || 'Failed to fetch available profiles');
    }

    select.innerHTML = '<option value="">Select a profile</option>';
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

function closeBackupModal() {
  document.getElementById('backupModal').classList.add('hidden');
  document.getElementById('profileSelect').value = '';
  document.getElementById('descriptionInput').value = '';
}

async function confirmBackup() {
  const profileId = document.getElementById('profileSelect').value;
  const description = document.getElementById('descriptionInput').value;
  const confirmBtn = document.getElementById('confirmBackupBtn');

  if (!profileId) {
    showToast('Please select a profile', 'error');
    return;
  }

  setButtonLoading(confirmBtn, true);

  try {
    const response = await fetch('/api/backup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ profileId, description }),
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
  currentRestoreProfileId = '';
}

async function confirmRestore() {
  const targetFolderId = document.getElementById('targetFolderSelect').value;
  const confirmBtn = document.getElementById('confirmRestoreBtn');

  if (!targetFolderId) {
    showToast('Please select a target folder', 'error');
    return;
  }

  const confirmModal = document.createElement('div');
  confirmModal.className =
    'fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center';
  confirmModal.innerHTML = `
    <div class="bg-white border border-gray-400 p-4 max-w-md">
      <h3 class="text-lg font-medium text-gray-900 mb-3 pb-2 border-b border-gray-300">Confirm Restore</h3>
      <p class="text-sm text-gray-700 mb-4">Are you sure you want to restore to ${escapeHtml(targetFolderId)}? This will delete the existing folder.</p>
      <div class="flex gap-2 justify-end pt-2 border-t border-gray-300">
        <button id="cancelConfirm" class="px-3 py-1.5 bg-gray-200 text-gray-700 border border-gray-400 hover:bg-gray-300">Cancel</button>
        <button id="proceedConfirm" class="px-3 py-1.5 bg-red-600 text-white border border-red-700 hover:bg-red-700">Proceed</button>
      </div>
    </div>
  `;
  document.body.appendChild(confirmModal);

  confirmModal.querySelector('#cancelConfirm').addEventListener('click', () => {
    document.body.removeChild(confirmModal);
  });

  confirmModal.querySelector('#proceedConfirm').addEventListener('click', async () => {
    document.body.removeChild(confirmModal);
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
  });
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

document.getElementById('backupBtn').addEventListener('click', openBackupModal);
document.getElementById('cancelBackupBtn').addEventListener('click', closeBackupModal);
document.getElementById('confirmBackupBtn').addEventListener('click', confirmBackup);
document.getElementById('cancelRestoreBtn').addEventListener('click', closeRestoreModal);
document.getElementById('confirmRestoreBtn').addEventListener('click', confirmRestore);

document.getElementById('prevBtn').addEventListener('click', () => {
  if (currentPage > 1) {
    fetchProfiles(currentPage - 1);
  }
});

document.getElementById('nextBtn').addEventListener('click', () => {
  fetchProfiles(currentPage + 1);
});

fetchProfiles(1);
