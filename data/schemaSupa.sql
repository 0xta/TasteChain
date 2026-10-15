


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."get_feed_count_by_day"("p_days" integer DEFAULT 7) RETURNS TABLE("day" "date", "feed_count" bigint)
    LANGUAGE "sql"
    AS $$
  SELECT
    DATE(created_at AT TIME ZONE 'Asia/Bangkok') AS day,
    COUNT(*) AS feed_count
  FROM places
  WHERE created_at >= '2026-05-11T00:00:00+07'
    AND (p_days = 0 OR created_at >= NOW() - (p_days || ' days')::INTERVAL)
  GROUP BY day
  ORDER BY day;
$$;


ALTER FUNCTION "public"."get_feed_count_by_day"("p_days" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."recalc_shop_quality_score"("p_place_id" "text") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    score INTEGER := 0;
BEGIN
    -- +1 verified LINE OA
    IF EXISTS (
        SELECT 1 FROM place_lines
        WHERE place_id = p_place_id
          AND type = 'OA' AND is_verified = TRUE AND deleted_at IS NULL
    ) THEN score := score + 1; END IF;

    -- +1 business phone
    IF EXISTS (
        SELECT 1 FROM place_phones
        WHERE place_id = p_place_id
          AND category = 'business' AND deleted_at IS NULL
    ) THEN score := score + 1; END IF;

    -- +1 business email
    IF EXISTS (
        SELECT 1 FROM place_emails
        WHERE place_id = p_place_id
          AND category = 'business' AND deleted_at IS NULL
    ) THEN score := score + 1; END IF;

    -- +1 มี facebook หรือ instagram
    IF EXISTS (
        SELECT 1 FROM place_facebooks WHERE place_id = p_place_id AND deleted_at IS NULL
        UNION ALL
        SELECT 1 FROM place_instagrams WHERE place_id = p_place_id AND deleted_at IS NULL
        LIMIT 1
    ) THEN score := score + 1; END IF;

    -- +1 verified Telegram channel
    IF EXISTS (
        SELECT 1 FROM place_telegrams
        WHERE place_id = p_place_id
          AND type = 'channel' AND is_verified = TRUE AND deleted_at IS NULL
    ) THEN score := score + 1; END IF;

    -- +1 verified WhatsApp
    IF EXISTS (
        SELECT 1 FROM place_whatsapps
        WHERE place_id = p_place_id
          AND is_verified = TRUE AND deleted_at IS NULL
    ) THEN score := score + 1; END IF;

    UPDATE places SET shop_quality_score = score, updated_at = NOW()
    WHERE place_id = p_place_id;
END;
$$;


ALTER FUNCTION "public"."recalc_shop_quality_score"("p_place_id" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rls_auto_enable"() RETURNS "event_trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog'
    AS $$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$$;


ALTER FUNCTION "public"."rls_auto_enable"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."set_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trigger_contact_history"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    -- ถ้า record ถูก lock โดย admin (is_manual = true) และ changed_by = scraper → ยกเลิก update
    IF TG_OP = 'UPDATE'
       AND OLD.is_manual = TRUE
       AND NEW.added_by = 'scraper' THEN
        RETURN OLD; -- ไม่อนุญาตให้ scraper ทับ manual record
    END IF;

    INSERT INTO contact_history (
        table_name, record_id, place_id, action,
        confidence_before, confidence_after,
        old_value, new_value,
        changed_by
    ) VALUES (
        TG_TABLE_NAME,
        CASE WHEN TG_OP = 'DELETE' THEN OLD.id ELSE NEW.id END,
        CASE WHEN TG_OP = 'DELETE' THEN OLD.place_id ELSE NEW.place_id END,
        TG_OP,
        CASE WHEN TG_OP IN ('UPDATE','DELETE') THEN OLD.confidence ELSE NULL END,
        CASE WHEN TG_OP IN ('INSERT','UPDATE') THEN NEW.confidence ELSE NULL END,
        CASE WHEN TG_OP IN ('UPDATE','DELETE') THEN to_jsonb(OLD) ELSE NULL END,
        CASE WHEN TG_OP IN ('INSERT','UPDATE') THEN to_jsonb(NEW) ELSE NULL END,
        CASE WHEN TG_OP = 'INSERT' THEN NEW.added_by ELSE 'system' END
    );

    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."trigger_contact_history"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trigger_recalc_score"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        PERFORM recalc_shop_quality_score(OLD.place_id);
    ELSE
        PERFORM recalc_shop_quality_score(NEW.place_id);
    END IF;
    RETURN NULL;
END;
$$;


ALTER FUNCTION "public"."trigger_recalc_score"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."places" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "place_id" "text" NOT NULL,
    "name" "text",
    "address" "text",
    "city" "text",
    "country" "text" DEFAULT 'TH'::"text",
    "google_map_url" "text",
    "latitude" numeric(10,7),
    "longitude" numeric(10,7),
    "service_type" "text",
    "service_types" "jsonb" DEFAULT '[]'::"jsonb",
    "business_status" "text" DEFAULT 'OPERATIONAL'::"text",
    "scraped" boolean DEFAULT false,
    "scraped_at" timestamp with time zone,
    "scrape_batch" "text",
    "extra" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "scraping" boolean DEFAULT false,
    "scraping_at" timestamp with time zone,
    "data_source" "text" DEFAULT 'gcp'::"text"
);


ALTER TABLE "public"."places" OWNER TO "postgres";


ALTER TABLE ONLY "public"."places"
    ADD CONSTRAINT "places_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."places"
    ADD CONSTRAINT "places_place_id_key" UNIQUE ("place_id");



CREATE INDEX "idx_places_business_status" ON "public"."places" USING "btree" ("business_status");



CREATE INDEX "idx_places_city" ON "public"."places" USING "btree" ("city");



CREATE INDEX "idx_places_city_status" ON "public"."places" USING "btree" ("city", "business_status");



CREATE INDEX "idx_places_place_id" ON "public"."places" USING "btree" ("place_id");



CREATE INDEX "idx_places_scraped" ON "public"."places" USING "btree" ("scraped");



CREATE INDEX "idx_places_scraped_city" ON "public"."places" USING "btree" ("scraped", "city");



CREATE OR REPLACE TRIGGER "trg_places_updated_at" BEFORE UPDATE ON "public"."places" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



ALTER TABLE "public"."places" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";






















































































































































GRANT ALL ON FUNCTION "public"."get_feed_count_by_day"("p_days" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_feed_count_by_day"("p_days" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_feed_count_by_day"("p_days" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."recalc_shop_quality_score"("p_place_id" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."recalc_shop_quality_score"("p_place_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."recalc_shop_quality_score"("p_place_id" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "anon";
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trigger_contact_history"() TO "anon";
GRANT ALL ON FUNCTION "public"."trigger_contact_history"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trigger_contact_history"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trigger_recalc_score"() TO "anon";
GRANT ALL ON FUNCTION "public"."trigger_recalc_score"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trigger_recalc_score"() TO "service_role";


















GRANT ALL ON TABLE "public"."places" TO "anon";
GRANT ALL ON TABLE "public"."places" TO "authenticated";
GRANT ALL ON TABLE "public"."places" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";



































