-- AlterTable: Add effect layer system fields to Invitation
ALTER TABLE "invitation"."Invitation" ADD COLUMN "effects" JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "invitation"."Invitation" ADD COLUMN "effectConfig" JSONB NOT NULL DEFAULT '{}';
ALTER TABLE "invitation"."Invitation" ADD COLUMN "font" TEXT;
