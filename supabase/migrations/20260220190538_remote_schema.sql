drop extension if exists "pg_net";

create sequence "public"."locations_id_seq";


  create table "public"."location_images" (
    "id" uuid not null default extensions.uuid_generate_v4(),
    "location_id" integer not null,
    "image_url" text not null,
    "caption" text,
    "display_order" integer,
    "created_at" timestamp with time zone default now()
      );


alter table "public"."location_images" enable row level security;


  create table "public"."location_submission_images" (
    "id" uuid not null default extensions.uuid_generate_v4(),
    "submission_id" uuid not null,
    "image_url" text not null,
    "created_at" timestamp with time zone default now()
      );


alter table "public"."location_submission_images" enable row level security;


  create table "public"."location_submission_requests" (
    "id" uuid not null default extensions.uuid_generate_v4(),
    "user_id" uuid not null,
    "name" text not null,
    "country" text,
    "latitude" numeric not null,
    "longitude" numeric not null,
    "rock_drop_ft" integer,
    "total_height_ft" integer,
    "cliff_aspect" text,
    "anchor_info" text,
    "access_info" text,
    "notes" text,
    "opened_by_name" text,
    "opened_date" text,
    "video_link" text,
    "status" text not null default 'pending'::text,
    "submission_type" text not null default 'new'::text,
    "existing_location_id" integer,
    "admin_notes" text,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now(),
    "reviewed_at" timestamp with time zone,
    "reviewed_by" uuid
      );


alter table "public"."location_submission_requests" enable row level security;


  create table "public"."locations" (
    "id" integer not null default nextval('public.locations_id_seq'::regclass),
    "name" text not null,
    "country" text,
    "latitude" numeric(10,8) not null,
    "longitude" numeric(11,8) not null,
    "rock_drop_ft" integer,
    "total_height_ft" integer,
    "cliff_aspect" text,
    "anchor_info" text,
    "access_info" text,
    "notes" text,
    "opened_by_name" text,
    "opened_date" text,
    "video_link" text,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now(),
    "created_by" uuid,
    "updated_by" uuid,
    "is_hidden" boolean not null default false
      );


alter table "public"."locations" enable row level security;


  create table "public"."logbook_entries" (
    "id" uuid not null default extensions.uuid_generate_v4(),
    "user_id" uuid not null,
    "location_name" text not null,
    "exit_type" text,
    "delay_seconds" integer,
    "jump_date" date,
    "details" text,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
      );


alter table "public"."logbook_entries" enable row level security;


  create table "public"."logbook_images" (
    "id" uuid not null default extensions.uuid_generate_v4(),
    "logbook_entry_id" uuid not null,
    "image_url" text not null,
    "caption" text,
    "display_order" integer,
    "created_at" timestamp with time zone default now()
      );


alter table "public"."logbook_images" enable row level security;


  create table "public"."profile_images" (
    "id" uuid not null default extensions.uuid_generate_v4(),
    "user_id" uuid not null,
    "image_url" text not null,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
      );


alter table "public"."profile_images" enable row level security;


  create table "public"."profiles" (
    "id" uuid not null,
    "email" text,
    "name" text,
    "username" text,
    "jump_number" integer default 0,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now(),
    "subscription_status" text default 'free'::text,
    "subscription_expires_at" timestamp with time zone,
    "subscription_updated_at" timestamp with time zone default now(),
    "role" text default 'USER'::text,
    "distance_unit" text not null default 'metric'::text
      );


alter table "public"."profiles" enable row level security;


  create table "public"."user_saved_locations" (
    "id" uuid not null default extensions.uuid_generate_v4(),
    "user_id" uuid not null,
    "location_id" integer not null,
    "created_at" timestamp with time zone default now()
      );


alter table "public"."user_saved_locations" enable row level security;

alter sequence "public"."locations_id_seq" owned by "public"."locations"."id";

CREATE INDEX idx_location_images_location_id ON public.location_images USING btree (location_id);

