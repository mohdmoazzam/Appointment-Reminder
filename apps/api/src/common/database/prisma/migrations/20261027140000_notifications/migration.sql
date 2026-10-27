-- CreateEnum
CREATE TYPE "notification_channel" AS ENUM ('email', 'in_app');

-- CreateEnum
CREATE TYPE "notification_delivery_status" AS ENUM ('queued', 'sent', 'failed', 'skipped');

-- CreateTable
CREATE TABLE "notification_events" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "business_id" UUID,
    "event" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "idempotency_key" TEXT NOT NULL,
    "reply_to_email" TEXT,
    "reply_to_name" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_deliveries" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "event_id" UUID NOT NULL,
    "channel" "notification_channel" NOT NULL,
    "status" "notification_delivery_status" NOT NULL DEFAULT 'queued',
    "recipient_user_id" UUID,
    "recipient_email" TEXT,
    "recipient_name" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "provider_message_id" TEXT,
    "sent_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "notification_deliveries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_delivery_attempts" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "delivery_id" UUID NOT NULL,
    "attempt" INTEGER NOT NULL,
    "succeeded" BOOLEAN NOT NULL,
    "error" TEXT,
    "duration_ms" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_delivery_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_templates" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "business_id" UUID,
    "type" TEXT NOT NULL,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "subject" TEXT NOT NULL,
    "html" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "email_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "in_app_notifications" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "business_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "delivery_id" UUID,
    "event" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "link" TEXT,
    "read_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "in_app_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "notification_events_idempotency_key_key" ON "notification_events"("idempotency_key");

-- CreateIndex
CREATE INDEX "notification_events_business_id_created_at_idx" ON "notification_events"("business_id", "created_at");

-- CreateIndex
CREATE INDEX "notification_deliveries_event_id_idx" ON "notification_deliveries"("event_id");

-- CreateIndex
CREATE INDEX "notification_deliveries_recipient_user_id_idx" ON "notification_deliveries"("recipient_user_id");

-- CreateIndex
CREATE INDEX "notification_delivery_attempts_delivery_id_idx" ON "notification_delivery_attempts"("delivery_id");

-- CreateIndex
CREATE INDEX "email_templates_type_business_id_idx" ON "email_templates"("type", "business_id");

-- CreateIndex
CREATE UNIQUE INDEX "in_app_notifications_delivery_id_key" ON "in_app_notifications"("delivery_id");

-- CreateIndex
CREATE INDEX "in_app_notifications_user_id_created_at_idx" ON "in_app_notifications"("user_id", "created_at");

-- AddForeignKey
ALTER TABLE "notification_events" ADD CONSTRAINT "notification_events_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_deliveries" ADD CONSTRAINT "notification_deliveries_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "notification_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_deliveries" ADD CONSTRAINT "notification_deliveries_recipient_user_id_fkey" FOREIGN KEY ("recipient_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_delivery_attempts" ADD CONSTRAINT "notification_delivery_attempts_delivery_id_fkey" FOREIGN KEY ("delivery_id") REFERENCES "notification_deliveries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_templates" ADD CONSTRAINT "email_templates_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "in_app_notifications" ADD CONSTRAINT "in_app_notifications_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "in_app_notifications" ADD CONSTRAINT "in_app_notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "in_app_notifications" ADD CONSTRAINT "in_app_notifications_delivery_id_fkey" FOREIGN KEY ("delivery_id") REFERENCES "notification_deliveries"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Seed: app-wide default email templates. {{placeholders}} are filled from the event payload
-- (escaped in html); the shared layout in code wraps the html.
INSERT INTO "email_templates" ("type", "is_default", "subject", "html", "text", "updated_at") VALUES (
  'staff_invite',
  true,
  '{{invited_by}} invited you to join {{business_name}}',
  '<p style="margin:0 0 16px">Hi {{first_name}},</p>
<p style="margin:0 0 16px"><strong>{{invited_by}}</strong> has invited you to join <strong>{{business_name}}</strong> on Appointment Reminder, where you can see your appointments and set your working hours.</p>
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0">
  <tr><td style="border-radius:8px;background:#4f46e5">
    <a href="{{invite_url}}" style="display:inline-block;padding:12px 24px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px">Accept invite</a>
  </td></tr>
</table>
<p style="margin:0 0 16px;font-size:13px;color:#64748b">Or paste this link into your browser:<br><a href="{{invite_url}}" style="color:#4f46e5;word-break:break-all">{{invite_url}}</a></p>
<p style="margin:0;font-size:13px;color:#64748b">The link works once and expires in {{expires_in_days}} days. If you weren''t expecting this, you can ignore this email.</p>',
  'Hi {{first_name}},

{{invited_by}} has invited you to join {{business_name}} on Appointment Reminder, where you can see your appointments and set your working hours.

Accept the invite and set your password: {{invite_url}}

The link works once and expires in {{expires_in_days}} days. If you weren''t expecting this, you can ignore this email.',
  CURRENT_TIMESTAMP
);
