export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      surveys: {
        Row: {
          id: string;
          slug: string;
          title: string;
          external_title: string | null;
          topic: string | null;
          public_description: string | null;
          sponsor: string | null;
          target_industry: string | null;
          target_job_title: string | null;
          target_company_size: string | null;
          question_guide: string | null;
          tone: string | null;
          num_questions: number | null;
          gift_card_amount: number | null;
          custom_fields: Json;
          status: string;
          is_sample: boolean;
          publish_public: boolean;
          user_id: string;
          org_id: string;
          created_at: string;
          archived_at: string | null;
          guide_structured: Json | null;
          brief_transcript: Json | null;
          qualification_criteria: string | null;
        };
        Insert: {
          id?: string;
          slug: string;
          title: string;
          external_title?: string | null;
          topic?: string | null;
          public_description?: string | null;
          sponsor?: string | null;
          target_industry?: string | null;
          target_job_title?: string | null;
          target_company_size?: string | null;
          question_guide?: string | null;
          tone?: string | null;
          num_questions?: number | null;
          gift_card_amount?: number | null;
          custom_fields?: Json;
          status?: string;
          is_sample?: boolean;
          publish_public?: boolean;
          user_id: string;
          org_id: string;
          created_at?: string;
          archived_at?: string | null;
          guide_structured?: Json | null;
          brief_transcript?: Json | null;
          qualification_criteria?: string | null;
        };
        Update: {
          id?: string;
          slug?: string;
          title?: string;
          external_title?: string | null;
          topic?: string | null;
          public_description?: string | null;
          sponsor?: string | null;
          target_industry?: string | null;
          target_job_title?: string | null;
          target_company_size?: string | null;
          question_guide?: string | null;
          tone?: string | null;
          num_questions?: number | null;
          gift_card_amount?: number | null;
          custom_fields?: Json;
          status?: string;
          is_sample?: boolean;
          publish_public?: boolean;
          user_id?: string;
          org_id?: string;
          created_at?: string;
          archived_at?: string | null;
          guide_structured?: Json | null;
          brief_transcript?: Json | null;
          qualification_criteria?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "surveys_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "surveys_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      responses: {
        Row: {
          id: string;
          survey_id: string;
          respondent_name: string | null;
          respondent_email: string | null;
          respondent_phone: string | null;
          messages: Json;
          pain_points: Json;
          lead_score: number | null;
          fit_reason: string | null;
          fit_score: number | null;
          fit_reasoning: string | null;
          fit_confidence: string | null;
          completed: boolean;
          custom_field_values: Json;
          status: string;
          call_script: Json | null;
          summary: string | null;
          signals: Json | null;
          session_token: string | null;
          source: string | null;
          is_test: boolean;
          // HubSpot sync bookkeeping (lib/hubspot-sync.ts). All null until a
          // sync succeeds; hubspot_deal_id stays null for leads below the
          // deal-creation threshold even after a successful contact sync.
          hubspot_contact_id: string | null;
          hubspot_deal_id: string | null;
          hubspot_synced_at: string | null;
          // Lead workflow (20260904000000_lead_workflow.sql). lead_status
          // and last_activity_at are NOT NULL with defaults; the rest are
          // null until a rep acts. `status` above is a projection of
          // lead_status kept by the mirror_lead_status trigger.
          lead_status: Database["public"]["Enums"]["lead_status"];
          assigned_to: string | null;
          assigned_at: string | null;
          disqualify_reason: Database["public"]["Enums"]["disqualify_reason"] | null;
          disqualify_note: string | null;
          status_changed_at: string | null;
          last_activity_at: string;
          user_id: string;
          org_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          survey_id: string;
          respondent_name?: string | null;
          respondent_email?: string | null;
          respondent_phone?: string | null;
          messages?: Json;
          pain_points?: Json;
          lead_score?: number | null;
          fit_reason?: string | null;
          fit_score?: number | null;
          fit_reasoning?: string | null;
          fit_confidence?: string | null;
          completed?: boolean;
          custom_field_values?: Json;
          status?: string;
          call_script?: Json | null;
          summary?: string | null;
          signals?: Json | null;
          session_token?: string | null;
          source?: string | null;
          is_test?: boolean;
          hubspot_contact_id?: string | null;
          hubspot_deal_id?: string | null;
          hubspot_synced_at?: string | null;
          lead_status?: Database["public"]["Enums"]["lead_status"];
          assigned_to?: string | null;
          assigned_at?: string | null;
          disqualify_reason?: Database["public"]["Enums"]["disqualify_reason"] | null;
          disqualify_note?: string | null;
          status_changed_at?: string | null;
          last_activity_at?: string;
          // Populated server-side by the set_response_user_id and
          // set_response_org_id triggers (both derived from the parent
          // survey, and org_id is always overwritten); safe to omit on
          // insert even though both columns are NOT NULL.
          user_id?: string;
          org_id?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          survey_id?: string;
          respondent_name?: string | null;
          respondent_email?: string | null;
          respondent_phone?: string | null;
          messages?: Json;
          pain_points?: Json;
          lead_score?: number | null;
          fit_reason?: string | null;
          fit_score?: number | null;
          fit_reasoning?: string | null;
          fit_confidence?: string | null;
          completed?: boolean;
          custom_field_values?: Json;
          status?: string;
          call_script?: Json | null;
          summary?: string | null;
          signals?: Json | null;
          session_token?: string | null;
          source?: string | null;
          is_test?: boolean;
          hubspot_contact_id?: string | null;
          hubspot_deal_id?: string | null;
          hubspot_synced_at?: string | null;
          lead_status?: Database["public"]["Enums"]["lead_status"];
          assigned_to?: string | null;
          assigned_at?: string | null;
          disqualify_reason?: Database["public"]["Enums"]["disqualify_reason"] | null;
          disqualify_note?: string | null;
          status_changed_at?: string | null;
          last_activity_at?: string;
          user_id?: string;
          org_id?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "responses_survey_id_fkey";
            columns: ["survey_id"];
            isOneToOne: false;
            referencedRelation: "surveys";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "responses_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "responses_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "responses_assigned_to_fkey";
            columns: ["assigned_to"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          user_id: string;
          org_id: string;
          company_name: string | null;
          what_we_sell: string | null;
          target_icp: string | null;
          value_prop: string | null;
          logo_url: string | null;
          industry: string | null;
          team_size: string | null;
          website: string | null;
          linkedin: string | null;
          tone: string | null;
          words_to_avoid: string | null;
          contact_name: string | null;
          contact_email: string | null;
          onboarding_completed_at: string | null;
          enrichment_sources: Json;
          last_enriched_at: string | null;
          slack_webhook_url: string | null;
          created_at: string;
        };
        Insert: {
          user_id: string;
          org_id: string;
          company_name?: string | null;
          what_we_sell?: string | null;
          target_icp?: string | null;
          value_prop?: string | null;
          logo_url?: string | null;
          industry?: string | null;
          team_size?: string | null;
          website?: string | null;
          linkedin?: string | null;
          tone?: string | null;
          words_to_avoid?: string | null;
          contact_name?: string | null;
          contact_email?: string | null;
          onboarding_completed_at?: string | null;
          enrichment_sources?: Json;
          last_enriched_at?: string | null;
          slack_webhook_url?: string | null;
          created_at?: string;
        };
        Update: {
          user_id?: string;
          org_id?: string;
          company_name?: string | null;
          what_we_sell?: string | null;
          target_icp?: string | null;
          value_prop?: string | null;
          logo_url?: string | null;
          industry?: string | null;
          team_size?: string | null;
          website?: string | null;
          linkedin?: string | null;
          tone?: string | null;
          words_to_avoid?: string | null;
          contact_name?: string | null;
          contact_email?: string | null;
          onboarding_completed_at?: string | null;
          enrichment_sources?: Json;
          last_enriched_at?: string | null;
          slack_webhook_url?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: true;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "profiles_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: true;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      research_subscribers: {
        Row: {
          id: string;
          email: string;
          source_report_slug: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          source_report_slug?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          source_report_slug?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      survey_reports: {
        Row: {
          id: string;
          survey_id: string;
          user_id: string;
          org_id: string;
          content: Json;
          respondent_count: number;
          published: boolean;
          published_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          survey_id: string;
          user_id: string;
          org_id: string;
          content: Json;
          respondent_count: number;
          published?: boolean;
          published_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          survey_id?: string;
          user_id?: string;
          org_id?: string;
          content?: Json;
          respondent_count?: number;
          published?: boolean;
          published_at?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "survey_reports_survey_id_fkey";
            columns: ["survey_id"];
            isOneToOne: false;
            referencedRelation: "surveys";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "survey_reports_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "survey_reports_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      auth_events: {
        Row: {
          id: string;
          user_id: string;
          email: string | null;
          event_type: "signup" | "login";
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          email?: string | null;
          event_type: "signup" | "login";
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          email?: string | null;
          event_type?: "signup" | "login";
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "auth_events_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      agent_runs: {
        Row: {
          id: string;
          agent_name: string;
          response_id: string | null;
          survey_id: string | null;
          model: string;
          input_tokens: number | null;
          output_tokens: number | null;
          latency_ms: number;
          outcome: "success" | "recovered" | "failed";
          error: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          agent_name: string;
          response_id?: string | null;
          survey_id?: string | null;
          model: string;
          input_tokens?: number | null;
          output_tokens?: number | null;
          latency_ms: number;
          outcome: "success" | "recovered" | "failed";
          error?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          agent_name?: string;
          response_id?: string | null;
          survey_id?: string | null;
          model?: string;
          input_tokens?: number | null;
          output_tokens?: number | null;
          latency_ms?: number;
          outcome?: "success" | "recovered" | "failed";
          error?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "agent_runs_response_id_fkey";
            columns: ["response_id"];
            isOneToOne: false;
            referencedRelation: "responses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "agent_runs_survey_id_fkey";
            columns: ["survey_id"];
            isOneToOne: false;
            referencedRelation: "surveys";
            referencedColumns: ["id"];
          },
        ];
      };
      organizations: {
        Row: {
          id: string;
          name: string;
          slug: string;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          created_by?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "organizations_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      org_members: {
        Row: {
          id: string;
          org_id: string;
          user_id: string;
          role: Database["public"]["Enums"]["org_role"];
          created_at: string;
        };
        Insert: {
          id?: string;
          org_id: string;
          user_id: string;
          role?: Database["public"]["Enums"]["org_role"];
          created_at?: string;
        };
        Update: {
          id?: string;
          org_id?: string;
          user_id?: string;
          role?: Database["public"]["Enums"]["org_role"];
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "org_members_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "org_members_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      org_invites: {
        Row: {
          id: string;
          org_id: string;
          email: string;
          role: Database["public"]["Enums"]["org_role"];
          token: string;
          invited_by: string | null;
          expires_at: string;
          accepted_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          org_id: string;
          email: string;
          role?: Database["public"]["Enums"]["org_role"];
          token: string;
          invited_by?: string | null;
          expires_at: string;
          accepted_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          org_id?: string;
          email?: string;
          role?: Database["public"]["Enums"]["org_role"];
          token?: string;
          invited_by?: string | null;
          expires_at?: string;
          accepted_at?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "org_invites_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "org_invites_invited_by_fkey";
            columns: ["invited_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      lead_activity: {
        Row: {
          id: string;
          response_id: string;
          // Set by the set_lead_activity_org_id trigger from the parent
          // response; never supplied by application code.
          org_id: string;
          // Null when Birdsong itself acted (e.g. the automatic CRM push).
          actor_id: string | null;
          type: Database["public"]["Enums"]["lead_activity_type"];
          from_status: Database["public"]["Enums"]["lead_status"] | null;
          to_status: Database["public"]["Enums"]["lead_status"] | null;
          body: string | null;
          metadata: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          response_id: string;
          org_id?: string;
          actor_id?: string | null;
          type: Database["public"]["Enums"]["lead_activity_type"];
          from_status?: Database["public"]["Enums"]["lead_status"] | null;
          to_status?: Database["public"]["Enums"]["lead_status"] | null;
          body?: string | null;
          metadata?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          response_id?: string;
          org_id?: string;
          actor_id?: string | null;
          type?: Database["public"]["Enums"]["lead_activity_type"];
          from_status?: Database["public"]["Enums"]["lead_status"] | null;
          to_status?: Database["public"]["Enums"]["lead_status"] | null;
          body?: string | null;
          metadata?: Json | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "lead_activity_response_id_fkey";
            columns: ["response_id"];
            isOneToOne: false;
            referencedRelation: "responses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "lead_activity_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "lead_activity_actor_id_fkey";
            columns: ["actor_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: {
      transfer_org_ownership: {
        Args: { target_org: string; new_owner: string };
        Returns: undefined;
      };
      user_org_ids: {
        Args: Record<string, never>;
        Returns: string[];
      };
      has_org_role: {
        Args: { target_org: string; allowed: Database["public"]["Enums"]["org_role"][] };
        Returns: boolean;
      };
      // Service-role only (lib/leads/activity.ts): one lead mutation and its
      // activity row in one transaction. Returns the activity id.
      apply_lead_change: {
        Args: {
          p_response_id: string;
          p_actor_id: string | null;
          p_type: Database["public"]["Enums"]["lead_activity_type"];
          p_to_status?: Database["public"]["Enums"]["lead_status"] | null;
          p_set_assignee?: boolean;
          p_assigned_to?: string | null;
          p_disqualify_reason?: Database["public"]["Enums"]["disqualify_reason"] | null;
          p_disqualify_note?: string | null;
          p_body?: string | null;
          p_metadata?: Json | null;
        };
        Returns: string;
      };
    };
    Enums: {
      org_role: "owner" | "admin" | "member";
      lead_status:
        | "new"
        | "assigned"
        | "contacted"
        | "meeting_booked"
        | "qualified"
        | "disqualified"
        | "nurture";
      disqualify_reason:
        | "not_icp"
        | "no_budget"
        | "no_authority"
        | "no_pain"
        | "competitor"
        | "bad_contact_info"
        | "unresponsive"
        | "already_customer"
        | "other";
      lead_activity_type: "status_change" | "assigned" | "unassigned" | "note" | "crm_push";
    };
    CompositeTypes: Record<string, never>;
  };
};