CREATE INDEX idx_location_submission_images_submission_id ON public.location_submission_images USING btree (submission_id);

CREATE INDEX idx_location_submissions_created_at ON public.location_submission_requests USING btree (created_at);

CREATE INDEX idx_location_submissions_existing_location ON public.location_submission_requests USING btree (existing_location_id);

CREATE INDEX idx_location_submissions_status ON public.location_submission_requests USING btree (status);

CREATE INDEX idx_location_submissions_type ON public.location_submission_requests USING btree (submission_type);

CREATE INDEX idx_location_submissions_user_id ON public.location_submission_requests USING btree (user_id);

CREATE INDEX idx_locations_country ON public.locations USING btree (country);

CREATE INDEX idx_locations_created_by ON public.locations USING btree (created_by);

CREATE INDEX idx_locations_is_hidden ON public.locations USING btree (is_hidden);

CREATE INDEX idx_locations_lat_lng ON public.locations USING btree (latitude, longitude);

CREATE INDEX idx_locations_name ON public.locations USING btree (name);

CREATE INDEX idx_locations_rock_drop ON public.locations USING btree (rock_drop_ft);

CREATE INDEX idx_locations_updated_by ON public.locations USING btree (updated_by);

CREATE INDEX idx_locations_visible ON public.locations USING btree (id) WHERE (is_hidden = false);

CREATE INDEX idx_logbook_entries_created_at ON public.logbook_entries USING btree (created_at);

CREATE INDEX idx_logbook_entries_jump_date ON public.logbook_entries USING btree (jump_date);

CREATE INDEX idx_logbook_entries_location_name ON public.logbook_entries USING btree (location_name);

CREATE INDEX idx_logbook_entries_user_id ON public.logbook_entries USING btree (user_id);

CREATE INDEX idx_logbook_images_entry_id ON public.logbook_images USING btree (logbook_entry_id);

CREATE INDEX idx_profile_images_user_id ON public.profile_images USING btree (user_id);

CREATE INDEX idx_profiles_distance_unit ON public.profiles USING btree (distance_unit);

CREATE INDEX idx_profiles_email ON public.profiles USING btree (email);

CREATE INDEX idx_profiles_role ON public.profiles USING btree (role);

CREATE INDEX idx_profiles_subscription_status ON public.profiles USING btree (subscription_status);

CREATE INDEX idx_profiles_username ON public.profiles USING btree (username);

CREATE INDEX idx_user_saved_locations_created_at ON public.user_saved_locations USING btree (created_at);

CREATE INDEX idx_user_saved_locations_location_id ON public.user_saved_locations USING btree (location_id);

CREATE INDEX idx_user_saved_locations_user_id ON public.user_saved_locations USING btree (user_id);

CREATE UNIQUE INDEX location_images_pkey ON public.location_images USING btree (id);

CREATE UNIQUE INDEX location_submission_images_pkey ON public.location_submission_images USING btree (id);

CREATE UNIQUE INDEX location_submission_requests_pkey ON public.location_submission_requests USING btree (id);

CREATE UNIQUE INDEX locations_pkey ON public.locations USING btree (id);

CREATE UNIQUE INDEX logbook_entries_pkey ON public.logbook_entries USING btree (id);

CREATE UNIQUE INDEX logbook_images_pkey ON public.logbook_images USING btree (id);

CREATE UNIQUE INDEX profile_images_pkey ON public.profile_images USING btree (id);

CREATE UNIQUE INDEX profile_images_user_id_key ON public.profile_images USING btree (user_id);

CREATE UNIQUE INDEX profiles_pkey ON public.profiles USING btree (id);

CREATE UNIQUE INDEX profiles_username_key ON public.profiles USING btree (username);

CREATE UNIQUE INDEX user_saved_locations_pkey ON public.user_saved_locations USING btree (id);

CREATE UNIQUE INDEX user_saved_locations_user_id_location_id_key ON public.user_saved_locations USING btree (user_id, location_id);

