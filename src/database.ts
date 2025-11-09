import { PrismaClient } from '../generated/prisma/client.js';
import type { ProfileRecord } from './types.js';

export const prisma = new PrismaClient();

export async function getProfiles(
  page: number,
  pageSize: number,
): Promise<{ profiles: ProfileRecord[]; total: number }> {
  const skip = (page - 1) * pageSize;

  const [profiles, total] = await Promise.all([
    prisma.profile.findMany({
      skip,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.profile.count(),
  ]);

  return { profiles, total };
}

export async function getProfileById(profileId: string): Promise<ProfileRecord | null> {
  return await prisma.profile.findUnique({
    where: { profileId },
  });
}

export async function createProfile(
  profileId: string,
  description?: string,
): Promise<ProfileRecord> {
  return await prisma.profile.create({
    data: {
      profileId,
      description: description || null,
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

export async function deleteProfile(profileId: string): Promise<void> {
  await prisma.profile.delete({
    where: { profileId },
  });
}
