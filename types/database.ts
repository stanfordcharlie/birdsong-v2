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
          user_id: string;
          created_at: string;
          archived_at: string | null;
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
          user_id: string;
          created_at?: string;
          archived_at?: string | null;
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
          user_id?: string;
          created_at?: string;
          archived_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "surveys_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
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
          user_id: string;
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
          // Populated server-side by the set_response_user_id trigger; safe
          // to omit on insert even though the column is NOT NULL.
          user_id?: string;
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
          user_id?: string;
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
        ];
      };
      profiles: {
        Row: {
          user_id: string;
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
        ];
      };
      survey_reports: {
        Row: {
          id: string;
          survey_id: string;
          user_id: string;
          content: Json;
          respondent_count: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          survey_id: string;
          user_id: string;
          content: Json;
          respondent_count: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          survey_id?: string;
          user_id?: string;
          content?: Json;
          respondent_count?: number;
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
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