alter table "public"."location_images" add constraint "location_images_pkey" PRIMARY KEY using index "location_images_pkey";

alter table "public"."location_submission_images" add constraint "location_submission_images_pkey" PRIMARY KEY using index "location_submission_images_pkey";

alter table "public"."location_submission_requests" add constraint "location_submission_requests_pkey" PRIMARY KEY using index "location_submission_requests_pkey";

alter table "public"."locations" add constraint "locations_pkey" PRIMARY KEY using index "locations_pkey";

alter table "public"."logbook_entries" add constraint "logbook_entries_pkey" PRIMARY KEY using index "logbook_entries_pkey";

alter table "public"."logbook_images" add constraint "logbook_images_pkey" PRIMARY KEY using index "logbook_images_pkey";

alter table "public"."profile_images" add constraint "profile_images_pkey" PRIMARY KEY using index "profile_images_pkey";

alter table "public"."profiles" add constraint "profiles_pkey" PRIMARY KEY using index "profiles_pkey";

alter table "public"."user_saved_locations" add constraint "user_saved_locations_pkey" PRIMARY KEY using index "user_saved_locations_pkey";

alter table "public"."location_images" add constraint "location_images_location_id_fkey" FOREIGN KEY (location_id) REFERENCES public.locations(id) ON DELETE CASCADE not valid;

alter table "public"."location_images" validate constraint "location_images_location_id_fkey";

alter table "public"."location_submission_images" add constraint "location_submission_images_submission_id_fkey" FOREIGN KEY (submission_id) REFERENCES public.location_submission_requests(id) ON DELETE CASCADE not valid;

alter table "public"."location_submission_images" validate constraint "location_submission_images_submission_id_fkey";

alter table "public"."location_submission_requests" add constraint "location_submission_requests_existing_location_id_fkey" FOREIGN KEY (existing_location_id) REFERENCES public.locations(id) not valid;

alter table "public"."location_submission_requests" validate constraint "location_submission_requests_existing_location_id_fkey";

alter table "public"."location_submission_requests" add constraint "location_submission_requests_reviewed_by_fkey" FOREIGN KEY (reviewed_by) REFERENCES public.profiles(id) not valid;

alter table "public"."location_submission_requests" validate constraint "location_submission_requests_reviewed_by_fkey";

alter table "public"."location_submission_requests" add constraint "location_submission_requests_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text]))) not valid;

alter table "public"."location_submission_requests" validate constraint "location_submission_requests_status_check";

alter table "public"."location_submission_requests" add constraint "location_submission_requests_submission_type_check" CHECK ((submission_type = ANY (ARRAY['new'::text, 'update'::text]))) not valid;

alter table "public"."location_submission_requests" validate constraint "location_submission_requests_submission_type_check";

alter table "public"."location_submission_requests" add constraint "location_submission_requests_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE not valid;

alter table "public"."location_submission_requests" validate constraint "location_submission_requests_user_id_fkey";

alter table "public"."locations" add constraint "locations_created_by_fkey" FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL not valid;

alter table "public"."locations" validate constraint "locations_created_by_fkey";

alter table "public"."locations" add constraint "locations_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES public.profiles(id) ON DELETE SET NULL not valid;

alter table "public"."locations" validate constraint "locations_updated_by_fkey";

alter table "public"."logbook_entries" add constraint "delay_seconds_positive" CHECK (((delay_seconds IS NULL) OR (delay_seconds >= 0))) not valid;

alter table "public"."logbook_entries" validate constraint "delay_seconds_positive";

alter table "public"."logbook_entries" add constraint "exit_type_valid" CHECK (((exit_type IS NULL) OR (exit_type = ANY (ARRAY['Building'::text, 'Antenna'::text, 'Span'::text, 'Earth'::text])))) not valid;

alter table "public"."logbook_entries" validate constraint "exit_type_valid";

alter table "public"."logbook_entries" add constraint "logbook_entries_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE not valid;

