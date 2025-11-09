let currentPage = 1;
const pageSize = 20;
let currentRestoreProfileId = '';

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
    alert(`Failed to load profiles: ${error.message}`);
  }
}

function renderProfiles(data) {
  const tbody = document.getElementById('profilesBody');
  tbody.innerHTML = '';

  if (data.profiles.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="4" class="px-6 py-4 text-center text-gray-500">No profiles found</td></tr>';
    return;
  }

  data.profiles.forEach((profile) => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${escapeHtml(profile.profileId)}</td>
      <td class="px-6 py-4 text-sm text-gray-500">
        <input type="text"
               value="${escapeHtml(profile.description || '')}"
               data-profile-id="${escapeHtml(profile.profileId)}"
               class="description-input w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
               placeholder="Add description">
      </td>
      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${formatDate(profile.createdAt)}</td>
      <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
        <button class="restore-btn text-blue-600 hover:text-blue-900" data-profile-id="${escapeHtml(profile.profileId)}">
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
    alert(`Failed to update description: ${error.message}`);
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
    alert(`Failed to load available profiles: ${error.message}`);
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

  if (!profileId) {
    alert('Please select a profile');
    return;
  }

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

    alert('Profile backed up successfully!');
    closeBackupModal();
    fetchProfiles(currentPage);
  } catch (error) {
    console.error('Error backing up profile:', error);
    alert(`Failed to backup profile: ${error.message}`);
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
    alert(`Failed to load available profiles: ${error.message}`);
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

  if (!targetFolderId) {
    alert('Please select a target folder');
    return;
  }

  if (
    !confirm(
      `Are you sure you want to restore to ${targetFolderId}? This will delete the existing folder.`,
    )
  ) {
    return;
  }

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

    alert('Profile restored successfully!');
    closeRestoreModal();
  } catch (error) {
    console.error('Error restoring profile:', error);
    alert(`Failed to restore profile: ${error.message}`);
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
