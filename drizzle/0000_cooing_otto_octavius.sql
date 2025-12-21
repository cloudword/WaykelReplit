CREATE TABLE IF NOT EXISTS "api_logs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"method" text NOT NULL,
	"path" text NOT NULL,
	"status_code" integer,
	"user_id" varchar,
	"user_role" text,
	"origin" text,
	"user_agent" text,
	"ip_address" text,
	"request_body" json,
	"response_time" integer,
	"error_message" text,
	"is_external" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "bids" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ride_id" varchar NOT NULL,
	"user_id" varchar NOT NULL,
	"transporter_id" varchar,
	"vehicle_id" varchar NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "documents" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar,
	"transporter_id" varchar,
	"vehicle_id" varchar,
	"customer_id" varchar,
	"ride_id" varchar,
	"entity_type" text NOT NULL,
	"type" text NOT NULL,
	"document_name" text NOT NULL,
	"url" text NOT NULL,
	"storage_path" text,
	"expiry_date" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"rejection_reason" text,
	"reviewed_by" varchar,
	"reviewed_at" timestamp,
	"replaced_by_id" varchar,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "driver_applications" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"driver_id" varchar NOT NULL,
	"profile_summary" text,
	"experience" text,
	"preferred_vehicle_types" json,
	"preferred_locations" json,
	"expected_salary" text,
	"availability" text,
	"status" text DEFAULT 'active',
	"documents_complete" boolean DEFAULT false,
	"accepted_by_transporter_id" varchar,
	"accepted_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ledger_entries" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ride_id" varchar NOT NULL,
	"transporter_id" varchar,
	"entry_type" text NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"description" text,
	"reference_id" varchar,
	"reference_type" text,
	"balance_before" numeric(12, 2),
	"balance_after" numeric(12, 2),
	"created_by_id" varchar,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "notifications" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"recipient_id" varchar NOT NULL,
	"recipient_transporter_id" varchar,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"ride_id" varchar,
	"bid_id" varchar,
	"is_read" boolean DEFAULT false,
	"match_score" integer,
	"match_reason" text,
	"notification_type" text,
	"action_type" text,
	"entity_type" text,
	"entity_id" varchar,
	"deep_link" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "otp_codes" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"phone" varchar(15) NOT NULL,
	"otp_hash" varchar(255) NOT NULL,
	"purpose" text NOT NULL,
	"attempts" integer DEFAULT 0,
	"verified" boolean DEFAULT false,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "platform_settings" (
	"id" varchar PRIMARY KEY DEFAULT 'default' NOT NULL,
	"commission_enabled" boolean DEFAULT false,
	"commission_mode" text DEFAULT 'shadow',
	"tier_config" json DEFAULT '[{"amount":5000,"percent":10},{"amount":10000,"percent":8},{"amount":25000,"percent":6},{"amount":50000,"percent":5}]'::json,
	"base_percent" numeric(5, 2) DEFAULT '10',
	"min_fee" numeric(10, 2) DEFAULT '50',
	"max_fee" numeric(10, 2) DEFAULT '5000',
	"sms_enabled" boolean DEFAULT false,
	"sms_mode" text DEFAULT 'shadow',
	"sms_provider" text DEFAULT null,
	"sms_templates" json DEFAULT '{}'::json,
	"business_doc_requirements" json DEFAULT '[{"type":"business_registration","label":"Business Registration","required":true,"description":"GST Certificate or MSME Certificate"},{"type":"gst_certificate","label":"GST Certificate","required":false},{"type":"pan_card","label":"PAN Card","required":false}]'::json,
	"vehicle_doc_requirements" json DEFAULT '[{"type":"rc","label":"Registration Certificate (RC)","required":true,"description":"Vehicle registration document"},{"type":"insurance","label":"Insurance","required":false},{"type":"permit","label":"Permit","required":false},{"type":"fitness","label":"Fitness Certificate","required":false},{"type":"pollution","label":"Pollution Certificate","required":false}]'::json,
	"driver_doc_requirements" json DEFAULT '[{"type":"driving_license","label":"Driving License","required":true,"description":"Valid driving license"},{"type":"aadhar","label":"Aadhar Card","required":false},{"type":"pan","label":"PAN Card","required":false},{"type":"photo","label":"Photo","required":false}]'::json,
	"updated_by_admin_id" varchar,
	"updated_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "rides" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pickup_location" text NOT NULL,
	"drop_location" text NOT NULL,
	"pickup_pincode" text,
	"drop_pincode" text,
	"pickup_time" text NOT NULL,
	"drop_time" text,
	"date" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"price" numeric(10, 2) NOT NULL,
	"distance" text NOT NULL,
	"cargo_type" text NOT NULL,
	"weight" text NOT NULL,
	"weight_kg" integer,
	"weight_tons" numeric(10, 2),
	"weight_unit" text DEFAULT 'kg',
	"required_vehicle_type" text,
	"required_vehicle_category" text,
	"customer_name" text,
	"customer_phone" text,
	"incentive" numeric(10, 2),
	"transporter_id" varchar,
	"assigned_driver_id" varchar,
	"assigned_vehicle_id" varchar,
	"accepted_bid_id" varchar,
	"created_by_id" varchar,
	"bidding_status" text DEFAULT 'open',
	"accepted_by_user_id" varchar,
	"accepted_at" timestamp,
	"is_self_assigned" boolean DEFAULT false,
	"pickup_completed" boolean DEFAULT false,
	"pickup_completed_at" timestamp,
	"delivery_completed" boolean DEFAULT false,
	"delivery_completed_at" timestamp,
	"final_price" numeric(10, 2),
	"platform_fee" numeric(10, 2),
	"transporter_earning" numeric(10, 2),
	"platform_fee_percent" numeric(5, 2),
	"shadow_platform_fee" numeric(10, 2),
	"shadow_platform_fee_percent" numeric(5, 2),
	"payment_status" text DEFAULT 'pending',
	"financial_locked_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "roles" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"permissions" json DEFAULT '[]'::json,
	"is_system" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "roles_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "saved_addresses" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"transporter_id" varchar,
	"user_id" varchar,
	"label" text NOT NULL,
	"address" text NOT NULL,
	"pincode" text,
	"city" text,
	"state" text,
	"is_default" boolean DEFAULT false,
	"address_type" text DEFAULT 'both',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "transporters" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_id" text,
	"company_name" text NOT NULL,
	"owner_name" text NOT NULL,
	"contact" text NOT NULL,
	"email" text,
	"status" text DEFAULT 'pending_verification' NOT NULL,
	"rejection_reason" text,
	"fleet_size" integer DEFAULT 0,
	"location" text NOT NULL,
	"base_pincode" text,
	"base_city" text,
	"service_pincodes" text[],
	"preferred_routes" json,
	"is_owner_operator" boolean DEFAULT false,
	"owner_driver_user_id" varchar,
	"documents_complete" boolean DEFAULT false,
	"is_verified" boolean DEFAULT false,
	"verified_at" timestamp,
	"verified_by" varchar,
	"owner_operator_vehicle_id" varchar,
	"execution_policy" text DEFAULT 'ASSIGNED_DRIVER_ONLY',
	"transporter_type" text DEFAULT 'business',
	"onboarding_status" text DEFAULT 'incomplete',
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "transporters_entity_id_unique" UNIQUE("entity_id"),
	CONSTRAINT "transporters_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_roles" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"role_id" varchar NOT NULL,
	"assigned_by" varchar,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_id" text,
	"name" text NOT NULL,
	"username" text,
	"email" text,
	"phone" text NOT NULL,
	"password" text NOT NULL,
	"role" text NOT NULL,
	"is_super_admin" boolean DEFAULT false,
	"transporter_id" varchar,
	"is_online" boolean DEFAULT false,
	"rating" numeric(3, 2) DEFAULT '0',
	"total_trips" integer DEFAULT 0,
	"earnings_today" numeric(10, 2) DEFAULT '0',
	"documents_complete" boolean DEFAULT false,
	"profile_complete" boolean DEFAULT false,
	"is_self_driver" boolean DEFAULT false,
	"document_status" text DEFAULT 'document_missing',
	"is_active_for_bidding" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "users_entity_id_unique" UNIQUE("entity_id"),
	CONSTRAINT "users_username_unique" UNIQUE("username"),
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_phone_unique" UNIQUE("phone")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "vehicles" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_id" text,
	"user_id" varchar,
	"transporter_id" varchar,
	"type" text NOT NULL,
	"plate_number" text NOT NULL,
	"model" text NOT NULL,
	"capacity" text NOT NULL,
	"capacity_kg" integer,
	"capacity_tons" numeric(10, 2),
	"vehicle_category" text,
	"vehicle_type_code" text,
	"body_type" text,
	"length_ft" integer,
	"axle_type" text,
	"fuel_type" text,
	"status" text DEFAULT 'active' NOT NULL,
	"current_location" text,
	"current_pincode" text,
	"document_status" text DEFAULT 'document_missing',
	"is_active_for_bidding" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "vehicles_entity_id_unique" UNIQUE("entity_id"),
	CONSTRAINT "vehicles_plate_number_unique" UNIQUE("plate_number")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "bids" ADD CONSTRAINT "bids_ride_id_rides_id_fk" FOREIGN KEY ("ride_id") REFERENCES "rides"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "bids" ADD CONSTRAINT "bids_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "bids" ADD CONSTRAINT "bids_transporter_id_transporters_id_fk" FOREIGN KEY ("transporter_id") REFERENCES "transporters"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "bids" ADD CONSTRAINT "bids_vehicle_id_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "documents" ADD CONSTRAINT "documents_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "documents" ADD CONSTRAINT "documents_transporter_id_transporters_id_fk" FOREIGN KEY ("transporter_id") REFERENCES "transporters"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "documents" ADD CONSTRAINT "documents_vehicle_id_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "documents" ADD CONSTRAINT "documents_customer_id_users_id_fk" FOREIGN KEY ("customer_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "documents" ADD CONSTRAINT "documents_ride_id_rides_id_fk" FOREIGN KEY ("ride_id") REFERENCES "rides"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "documents" ADD CONSTRAINT "documents_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "driver_applications" ADD CONSTRAINT "driver_applications_driver_id_users_id_fk" FOREIGN KEY ("driver_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "driver_applications" ADD CONSTRAINT "driver_applications_accepted_by_transporter_id_transporters_id_fk" FOREIGN KEY ("accepted_by_transporter_id") REFERENCES "transporters"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_ride_id_rides_id_fk" FOREIGN KEY ("ride_id") REFERENCES "rides"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_transporter_id_transporters_id_fk" FOREIGN KEY ("transporter_id") REFERENCES "transporters"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "notifications" ADD CONSTRAINT "notifications_recipient_id_users_id_fk" FOREIGN KEY ("recipient_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "notifications" ADD CONSTRAINT "notifications_recipient_transporter_id_transporters_id_fk" FOREIGN KEY ("recipient_transporter_id") REFERENCES "transporters"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "notifications" ADD CONSTRAINT "notifications_ride_id_rides_id_fk" FOREIGN KEY ("ride_id") REFERENCES "rides"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "notifications" ADD CONSTRAINT "notifications_bid_id_bids_id_fk" FOREIGN KEY ("bid_id") REFERENCES "bids"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "platform_settings" ADD CONSTRAINT "platform_settings_updated_by_admin_id_users_id_fk" FOREIGN KEY ("updated_by_admin_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "rides" ADD CONSTRAINT "rides_transporter_id_transporters_id_fk" FOREIGN KEY ("transporter_id") REFERENCES "transporters"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "rides" ADD CONSTRAINT "rides_assigned_driver_id_users_id_fk" FOREIGN KEY ("assigned_driver_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "rides" ADD CONSTRAINT "rides_assigned_vehicle_id_vehicles_id_fk" FOREIGN KEY ("assigned_vehicle_id") REFERENCES "vehicles"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "rides" ADD CONSTRAINT "rides_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "rides" ADD CONSTRAINT "rides_accepted_by_user_id_users_id_fk" FOREIGN KEY ("accepted_by_user_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "saved_addresses" ADD CONSTRAINT "saved_addresses_transporter_id_transporters_id_fk" FOREIGN KEY ("transporter_id") REFERENCES "transporters"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "saved_addresses" ADD CONSTRAINT "saved_addresses_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "transporters" ADD CONSTRAINT "transporters_owner_driver_user_id_users_id_fk" FOREIGN KEY ("owner_driver_user_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "transporters" ADD CONSTRAINT "transporters_verified_by_users_id_fk" FOREIGN KEY ("verified_by") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_assigned_by_users_id_fk" FOREIGN KEY ("assigned_by") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_transporter_id_transporters_id_fk" FOREIGN KEY ("transporter_id") REFERENCES "transporters"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
