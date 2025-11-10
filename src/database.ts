import { PrismaClient } from '../generated/prisma/client.js';
import type { ProfileRecord, TagRecord } from './types.js';

export const prisma = new PrismaClient();

export async function getProfiles(
  page: number,
  pageSize: number,
  tagId?: number,
  search?: string,
  tagIds?: number[],
  tagFilterMode?: 'AND' | 'OR',
): Promise<{ profiles: ProfileRecord[]; total: number }> {
  const skip = (page - 1) * pageSize;

  const whereConditions: any[] = [];

  // Handle multiple tag filtering with AND/OR conditions
  if (tagIds && tagIds.length > 0) {
    if (tagFilterMode === 'AND') {
      // For AND: profile must have ALL specified tags
      // This requires the profile to have at least as many tag associations as requested
      whereConditions.push({
        AND: tagIds.map((id) => ({
          tags: {
            some: {
              tagId: id,
            },
          },
        })),
      });
    } else {
      // For OR: profile must have ANY of the specified tags
      whereConditions.push({
        tags: {
          some: {
            tagId: {
              in: tagIds,
            },
          },
        },
      });
    }
  } else if (tagId) {
    // Backward compatibility: single tag filter
    whereConditions.push({
      tags: {
        some: {
          tagId,
        },
      },
    });
  }

  if (search && search.trim() !== '') {
    const searchTerm = search.trim();
    whereConditions.push({
      OR: [
        {
          profileId: {
            contains: searchTerm,
          },
        },
        {
          description: {
            contains: searchTerm,
          },
        },
      ],
    });
  }

  const where = whereConditions.length > 0 ? { AND: whereConditions } : {};

  const [profiles, total] = await Promise.all([
    prisma.profile.findMany({
      skip,
      take: pageSize,
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        tags: {
          include: {
            tag: true,
          },
        },
      },
    }),
    prisma.profile.count({ where }),
  ]);

  const profilesWithTags = profiles.map((profile) => ({
    ...profile,
    tags: profile.tags.map((pt) => pt.tag),
  }));

  return { profiles: profilesWithTags, total };
}

export async function getProfileById(profileId: string): Promise<ProfileRecord | null> {
  return await prisma.profile.findUnique({
    where: { profileId },
  });
}

export async function createProfile(
  profileId: string,
  description?: string,
  backupSizeInBytes?: bigint,
): Promise<ProfileRecord> {
  return await prisma.profile.create({
    data: {
      profileId,
      description: description || null,
      backupSizeInBytes: backupSizeInBytes || null,
    },
  });
}

export async function updateProfileDescription(
  profileId: string,
  description: string,
): Promise<ProfileRecord> {
  return await prisma.profile.update({
    where: { profileId },
    data: { description },
  });
}

export async function updateProfileBackupSize(
  profileId: string,
  backupSizeInBytes: bigint,
): Promise<ProfileRecord> {
  return await prisma.profile.update({
    where: { profileId },
    data: { backupSizeInBytes },
  });
}

export async function deleteProfile(profileId: string): Promise<void> {
  await prisma.profile.delete({
    where: { profileId },
  });
}

export async function getAllTags(): Promise<TagRecord[]> {
  return await prisma.tag.findMany({
    orderBy: { name: 'asc' },
  });
}

export async function getOrCreateTag(tagName: string): Promise<TagRecord> {
  const existingTag = await prisma.tag.findUnique({
    where: { name: tagName },
  });

  if (existingTag) {
    return existingTag;
  }

  return await prisma.tag.create({
    data: { name: tagName },
  });
}

export async function assignTagToProfile(profileId: string, tagName: string): Promise<void> {
  const tag = await getOrCreateTag(tagName);

  await prisma.profileTag.upsert({
    where: {
      profileId_tagId: {
        profileId,
        tagId: tag.id,
      },
    },
    create: {
      profileId,
      tagId: tag.id,
    },
    update: {},
  });
}

export async function removeTagFromProfile(profileId: string, tagId: number): Promise<void> {
  await prisma.profileTag.delete({
    where: {
      profileId_tagId: {
        profileId,
        tagId,
      },
    },
  });

  const tagUsageCount = await prisma.profileTag.count({
    where: { tagId },
  });

  if (tagUsageCount === 0) {
    await prisma.tag.delete({
      where: { id: tagId },
    });
  }
}
