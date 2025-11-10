export interface TagRecord {
  id: number;
  name: string;
  createdAt: Date;
}

export interface ProfileRecord {
  profileId: string;
  description: string | null;
  backupSizeInBytes: bigint | null;
  createdAt: Date;
  updatedAt: Date;
  tags?: TagRecord[];
}

export interface PaginatedProfilesResponse {
  profiles: ProfileRecord[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface AvailableProfile {
  name: string;
}

export interface BackupRequest {
  sourceProfileId: string;
  targetProfileId?: string;
  description?: string;
}

export interface RestoreRequest {
  profileId: string;
  targetFolderId: string;
}

export interface UpdateProfileRequest {
  description: string;
}

export interface AssignTagRequest {
  tagName: string;
}

export interface RemoveTagRequest {
  tagId: number;
}

export interface ErrorResponse {
  error: string;
}
