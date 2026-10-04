-- AlterTable
ALTER TABLE "sessions" ADD COLUMN     "prev_token_hash" TEXT,
ADD COLUMN     "rotated_at" TIMESTAMP(3);
