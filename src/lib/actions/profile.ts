"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireUserForAction } from "@/lib/auth/session";

export interface ProfileUpdateInput {
  username?: string;
  bio?: string;
  avatarUrl?: string;
  isPublic?: boolean;
  showValuePublicly?: boolean;
}

const USERNAME_RE = /^[a-zA-Z0-9_-]{3,30}$/;
const UNIQUE_CONSTRAINT_ERROR = "P2002";

function isUniqueConstraintError(e: unknown): boolean {
  return typeof e === "object" && e !== null && "code" in e && (e as { code: unknown }).code === UNIQUE_CONSTRAINT_ERROR;
}

export async function updateProfile(data: ProfileUpdateInput): Promise<{ success: true } | { error: string }> {
  const user = await requireUserForAction();

  let normalizedUsername: string | null | undefined;
  if (data.username !== undefined) {
    const trimmed = data.username.trim();
    if (trimmed && !USERNAME_RE.test(trimmed)) {
      return { error: "Username must be 3–30 characters: letters, numbers, underscore, or hyphen." };
    }
    normalizedUsername = trimmed || null;
  }

  try {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        ...(normalizedUsername !== undefined ? { username: normalizedUsername, usernameSetAt: new Date() } : {}),
        ...(data.bio !== undefined ? { bio: data.bio.trim() || null } : {}),
        ...(data.avatarUrl !== undefined ? { avatarUrl: data.avatarUrl.trim() || null } : {}),
        ...(data.isPublic !== undefined ? { isPublic: data.isPublic } : {}),
        ...(data.showValuePublicly !== undefined ? { showValuePublicly: data.showValuePublicly } : {}),
      },
    });
  } catch (e) {
    if (isUniqueConstraintError(e)) return { error: "That username is already taken." };
    throw e;
  }

  revalidatePath("/settings");
  if (normalizedUsername) revalidatePath(`/u/${normalizedUsername}`);
  return { success: true };
}
