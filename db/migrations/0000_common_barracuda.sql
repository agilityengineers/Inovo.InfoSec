CREATE TABLE "assessments" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" varchar(64) NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"config" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "brands" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"slug" varchar(128) NOT NULL,
	"name" text NOT NULL,
	"legal_name" text NOT NULL,
	"tagline" text NOT NULL,
	"logo" text,
	"primary" varchar(9) NOT NULL,
	"phone" text NOT NULL,
	"incident_phone" text NOT NULL,
	"email" text NOT NULL,
	"address" text NOT NULL,
	"cta_direct_label" text NOT NULL,
	"cta_direct_url" text NOT NULL,
	"cta_partner_url" text,
	"report_cta_label" text NOT NULL,
	"powered_by" boolean DEFAULT false NOT NULL,
	"show_partner_cta" boolean DEFAULT false NOT NULL,
	"vertical" varchar(64),
	"hostnames" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"routing" jsonb NOT NULL,
	"econ" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "integration_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"lead_id" varchar(40),
	"target" varchar(40) NOT NULL,
	"status" varchar(24) NOT NULL,
	"attempt" integer DEFAULT 1 NOT NULL,
	"message" text NOT NULL,
	"detail" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "leads" (
	"id" varchar(40) PRIMARY KEY NOT NULL,
	"type" varchar(40) NOT NULL,
	"brand_id" varchar(64) NOT NULL,
	"email" text,
	"company" text,
	"name" text,
	"score" integer,
	"tier" varchar(40),
	"qualification" varchar(16),
	"vertical_id" varchar(64),
	"payload" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "qualification_rules" (
	"key" varchar(64) PRIMARY KEY NOT NULL,
	"rule" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"key" varchar(128) PRIMARY KEY NOT NULL,
	"value" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "verticals" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"label" text NOT NULL,
	"config" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "assessments_key_version_idx" ON "assessments" USING btree ("key","version");--> statement-breakpoint
CREATE INDEX "assessments_active_idx" ON "assessments" USING btree ("key","active");--> statement-breakpoint
CREATE UNIQUE INDEX "brands_slug_idx" ON "brands" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "integration_events_lead_idx" ON "integration_events" USING btree ("lead_id");--> statement-breakpoint
CREATE INDEX "integration_events_created_idx" ON "integration_events" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "leads_created_idx" ON "leads" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "leads_brand_idx" ON "leads" USING btree ("brand_id");--> statement-breakpoint
CREATE INDEX "leads_type_idx" ON "leads" USING btree ("type");--> statement-breakpoint
CREATE INDEX "leads_email_idx" ON "leads" USING btree ("email");--> statement-breakpoint
CREATE INDEX "leads_qualification_idx" ON "leads" USING btree ("qualification");--> statement-breakpoint
CREATE INDEX "leads_score_idx" ON "leads" USING btree ("score");