alter table "public"."logbook_entries" validate constraint "logbook_entries_user_id_fkey";

alter table "public"."logbook_images" add constraint "logbook_images_logbook_entry_id_fkey" FOREIGN KEY (logbook_entry_id) REFERENCES public.logbook_entries(id) ON DELETE CASCADE not valid;

alter table "public"."logbook_images" validate constraint "logbook_images_logbook_entry_id_fkey";

alter table "public"."profile_images" add constraint "profile_images_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE not valid;

alter table "public"."profile_images" validate constraint "profile_images_user_id_fkey";

alter table "public"."profile_images" add constraint "profile_images_user_id_key" UNIQUE using index "profile_images_user_id_key";

alter table "public"."profiles" add constraint "jump_number_positive" CHECK ((jump_number >= 0)) not valid;

alter table "public"."profiles" validate constraint "jump_number_positive";

alter table "public"."profiles" add constraint "profiles_distance_unit_check" CHECK ((distance_unit = ANY (ARRAY['metric'::text, 'imperial'::text]))) not valid;

alter table "public"."profiles" validate constraint "profiles_distance_unit_check";

alter table "public"."profiles" add constraint "profiles_id_fkey" FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."profiles" validate constraint "profiles_id_fkey";

alter table "public"."profiles" add constraint "profiles_role_check" CHECK ((role = ANY (ARRAY['USER'::text, 'ADMIN'::text, 'SUPERUSER'::text]))) not valid;

alter table "public"."profiles" validate constraint "profiles_role_check";

alter table "public"."profiles" add constraint "profiles_subscription_status_check" CHECK ((subscription_status = ANY (ARRAY['free'::text, 'trial'::text, 'active'::text, 'expired'::text]))) not valid;

alter table "public"."profiles" validate constraint "profiles_subscription_status_check";

alter table "public"."profiles" add constraint "profiles_username_key" UNIQUE using index "profiles_username_key";

alter table "public"."profiles" add constraint "username_length_check" CHECK (((char_length(username) >= 3) AND (char_length(username) <= 30))) not valid;

alter table "public"."profiles" validate constraint "username_length_check";

alter table "public"."user_saved_locations" add constraint "user_saved_locations_location_id_fkey" FOREIGN KEY (location_id) REFERENCES public.locations(id) ON DELETE CASCADE not valid;

alter table "public"."user_saved_locations" validate constraint "user_saved_locations_location_id_fkey";

alter table "public"."user_saved_locations" add constraint "user_saved_locations_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE not valid;

alter table "public"."user_saved_locations" validate constraint "user_saved_locations_user_id_fkey";

alter table "public"."user_saved_locations" add constraint "user_saved_locations_user_id_location_id_key" UNIQUE using index "user_saved_locations_user_id_location_id_key";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.can_manage_locations(user_id uuid DEFAULT auth.uid())
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = user_id 
        AND role IN ('ADMIN', 'SUPERUSER')
    );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_current_user_role()
 RETURNS text
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
AS $function$
BEGIN
    -- Get role directly from JWT token, avoiding any table queries
    RETURN COALESCE(auth.jwt() ->> 'role', 'USER');
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_user_role(user_id uuid DEFAULT auth.uid())
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    RETURN (
        SELECT role 
        FROM public.profiles 
        WHERE id = user_id
    );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.handle_locations_audit()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    -- Set updated_at timestamp (existing functionality)
    NEW.updated_at = NOW();
    
    -- Set audit fields if they exist
    IF TG_OP = 'INSERT' THEN
        -- Set created_by on insert
        IF auth.uid() IS NOT NULL THEN
            NEW.created_by = auth.uid();
            NEW.updated_by = auth.uid();
        END IF;
    ELSIF TG_OP = 'UPDATE' THEN
        -- Set updated_by on update, preserve created_by
        IF auth.uid() IS NOT NULL THEN
            NEW.updated_by = auth.uid();
        END IF;
        NEW.created_by = OLD.created_by; -- Preserve original creator
    END IF;
    
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    INSERT INTO public.profiles (id, email, name, role)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
        'USER'  -- Default role for new users
    );
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.handle_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$function$
;

