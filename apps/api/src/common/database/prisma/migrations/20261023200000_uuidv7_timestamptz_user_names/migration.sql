-- uuidv7() is built into Postgres 18+. On older servers (Supabase is on 17) define it here.
-- On 18+ the built-in pg_catalog.uuidv7() takes precedence over this one.
-- Time-ordered UUIDs: 48-bit Unix ms timestamp + version 7 bits + random (RFC 9562).
CREATE OR REPLACE FUNCTION uuidv7() RETURNS uuid AS $$
  SELECT encode(
    set_bit(
      set_bit(
        overlay(uuid_send(gen_random_uuid())
                placing substring(int8send(floor(extract(epoch FROM clock_timestamp()) * 1000)::bigint) FROM 3)
                FROM 1 FOR 6),
        52, 1),
      53, 1),
    'hex')::uuid;
$$ LANGUAGE sql VOLATILE;

-- AlterTable
ALTER TABLE "assets" ALTER COLUMN "id" SET DEFAULT uuidv7(),
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMPTZ(6);

-- AlterTable
ALTER TABLE "businesses" ALTER COLUMN "id" SET DEFAULT uuidv7(),
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMPTZ(6),
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMPTZ(6);

-- AlterTable
ALTER TABLE "sessions" ALTER COLUMN "id" SET DEFAULT uuidv7(),
ALTER COLUMN "expires_at" SET DATA TYPE TIMESTAMPTZ(6),
ALTER COLUMN "last_used_at" SET DATA TYPE TIMESTAMPTZ(6),
ALTER COLUMN "revoked_at" SET DATA TYPE TIMESTAMPTZ(6),
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMPTZ(6);

-- AlterTable
ALTER TABLE "staff_invites" DROP COLUMN "name",
ADD COLUMN     "first_name" TEXT NOT NULL,
ADD COLUMN     "last_name" TEXT NOT NULL,
ALTER COLUMN "id" SET DEFAULT uuidv7(),
ALTER COLUMN "expires_at" SET DATA TYPE TIMESTAMPTZ(6),
ALTER COLUMN "accepted_at" SET DATA TYPE TIMESTAMPTZ(6),
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMPTZ(6);

-- AlterTable
ALTER TABLE "users" DROP COLUMN "name",
ADD COLUMN     "first_name" TEXT NOT NULL,
ADD COLUMN     "last_name" TEXT NOT NULL,
ALTER COLUMN "id" SET DEFAULT uuidv7(),
ALTER COLUMN "last_login_at" SET DATA TYPE TIMESTAMPTZ(6),
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMPTZ(6),
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMPTZ(6);

