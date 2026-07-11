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
          sponsor: string | null;
          target_industry: string | null;
          target_job_title: string | null;
          target_company_size: string | null;
          question_guide: string | null;
          tone: string | null;
          num_questions: number | null;
          gift_card_amount: number | null;
          custom_fields: Json;
          user_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          title: string;
          external_title?: string | null;
          topic?: string | null;
          sponsor?: string | null;
          target_industry?: string | null;
          target_job_title?: string | null;
          target_company_size?: string | null;
          question_guide?: string | null;
          tone?: string | null;
          num_questions?: number | null;
          gift_card_amount?: number | null;
          custom_fields?: Json;
          user_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          slug?: string;
          title?: string;
          external_title?: string | null;
          topic?: string | null;
          sponsor?: string | null;
          target_industry?: string | null;
          target_job_title?: string | null;
          target_company_size?: string | null;
          question_guide?: string | null;
          tone?: string | null;
          num_questions?: number | null;
          gift_card_amount?: number | null;
          custom_fields?: Json;
          user_id?: string;
          created_at?: string;
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
          completed: boolean;
          custom_field_values: Json;
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
          completed?: boolean;
          custom_field_values?: Json;
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
          completed?: boolean;
          custom_field_values?: Json;
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
          enrichment_sources: Json;
          last_enriched_at: string | null;
          created_at: string;
        };
        Insert: {
          user_id: string;
          company_name?: string | null;
          what_we_sell?: string | null;
          target_icp?: string | null;
          value_prop?: string | null;
          enrichment_sources?: Json;
          last_enriched_at?: string | null;
          created_at?: string;
        };
        Update: {
          user_id?: string;
          company_name?: string | null;
          what_we_sell?: string | null;
          target_icp?: string | null;
          value_prop?: string | null;
          enrichment_sources?: Json;
          last_enriched_at?: string | null;
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
      roadmap_items: {
        Row: {
          id: string;
          title: string;
          description: string | null;
          status: "done" | "in_progress" | "planned";
          category: string | null;
          created_at: string;
          completed_at: string | null;
        };
        Insert: {
          id?: string;
          title: string;
          description?: string | null;
          status?: "done" | "in_progress" | "planned";
          category?: string | null;
          created_at?: string;
          completed_at?: string | null;
        };
        Update: {
          id?: string;
          title?: string;
          description?: string | null;
          status?: "done" | "in_progress" | "planned";
          category?: string | null;
          created_at?: string;
          completed_at?: string | null;
        };
        Relationships: [];
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
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