grant delete on table "public"."location_images" to "anon";

grant insert on table "public"."location_images" to "anon";

grant references on table "public"."location_images" to "anon";

grant select on table "public"."location_images" to "anon";

grant trigger on table "public"."location_images" to "anon";

grant truncate on table "public"."location_images" to "anon";

grant update on table "public"."location_images" to "anon";

grant delete on table "public"."location_images" to "authenticated";

grant insert on table "public"."location_images" to "authenticated";

grant references on table "public"."location_images" to "authenticated";

grant select on table "public"."location_images" to "authenticated";

grant trigger on table "public"."location_images" to "authenticated";

grant truncate on table "public"."location_images" to "authenticated";

grant update on table "public"."location_images" to "authenticated";

grant delete on table "public"."location_images" to "service_role";

grant insert on table "public"."location_images" to "service_role";

grant references on table "public"."location_images" to "service_role";

grant select on table "public"."location_images" to "service_role";

grant trigger on table "public"."location_images" to "service_role";

grant truncate on table "public"."location_images" to "service_role";

grant update on table "public"."location_images" to "service_role";

grant delete on table "public"."location_submission_images" to "anon";

grant insert on table "public"."location_submission_images" to "anon";

grant references on table "public"."location_submission_images" to "anon";

grant select on table "public"."location_submission_images" to "anon";

grant trigger on table "public"."location_submission_images" to "anon";

grant truncate on table "public"."location_submission_images" to "anon";

grant update on table "public"."location_submission_images" to "anon";

grant delete on table "public"."location_submission_images" to "authenticated";

grant insert on table "public"."location_submission_images" to "authenticated";

grant references on table "public"."location_submission_images" to "authenticated";

grant select on table "public"."location_submission_images" to "authenticated";

grant trigger on table "public"."location_submission_images" to "authenticated";

grant truncate on table "public"."location_submission_images" to "authenticated";

grant update on table "public"."location_submission_images" to "authenticated";

grant delete on table "public"."location_submission_images" to "service_role";

grant insert on table "public"."location_submission_images" to "service_role";

grant references on table "public"."location_submission_images" to "service_role";

grant select on table "public"."location_submission_images" to "service_role";

grant trigger on table "public"."location_submission_images" to "service_role";

grant truncate on table "public"."location_submission_images" to "service_role";

grant update on table "public"."location_submission_images" to "service_role";

grant delete on table "public"."location_submission_requests" to "anon";

grant insert on table "public"."location_submission_requests" to "anon";

grant references on table "public"."location_submission_requests" to "anon";

grant select on table "public"."location_submission_requests" to "anon";

grant trigger on table "public"."location_submission_requests" to "anon";

grant truncate on table "public"."location_submission_requests" to "anon";

grant update on table "public"."location_submission_requests" to "anon";

grant delete on table "public"."location_submission_requests" to "authenticated";

grant insert on table "public"."location_submission_requests" to "authenticated";

grant references on table "public"."location_submission_requests" to "authenticated";

grant select on table "public"."location_submission_requests" to "authenticated";

grant trigger on table "public"."location_submission_requests" to "authenticated";

grant truncate on table "public"."location_submission_requests" to "authenticated";

grant update on table "public"."location_submission_requests" to "authenticated";

grant delete on table "public"."location_submission_requests" to "service_role";

grant insert on table "public"."location_submission_requests" to "service_role";

grant references on table "public"."location_submission_requests" to "service_role";

grant select on table "public"."location_submission_requests" to "service_role";

grant trigger on table "public"."location_submission_requests" to "service_role";

grant truncate on table "public"."location_submission_requests" to "service_role";

grant update on table "public"."location_submission_requests" to "service_role";

grant delete on table "public"."locations" to "anon";

grant insert on table "public"."locations" to "anon";

