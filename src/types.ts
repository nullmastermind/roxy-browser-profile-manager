export interface ProfileRecord {
  profileId: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
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
  profileId: string;
  description?: string;
}

export interface RestoreRequest {
  profileId: string;
  targetFolderId: string;
}

export interface UpdateProfileRequest {
  description: string;
}

export interface ErrorResponse {
  error: string;
}
