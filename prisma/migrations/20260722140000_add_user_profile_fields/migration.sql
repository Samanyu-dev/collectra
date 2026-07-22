-- AlterTable: add profile/auth fields to User, drop the cuid() default on id
-- (new User rows are created only via the handle_new_user trigger, id = auth.users.id)
ALTER TABLE "User"
  ALTER COLUMN "id" DROP DEFAULT,
  ADD COLUMN "username" TEXT,
  ADD COLUMN "usernameSetAt" TIMESTAMP(3),
  ADD COLUMN "avatarUrl" TEXT,
  ADD COLUMN "bio" TEXT,
  ADD COLUMN "isPublic" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "role" TEXT NOT NULL DEFAULT 'USER',
  ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