grant references on table "public"."locations" to "anon";

grant select on table "public"."locations" to "anon";

grant trigger on table "public"."locations" to "anon";

grant truncate on table "public"."locations" to "anon";

grant update on table "public"."locations" to "anon";

grant delete on table "public"."locations" to "authenticated";

grant insert on table "public"."locations" to "authenticated";

grant references on table "public"."locations" to "authenticated";

grant select on table "public"."locations" to "authenticated";

grant trigger on table "public"."locations" to "authenticated";

grant truncate on table "public"."locations" to "authenticated";

grant update on table "public"."locations" to "authenticated";

grant delete on table "public"."locations" to "service_role";

grant insert on table "public"."locations" to "service_role";

grant references on table "public"."locations" to "service_role";

grant select on table "public"."locations" to "service_role";

grant trigger on table "public"."locations" to "service_role";

grant truncate on table "public"."locations" to "service_role";

grant update on table "public"."locations" to "service_role";

grant delete on table "public"."logbook_entries" to "anon";

grant insert on table "public"."logbook_entries" to "anon";

grant references on table "public"."logbook_entries" to "anon";

grant select on table "public"."logbook_entries" to "anon";

grant trigger on table "public"."logbook_entries" to "anon";

grant truncate on table "public"."logbook_entries" to "anon";

grant update on table "public"."logbook_entries" to "anon";

grant delete on table "public"."logbook_entries" to "authenticated";

grant insert on table "public"."logbook_entries" to "authenticated";

grant references on table "public"."logbook_entries" to "authenticated";

grant select on table "public"."logbook_entries" to "authenticated";

grant trigger on table "public"."logbook_entries" to "authenticated";

grant truncate on table "public"."logbook_entries" to "authenticated";

grant update on table "public"."logbook_entries" to "authenticated";

grant delete on table "public"."logbook_entries" to "service_role";

grant insert on table "public"."logbook_entries" to "service_role";

grant references on table "public"."logbook_entries" to "service_role";

grant select on table "public"."logbook_entries" to "service_role";

grant trigger on table "public"."logbook_entries" to "service_role";

grant truncate on table "public"."logbook_entries" to "service_role";

grant update on table "public"."logbook_entries" to "service_role";

grant delete on table "public"."logbook_images" to "anon";

grant insert on table "public"."logbook_images" to "anon";

grant references on table "public"."logbook_images" to "anon";

grant select on table "public"."logbook_images" to "anon";

grant trigger on table "public"."logbook_images" to "anon";

grant truncate on table "public"."logbook_images" to "anon";

grant update on table "public"."logbook_images" to "anon";

grant delete on table "public"."logbook_images" to "authenticated";

grant insert on table "public"."logbook_images" to "authenticated";

grant references on table "public"."logbook_images" to "authenticated";

grant select on table "public"."logbook_images" to "authenticated";

grant trigger on table "public"."logbook_images" to "authenticated";

grant truncate on table "public"."logbook_images" to "authenticated";

grant update on table "public"."logbook_images" to "authenticated";

grant delete on table "public"."logbook_images" to "service_role";

grant insert on table "public"."logbook_images" to "service_role";

grant references on table "public"."logbook_images" to "service_role";

grant select on table "public"."logbook_images" to "service_role";

grant trigger on table "public"."logbook_images" to "service_role";

grant truncate on table "public"."logbook_images" to "service_role";

grant update on table "public"."logbook_images" to "service_role";

grant delete on table "public"."profile_images" to "anon";

grant insert on table "public"."profile_images" to "anon";

grant references on table "public"."profile_images" to "anon";

grant select on table "public"."profile_images" to "anon";

grant trigger on table "public"."profile_images" to "anon";

grant truncate on table "public"."profile_images" to "anon";

grant update on table "public"."profile_images" to "anon";

grant delete on table "public"."profile_images" to "authenticated";

grant insert on table "public"."profile_images" to "authenticated";

grant references on table "public"."profile_images" to "authenticated";

grant select on table "public"."profile_images" to "authenticated";

grant trigger on table "public"."profile_images" to "authenticated";

grant truncate on table "public"."profile_images" to "authenticated";

grant update on table "public"."profile_images" to "authenticated";

grant delete on table "public"."profile_images" to "service_role";

grant insert on table "public"."profile_images" to "service_role";

grant references on table "public"."profile_images" to "service_role";

grant select on table "public"."profile_images" to "service_role";

grant trigger on table "public"."profile_images" to "service_role";

grant truncate on table "public"."profile_images" to "service_role";

grant update on table "public"."profile_images" to "service_role";

grant delete on table "public"."profiles" to "anon";

grant insert on table "public"."profiles" to "anon";

grant references on table "public"."profiles" to "anon";

grant select on table "public"."profiles" to "anon";

grant trigger on table "public"."profiles" to "anon";

grant truncate on table "public"."profiles" to "anon";

grant update on table "public"."profiles" to "anon";

grant delete on table "public"."profiles" to "authenticated";

grant insert on table "public"."profiles" to "authenticated";

grant references on table "public"."profiles" to "authenticated";

grant select on table "public"."profiles" to "authenticated";

grant trigger on table "public"."profiles" to "authenticated";

grant truncate on table "public"."profiles" to "authenticated";

grant update on table "public"."profiles" to "authenticated";

grant delete on table "public"."profiles" to "service_role";

grant insert on table "public"."profiles" to "service_role";

grant references on table "public"."profiles" to "service_role";

grant select on table "public"."profiles" to "service_role";

grant trigger on table "public"."profiles" to "service_role";

grant truncate on table "public"."profiles" to "service_role";

grant update on table "public"."profiles" to "service_role";

grant delete on table "public"."user_saved_locations" to "anon";

grant insert on table "public"."user_saved_locations" to "anon";

grant references on table "public"."user_saved_locations" to "anon";

grant select on table "public"."user_saved_locations" to "anon";

grant trigger on table "public"."user_saved_locations" to "anon";

grant truncate on table "public"."user_saved_locations" to "anon";

grant update on table "public"."user_saved_locations" to "anon";

grant delete on table "public"."user_saved_locations" to "authenticated";

grant insert on table "public"."user_saved_locations" to "authenticated";

grant references on table "public"."user_saved_locations" to "authenticated";

grant select on table "public"."user_saved_locations" to "authenticated";

grant trigger on table "public"."user_saved_locations" to "authenticated";

grant truncate on table "public"."user_saved_locations" to "authenticated";

grant update on table "public"."user_saved_locations" to "authenticated";

grant delete on table "public"."user_saved_locations" to "service_role";

grant insert on table "public"."user_saved_locations" to "service_role";

grant references on table "public"."user_saved_locations" to "service_role";

grant select on table "public"."user_saved_locations" to "service_role";

grant trigger on table "public"."user_saved_locations" to "service_role";

grant truncate on table "public"."user_saved_locations" to "service_role";

grant update on table "public"."user_saved_locations" to "service_role";


  create policy "Admins can manage all submission images"
  on "public"."location_submission_images"
  as permissive
  for all
  to public
using ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['ADMIN'::text, 'SUPER_ADMIN'::text]))))));



  create policy "Users can delete images from own submissions"
  on "public"."location_submission_images"
  as permissive
  for delete
  to public
using ((EXISTS ( SELECT 1
   FROM public.location_submission_requests
  WHERE ((location_submission_requests.id = location_submission_images.submission_id) AND (location_submission_requests.user_id = auth.uid()) AND (location_submission_requests.status = 'pending'::text)))));



  create policy "Users can insert images for own submissions"
  on "public"."location_submission_images"
  as permissive
  for insert
  to public
with check ((EXISTS ( SELECT 1
   FROM public.location_submission_requests
  WHERE ((location_submission_requests.id = location_submission_images.submission_id) AND (location_submission_requests.user_id = auth.uid())))));



  create policy "Users can view own submission images"
  on "public"."location_submission_images"
  as permissive
  for select
  to public
using ((EXISTS ( SELECT 1
   FROM public.location_submission_requests
  WHERE ((location_submission_requests.id = location_submission_images.submission_id) AND (location_submission_requests.user_id = auth.uid())))));



  create policy "Admins can manage all submissions"
  on "public"."location_submission_requests"
  as permissive
  for all
  to public
using ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['ADMIN'::text, 'SUPER_ADMIN'::text]))))));



  create policy "Users can create submissions"
  on "public"."location_submission_requests"
  as permissive
  for insert
  to public
with check ((user_id = auth.uid()));



  create policy "Users can update own pending submissions"
  on "public"."location_submission_requests"
  as permissive
  for update
  to public
using (((user_id = auth.uid()) AND (status = 'pending'::text)));



  create policy "Users can view own submissions"
  on "public"."location_submission_requests"
  as permissive
  for select
  to public
using ((user_id = auth.uid()));



  create policy "Admins can insert locations"
  on "public"."locations"
  as permissive
  for insert
  to public
with check ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['ADMIN'::text, 'SUPERUSER'::text]))))));



  create policy "Admins can update locations"
  on "public"."locations"
  as permissive
  for update
  to public
using ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['ADMIN'::text, 'SUPERUSER'::text]))))));



  create policy "Public can read visible locations"
  on "public"."locations"
  as permissive
  for select
  to public
using ((((auth.uid() IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['ADMIN'::text, 'SUPERUSER'::text])))))) OR ((is_hidden = false) OR (is_hidden IS NULL))));



  create policy "Superusers can delete locations"
  on "public"."locations"
  as permissive
  for delete
  to public
using ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'SUPERUSER'::text)))));



  create policy "Users can create own logbook entries"
  on "public"."logbook_entries"
  as permissive
  for insert
  to public
with check ((auth.uid() = user_id));



  create policy "Users can delete own logbook entries"
  on "public"."logbook_entries"
  as permissive
  for delete
  to public
using ((auth.uid() = user_id));



  create policy "Users can update own logbook entries"
  on "public"."logbook_entries"
  as permissive
  for update
  to public
using ((auth.uid() = user_id));



  create policy "Users can view own logbook entries"
  on "public"."logbook_entries"
  as permissive
  for select
  to public
using ((auth.uid() = user_id));



  create policy "profiles_delete_policy"
  on "public"."profiles"
  as permissive
  for delete
  to public
using ((public.get_current_user_role() = 'SUPERUSER'::text));



  create policy "profiles_insert_policy"
  on "public"."profiles"
  as permissive
  for insert
  to public
with check ((auth.uid() = id));



  create policy "profiles_select_policy"
  on "public"."profiles"
  as permissive
  for select
  to public
using (((auth.uid() = id) OR (public.get_current_user_role() = 'SUPERUSER'::text)));



  create policy "profiles_update_policy"
  on "public"."profiles"
  as permissive
  for update
  to public
using (((auth.uid() = id) OR (public.get_current_user_role() = 'SUPERUSER'::text)));



  create policy "Users can save locations"
  on "public"."user_saved_locations"
  as permissive
  for insert
  to public
with check ((auth.uid() = user_id));



  create policy "Users can unsave locations"
  on "public"."user_saved_locations"
  as permissive
  for delete
  to public
using ((auth.uid() = user_id));



  create policy "Users can view own saved locations"
  on "public"."user_saved_locations"
  as permissive
  for select
  to public
using ((auth.uid() = user_id));


CREATE TRIGGER handle_locations_audit_trigger BEFORE INSERT OR UPDATE ON public.locations FOR EACH ROW EXECUTE FUNCTION public.handle_locations_audit();

CREATE TRIGGER handle_updated_at_logbook_entries BEFORE UPDATE ON public.logbook_entries FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_updated_at_profiles BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


