export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      account_private: {
        Row: {
          admin_note: string | null
          designation: string | null
          education_level: string | null
          education_status: string | null
          email: string
          graduation_year: string | null
          institution_id: string | null
          linkedin: string | null
          phone: string | null
          phone_verified: boolean
          qualification: string | null
          resume_file_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_note?: string | null
          designation?: string | null
          education_level?: string | null
          education_status?: string | null
          email: string
          graduation_year?: string | null
          institution_id?: string | null
          linkedin?: string | null
          phone?: string | null
          phone_verified?: boolean
          qualification?: string | null
          resume_file_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_note?: string | null
          designation?: string | null
          education_level?: string | null
          education_status?: string | null
          email?: string
          graduation_year?: string | null
          institution_id?: string | null
          linkedin?: string | null
          phone?: string | null
          phone_verified?: boolean
          qualification?: string | null
          resume_file_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "account_private_institution_fk"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "account_private_resume_file_id_fkey"
            columns: ["resume_file_id"]
            isOneToOne: false
            referencedRelation: "files"
            referencedColumns: ["id"]
          },
        ]
      }
      account_status: {
        Row: {
          changed_at: string
          changed_by: string | null
          last_active_at: string | null
          reason: string | null
          status: string
          user_id: string
        }
        Insert: {
          changed_at?: string
          changed_by?: string | null
          last_active_at?: string | null
          reason?: string | null
          status?: string
          user_id: string
        }
        Update: {
          changed_at?: string
          changed_by?: string | null
          last_active_at?: string | null
          reason?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      admin_permissions: {
        Row: {
          admin_role_id: string
          module: string
          permission: string
        }
        Insert: {
          admin_role_id: string
          module: string
          permission: string
        }
        Update: {
          admin_role_id?: string
          module?: string
          permission?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_permissions_admin_role_id_fkey"
            columns: ["admin_role_id"]
            isOneToOne: false
            referencedRelation: "admin_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_role_assignments: {
        Row: {
          admin_role_id: string
          assigned_at: string
          assigned_by: string | null
          user_id: string
        }
        Insert: {
          admin_role_id: string
          assigned_at?: string
          assigned_by?: string | null
          user_id: string
        }
        Update: {
          admin_role_id?: string
          assigned_at?: string
          assigned_by?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_role_assignments_admin_role_id_fkey"
            columns: ["admin_role_id"]
            isOneToOne: false
            referencedRelation: "admin_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_roles: {
        Row: {
          description: string
          id: string
          label: string
          position: number
        }
        Insert: {
          description?: string
          id: string
          label: string
          position?: number
        }
        Update: {
          description?: string
          id?: string
          label?: string
          position?: number
        }
        Relationships: []
      }
      announcement_deliveries: {
        Row: {
          announcement_id: string
          channel: string
          created_at: string
          detail: string
          id: string
          status: string
        }
        Insert: {
          announcement_id: string
          channel: string
          created_at?: string
          detail?: string
          id?: string
          status: string
        }
        Update: {
          announcement_id?: string
          channel?: string
          created_at?: string
          detail?: string
          id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcement_deliveries_announcement_id_fkey"
            columns: ["announcement_id"]
            isOneToOne: false
            referencedRelation: "announcements"
            referencedColumns: ["id"]
          },
        ]
      }
      announcements: {
        Row: {
          audience: string[]
          body: string
          channels: string[]
          created_at: string
          created_by: string | null
          id: string
          published_at: string | null
          scheduled_for: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          audience?: string[]
          body?: string
          channels?: string[]
          created_at?: string
          created_by?: string | null
          id?: string
          published_at?: string | null
          scheduled_for?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          audience?: string[]
          body?: string
          channels?: string[]
          created_at?: string
          created_by?: string | null
          id?: string
          published_at?: string | null
          scheduled_for?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      applications: {
        Row: {
          opportunity_id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          opportunity_id: string
          status: string
          updated_at?: string
          user_id: string
        }
        Update: {
          opportunity_id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "applications_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
        ]
      }
      assumptions: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          risk: string
          section_id: string | null
          statement: string
          status: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          risk?: string
          section_id?: string | null
          statement: string
          status?: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          risk?: string
          section_id?: string | null
          statement?: string
          status?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "assumptions_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "validation_workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          actor_label: string
          actor_role: string | null
          after_value: string | null
          before_value: string | null
          created_at: string
          entity: string
          id: number
          reason: string | null
          sensitive: boolean
          target_id: string | null
          target_label: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_label?: string
          actor_role?: string | null
          after_value?: string | null
          before_value?: string | null
          created_at?: string
          entity: string
          id?: never
          reason?: string | null
          sensitive?: boolean
          target_id?: string | null
          target_label?: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_label?: string
          actor_role?: string | null
          after_value?: string | null
          before_value?: string | null
          created_at?: string
          entity?: string
          id?: never
          reason?: string | null
          sensitive?: boolean
          target_id?: string | null
          target_label?: string
        }
        Relationships: []
      }
      cms_content: {
        Row: {
          draft: Json
          id: string
          kind: string
          label: string
          position: number
          published: Json | null
          status: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          draft?: Json
          id: string
          kind: string
          label: string
          position?: number
          published?: Json | null
          status?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          draft?: Json
          id?: string
          kind?: string
          label?: string
          position?: number
          published?: Json | null
          status?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      cms_versions: {
        Row: {
          cms_id: string
          fields: Json
          published_at: string
          published_by: string | null
          version: number
        }
        Insert: {
          cms_id: string
          fields: Json
          published_at?: string
          published_by?: string | null
          version: number
        }
        Update: {
          cms_id?: string
          fields?: Json
          published_at?: string
          published_by?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "cms_versions_cms_id_fkey"
            columns: ["cms_id"]
            isOneToOne: false
            referencedRelation: "cms_content"
            referencedColumns: ["id"]
          },
        ]
      }
      collaboration_requests: {
        Row: {
          created_at: string
          flagged_at: string | null
          flagged_reason: string | null
          from_id: string
          id: string
          is_demo: boolean
          kind: string
          message: string
          responded_at: string | null
          role: string
          status: string
          to_id: string | null
          venture_id: string | null
        }
        Insert: {
          created_at?: string
          flagged_at?: string | null
          flagged_reason?: string | null
          from_id: string
          id?: string
          is_demo?: boolean
          kind?: string
          message?: string
          responded_at?: string | null
          role?: string
          status?: string
          to_id?: string | null
          venture_id?: string | null
        }
        Update: {
          created_at?: string
          flagged_at?: string | null
          flagged_reason?: string | null
          from_id?: string
          id?: string
          is_demo?: boolean
          kind?: string
          message?: string
          responded_at?: string | null
          role?: string
          status?: string
          to_id?: string | null
          venture_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "collaboration_requests_venture_id_fkey"
            columns: ["venture_id"]
            isOneToOne: false
            referencedRelation: "ventures"
            referencedColumns: ["id"]
          },
        ]
      }
      comments: {
        Row: {
          author_id: string
          body: string
          created_at: string
          id: string
          is_demo: boolean
          moderated_at: string | null
          moderated_by: string | null
          moderation_reason: string | null
          moderation_status: string
          post_id: string | null
          venture_id: string | null
        }
        Insert: {
          author_id: string
          body: string
          created_at?: string
          id?: string
          is_demo?: boolean
          moderated_at?: string | null
          moderated_by?: string | null
          moderation_reason?: string | null
          moderation_status?: string
          post_id?: string | null
          venture_id?: string | null
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          id?: string
          is_demo?: boolean
          moderated_at?: string | null
          moderated_by?: string | null
          moderation_reason?: string | null
          moderation_status?: string
          post_id?: string | null
          venture_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_venture_id_fkey"
            columns: ["venture_id"]
            isOneToOne: false
            referencedRelation: "ventures"
            referencedColumns: ["id"]
          },
        ]
      }
      connections: {
        Row: {
          addressee_id: string
          created_at: string
          requester_id: string
          responded_at: string | null
          status: string
        }
        Insert: {
          addressee_id: string
          created_at?: string
          requester_id: string
          responded_at?: string | null
          status?: string
        }
        Update: {
          addressee_id?: string
          created_at?: string
          requester_id?: string
          responded_at?: string | null
          status?: string
        }
        Relationships: []
      }
      consent_records: {
        Row: {
          consent: string
          consent_version: string
          id: string
          recorded_at: string
          study_id: string
          user_id: string
        }
        Insert: {
          consent: string
          consent_version: string
          id?: string
          recorded_at?: string
          study_id: string
          user_id: string
        }
        Update: {
          consent?: string
          consent_version?: string
          id?: string
          recorded_at?: string
          study_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "consent_records_study_id_fkey"
            columns: ["study_id"]
            isOneToOne: false
            referencedRelation: "studies"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_interviews: {
        Row: {
          conducted_on: string | null
          consent_recorded: boolean
          created_at: string
          created_by: string | null
          id: string
          interviewee_label: string
          key_quotes: string[]
          segment: string
          summary: string
          workspace_id: string
        }
        Insert: {
          conducted_on?: string | null
          consent_recorded?: boolean
          created_at?: string
          created_by?: string | null
          id?: string
          interviewee_label: string
          key_quotes?: string[]
          segment?: string
          summary?: string
          workspace_id: string
        }
        Update: {
          conducted_on?: string | null
          consent_recorded?: boolean
          created_at?: string
          created_by?: string | null
          id?: string
          interviewee_label?: string
          key_quotes?: string[]
          segment?: string
          summary?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_interviews_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "validation_workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      evidence: {
        Row: {
          assumption_id: string | null
          body: string
          created_at: string
          created_by: string | null
          downgraded_reason: string | null
          evidence_type: string
          file_id: string | null
          framework_generated: boolean
          id: string
          is_demo: boolean
          section_id: string
          source: string
          workspace_id: string
        }
        Insert: {
          assumption_id?: string | null
          body: string
          created_at?: string
          created_by?: string | null
          downgraded_reason?: string | null
          evidence_type: string
          file_id?: string | null
          framework_generated?: boolean
          id?: string
          is_demo?: boolean
          section_id: string
          source?: string
          workspace_id: string
        }
        Update: {
          assumption_id?: string | null
          body?: string
          created_at?: string
          created_by?: string | null
          downgraded_reason?: string | null
          evidence_type?: string
          file_id?: string | null
          framework_generated?: boolean
          id?: string
          is_demo?: boolean
          section_id?: string
          source?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "evidence_assumption_id_fkey"
            columns: ["assumption_id"]
            isOneToOne: false
            referencedRelation: "assumptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evidence_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evidence_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "validation_workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      experiment_results: {
        Row: {
          experiment_id: string
          file_id: string | null
          id: string
          metric: string | null
          outcome: string
          recorded_at: string
          recorded_by: string | null
          summary: string
        }
        Insert: {
          experiment_id: string
          file_id?: string | null
          id?: string
          metric?: string | null
          outcome: string
          recorded_at?: string
          recorded_by?: string | null
          summary: string
        }
        Update: {
          experiment_id?: string
          file_id?: string | null
          id?: string
          metric?: string | null
          outcome?: string
          recorded_at?: string
          recorded_by?: string | null
          summary?: string
        }
        Relationships: [
          {
            foreignKeyName: "experiment_results_experiment_id_fkey"
            columns: ["experiment_id"]
            isOneToOne: false
            referencedRelation: "experiments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "experiment_results_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "files"
            referencedColumns: ["id"]
          },
        ]
      }
      experiments: {
        Row: {
          assumption_id: string | null
          created_at: string
          created_by: string | null
          ends_on: string | null
          hypothesis: string
          id: string
          method: string
          starts_on: string | null
          status: string
          success_criteria: string
          title: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          assumption_id?: string | null
          created_at?: string
          created_by?: string | null
          ends_on?: string | null
          hypothesis?: string
          id?: string
          method?: string
          starts_on?: string | null
          status?: string
          success_criteria?: string
          title: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          assumption_id?: string | null
          created_at?: string
          created_by?: string | null
          ends_on?: string | null
          hypothesis?: string
          id?: string
          method?: string
          starts_on?: string | null
          status?: string
          success_criteria?: string
          title?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "experiments_assumption_id_fkey"
            columns: ["assumption_id"]
            isOneToOne: false
            referencedRelation: "assumptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "experiments_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "validation_workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      expert_reviews: {
        Row: {
          completed_at: string | null
          created_at: string
          due_on: string | null
          feedback: string | null
          id: string
          is_demo: boolean
          recommendation: string | null
          request_note: string
          requested_by: string
          responded_at: string | null
          reviewer_id: string
          status: string
          venture_id: string
          venture_title: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          due_on?: string | null
          feedback?: string | null
          id?: string
          is_demo?: boolean
          recommendation?: string | null
          request_note?: string
          requested_by: string
          responded_at?: string | null
          reviewer_id: string
          status?: string
          venture_id: string
          venture_title?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          due_on?: string | null
          feedback?: string | null
          id?: string
          is_demo?: boolean
          recommendation?: string | null
          request_note?: string
          requested_by?: string
          responded_at?: string | null
          reviewer_id?: string
          status?: string
          venture_id?: string
          venture_title?: string
        }
        Relationships: [
          {
            foreignKeyName: "expert_reviews_venture_id_fkey"
            columns: ["venture_id"]
            isOneToOne: false
            referencedRelation: "ventures"
            referencedColumns: ["id"]
          },
        ]
      }
      files: {
        Row: {
          bucket: string
          created_at: string
          deleted_at: string | null
          id: string
          is_demo: boolean
          mime_type: string
          object_path: string
          original_name: string
          owner_id: string
          purpose: string
          size_bytes: number
        }
        Insert: {
          bucket: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_demo?: boolean
          mime_type: string
          object_path: string
          original_name: string
          owner_id: string
          purpose: string
          size_bytes: number
        }
        Update: {
          bucket?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_demo?: boolean
          mime_type?: string
          object_path?: string
          original_name?: string
          owner_id?: string
          purpose?: string
          size_bytes?: number
        }
        Relationships: []
      }
      follows: {
        Row: {
          created_at: string
          followed_user_id: string | null
          followed_venture_id: string | null
          follower_id: string
          id: string
        }
        Insert: {
          created_at?: string
          followed_user_id?: string | null
          followed_venture_id?: string | null
          follower_id: string
          id?: string
        }
        Update: {
          created_at?: string
          followed_user_id?: string | null
          followed_venture_id?: string | null
          follower_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "follows_followed_venture_id_fkey"
            columns: ["followed_venture_id"]
            isOneToOne: false
            referencedRelation: "ventures"
            referencedColumns: ["id"]
          },
        ]
      }
      institution_members: {
        Row: {
          approved_by: string | null
          institution_id: string
          joined_at: string
          member_role: string
          status: string
          user_id: string
        }
        Insert: {
          approved_by?: string | null
          institution_id: string
          joined_at?: string
          member_role?: string
          status?: string
          user_id: string
        }
        Update: {
          approved_by?: string | null
          institution_id?: string
          joined_at?: string
          member_role?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "institution_members_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      institution_programmes: {
        Row: {
          created_at: string
          description: string
          ends_on: string | null
          id: string
          institution_id: string
          is_demo: boolean
          name: string
          participant_count: number
          starts_on: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string
          ends_on?: string | null
          id?: string
          institution_id: string
          is_demo?: boolean
          name: string
          participant_count?: number
          starts_on?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          ends_on?: string | null
          id?: string
          institution_id?: string
          is_demo?: boolean
          name?: string
          participant_count?: number
          starts_on?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "institution_programmes_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      institution_requests: {
        Row: {
          created_at: string
          id: string
          institution_id: string | null
          is_demo: boolean
          note: string
          position_title: string | null
          proposed_kind: string | null
          proposed_name: string | null
          request_type: string
          requested_by: string
          review_note: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          institution_id?: string | null
          is_demo?: boolean
          note?: string
          position_title?: string | null
          proposed_kind?: string | null
          proposed_name?: string | null
          request_type: string
          requested_by: string
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          institution_id?: string | null
          is_demo?: boolean
          note?: string
          position_title?: string | null
          proposed_kind?: string | null
          proposed_name?: string | null
          request_type?: string
          requested_by?: string
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "institution_requests_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      institutions: {
        Row: {
          agreement_ref: string | null
          created_at: string
          created_by: string | null
          description: string
          id: string
          is_demo: boolean
          kind: string
          location: string
          logo_file_id: string | null
          name: string
          relationship: string
          status: string
          updated_at: string
          website: string | null
        }
        Insert: {
          agreement_ref?: string | null
          created_at?: string
          created_by?: string | null
          description?: string
          id?: string
          is_demo?: boolean
          kind: string
          location?: string
          logo_file_id?: string | null
          name: string
          relationship?: string
          status?: string
          updated_at?: string
          website?: string | null
        }
        Update: {
          agreement_ref?: string | null
          created_at?: string
          created_by?: string | null
          description?: string
          id?: string
          is_demo?: boolean
          kind?: string
          location?: string
          logo_file_id?: string | null
          name?: string
          relationship?: string
          status?: string
          updated_at?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "institutions_logo_file_id_fkey"
            columns: ["logo_file_id"]
            isOneToOne: false
            referencedRelation: "files"
            referencedColumns: ["id"]
          },
        ]
      }
      judging_scores: {
        Row: {
          criterion_id: string
          id: string
          judge_id: string
          registration_id: string
          round_id: string | null
          score: number
          updated_at: string
        }
        Insert: {
          criterion_id: string
          id?: string
          judge_id: string
          registration_id: string
          round_id?: string | null
          score: number
          updated_at?: string
        }
        Update: {
          criterion_id?: string
          id?: string
          judge_id?: string
          registration_id?: string
          round_id?: string | null
          score?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "judging_scores_criterion_id_fkey"
            columns: ["criterion_id"]
            isOneToOne: false
            referencedRelation: "opportunity_criteria"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "judging_scores_registration_id_fkey"
            columns: ["registration_id"]
            isOneToOne: false
            referencedRelation: "registrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "judging_scores_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "opportunity_rounds"
            referencedColumns: ["id"]
          },
        ]
      }
      mentorships: {
        Row: {
          ended_at: string | null
          focus: string
          id: string
          is_demo: boolean
          mentee_id: string
          mentor_id: string
          started_at: string
          status: string
          venture_id: string | null
        }
        Insert: {
          ended_at?: string | null
          focus?: string
          id?: string
          is_demo?: boolean
          mentee_id: string
          mentor_id: string
          started_at?: string
          status?: string
          venture_id?: string | null
        }
        Update: {
          ended_at?: string | null
          focus?: string
          id?: string
          is_demo?: boolean
          mentee_id?: string
          mentor_id?: string
          started_at?: string
          status?: string
          venture_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mentorships_venture_id_fkey"
            columns: ["venture_id"]
            isOneToOne: false
            referencedRelation: "ventures"
            referencedColumns: ["id"]
          },
        ]
      }
      message_threads: {
        Row: {
          created_at: string
          created_by: string
          id: string
          is_demo: boolean
          kind: string
          subject: string
          venture_id: string | null
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          is_demo?: boolean
          kind?: string
          subject: string
          venture_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          is_demo?: boolean
          kind?: string
          subject?: string
          venture_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "message_threads_venture_id_fkey"
            columns: ["venture_id"]
            isOneToOne: false
            referencedRelation: "ventures"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          author_id: string
          body: string
          created_at: string
          id: string
          thread_id: string
        }
        Insert: {
          author_id: string
          body: string
          created_at?: string
          id?: string
          thread_id: string
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          id?: string
          thread_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "message_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      moderation_reports: {
        Row: {
          created_at: string
          details: string
          id: string
          is_demo: boolean
          reason: string
          reported_user_id: string | null
          reporter_id: string | null
          resolution: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          severity: string
          status: string
          target_id: string
          target_label: string
          target_type: string
        }
        Insert: {
          created_at?: string
          details?: string
          id?: string
          is_demo?: boolean
          reason: string
          reported_user_id?: string | null
          reporter_id?: string | null
          resolution?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          severity?: string
          status?: string
          target_id: string
          target_label?: string
          target_type: string
        }
        Update: {
          created_at?: string
          details?: string
          id?: string
          is_demo?: boolean
          reason?: string
          reported_user_id?: string | null
          reporter_id?: string | null
          resolution?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          severity?: string
          status?: string
          target_id?: string
          target_label?: string
          target_type?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string
          created_at: string
          href: string
          id: string
          is_demo: boolean
          kind: string
          read_at: string | null
          title: string
          user_id: string
        }
        Insert: {
          body?: string
          created_at?: string
          href?: string
          id?: string
          is_demo?: boolean
          kind: string
          read_at?: string | null
          title: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          href?: string
          id?: string
          is_demo?: boolean
          kind?: string
          read_at?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      onboarding_progress: {
        Row: {
          answers: Json
          completed: boolean
          completed_at: string | null
          profile_kind: string | null
          review_note: string | null
          review_status: string
          reviewed_at: string | null
          reviewed_by: string | null
          step: number
          total_steps: number
          updated_at: string
          user_id: string
        }
        Insert: {
          answers?: Json
          completed?: boolean
          completed_at?: string | null
          profile_kind?: string | null
          review_note?: string | null
          review_status?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          step?: number
          total_steps?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          answers?: Json
          completed?: boolean
          completed_at?: string | null
          profile_kind?: string | null
          review_note?: string | null
          review_status?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          step?: number
          total_steps?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      opportunities: {
        Row: {
          banner_file_id: string | null
          contact: string | null
          created_at: string
          created_by: string | null
          deadline: string | null
          description: string
          education: string | null
          eligibility: string
          event_end: string | null
          event_start: string | null
          featured: boolean
          format: string | null
          id: string
          industries: string[]
          institution_id: string | null
          instructions: string | null
          is_demo: boolean
          kind: string
          last_checked_at: string | null
          location: string
          official_url: string | null
          organisation: string
          prizes: string | null
          publication: string
          registration_mode: string
          registration_opens: string | null
          results_published: boolean
          source: string
          source_url: string | null
          source_verification: string
          stages: string[]
          team_max: number | null
          team_min: number | null
          title: string
          updated_at: string
        }
        Insert: {
          banner_file_id?: string | null
          contact?: string | null
          created_at?: string
          created_by?: string | null
          deadline?: string | null
          description?: string
          education?: string | null
          eligibility?: string
          event_end?: string | null
          event_start?: string | null
          featured?: boolean
          format?: string | null
          id?: string
          industries?: string[]
          institution_id?: string | null
          instructions?: string | null
          is_demo?: boolean
          kind: string
          last_checked_at?: string | null
          location?: string
          official_url?: string | null
          organisation: string
          prizes?: string | null
          publication?: string
          registration_mode?: string
          registration_opens?: string | null
          results_published?: boolean
          source?: string
          source_url?: string | null
          source_verification?: string
          stages?: string[]
          team_max?: number | null
          team_min?: number | null
          title: string
          updated_at?: string
        }
        Update: {
          banner_file_id?: string | null
          contact?: string | null
          created_at?: string
          created_by?: string | null
          deadline?: string | null
          description?: string
          education?: string | null
          eligibility?: string
          event_end?: string | null
          event_start?: string | null
          featured?: boolean
          format?: string | null
          id?: string
          industries?: string[]
          institution_id?: string | null
          instructions?: string | null
          is_demo?: boolean
          kind?: string
          last_checked_at?: string | null
          location?: string
          official_url?: string | null
          organisation?: string
          prizes?: string | null
          publication?: string
          registration_mode?: string
          registration_opens?: string | null
          results_published?: boolean
          source?: string
          source_url?: string | null
          source_verification?: string
          stages?: string[]
          team_max?: number | null
          team_min?: number | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "opportunities_banner_file_id_fkey"
            columns: ["banner_file_id"]
            isOneToOne: false
            referencedRelation: "files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunities_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      opportunity_communications: {
        Row: {
          audience: string
          body: string
          id: string
          opportunity_id: string
          sent_at: string
          sent_by: string | null
          subject: string
        }
        Insert: {
          audience: string
          body: string
          id?: string
          opportunity_id: string
          sent_at?: string
          sent_by?: string | null
          subject: string
        }
        Update: {
          audience?: string
          body?: string
          id?: string
          opportunity_id?: string
          sent_at?: string
          sent_by?: string | null
          subject?: string
        }
        Relationships: [
          {
            foreignKeyName: "opportunity_communications_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
        ]
      }
      opportunity_criteria: {
        Row: {
          id: string
          label: string
          opportunity_id: string
          position: number
          weight: number
        }
        Insert: {
          id?: string
          label: string
          opportunity_id: string
          position?: number
          weight?: number
        }
        Update: {
          id?: string
          label?: string
          opportunity_id?: string
          position?: number
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "opportunity_criteria_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
        ]
      }
      opportunity_files: {
        Row: {
          file_id: string
          opportunity_id: string
          purpose: string
        }
        Insert: {
          file_id: string
          opportunity_id: string
          purpose: string
        }
        Update: {
          file_id?: string
          opportunity_id?: string
          purpose?: string
        }
        Relationships: [
          {
            foreignKeyName: "opportunity_files_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunity_files_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
        ]
      }
      opportunity_organisers: {
        Row: {
          added_by: string | null
          created_at: string
          opportunity_id: string
          role: string
          user_id: string
        }
        Insert: {
          added_by?: string | null
          created_at?: string
          opportunity_id: string
          role: string
          user_id: string
        }
        Update: {
          added_by?: string | null
          created_at?: string
          opportunity_id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "opportunity_organisers_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
        ]
      }
      opportunity_rounds: {
        Row: {
          deadline: string | null
          description: string
          id: string
          name: string
          opportunity_id: string
          position: number
        }
        Insert: {
          deadline?: string | null
          description?: string
          id?: string
          name: string
          opportunity_id: string
          position?: number
        }
        Update: {
          deadline?: string | null
          description?: string
          id?: string
          name?: string
          opportunity_id?: string
          position?: number
        }
        Relationships: [
          {
            foreignKeyName: "opportunity_rounds_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_settings: {
        Row: {
          community_posting: boolean
          config: Json
          id: boolean
          open_registration: boolean
          opportunity_registration: boolean
          require_idea_review: boolean
          research_enabled: boolean
          studies_recruiting: boolean
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          community_posting?: boolean
          config?: Json
          id?: boolean
          open_registration?: boolean
          opportunity_registration?: boolean
          require_idea_review?: boolean
          research_enabled?: boolean
          studies_recruiting?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          community_posting?: boolean
          config?: Json
          id?: boolean
          open_registration?: boolean
          opportunity_registration?: boolean
          require_idea_review?: boolean
          research_enabled?: boolean
          studies_recruiting?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      posts: {
        Row: {
          author_id: string
          body: string
          created_at: string
          featured: boolean
          figure: Json | null
          id: string
          industries: string[]
          is_demo: boolean
          kind: string
          moderated_at: string | null
          moderated_by: string | null
          moderation_reason: string | null
          moderation_status: string
          pinned: boolean
          title: string
          updated_at: string
          venture_id: string | null
        }
        Insert: {
          author_id: string
          body?: string
          created_at?: string
          featured?: boolean
          figure?: Json | null
          id?: string
          industries?: string[]
          is_demo?: boolean
          kind: string
          moderated_at?: string | null
          moderated_by?: string | null
          moderation_reason?: string | null
          moderation_status?: string
          pinned?: boolean
          title: string
          updated_at?: string
          venture_id?: string | null
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          featured?: boolean
          figure?: Json | null
          id?: string
          industries?: string[]
          is_demo?: boolean
          kind?: string
          moderated_at?: string | null
          moderated_by?: string | null
          moderation_reason?: string | null
          moderation_status?: string
          pinned?: boolean
          title?: string
          updated_at?: string
          venture_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "posts_venture_id_fkey"
            columns: ["venture_id"]
            isOneToOne: false
            referencedRelation: "ventures"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_experiences: {
        Row: {
          created_at: string
          id: string
          organisation: string
          period: string
          position: number
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          organisation?: string
          period?: string
          position?: number
          title: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          organisation?: string
          period?: string
          position?: number
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_experiences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_file_id: string | null
          bio: string
          collaboration: string[]
          created_at: string
          display_name: string
          experience_level: string
          headline: string
          id: string
          interests: string[]
          is_demo: boolean
          location: string
          organisation: string
          persona: string
          profile_kind: string | null
          show_organisation: boolean
          skills: string[]
          updated_at: string
          visibility: string
        }
        Insert: {
          avatar_file_id?: string | null
          bio?: string
          collaboration?: string[]
          created_at?: string
          display_name?: string
          experience_level?: string
          headline?: string
          id: string
          interests?: string[]
          is_demo?: boolean
          location?: string
          organisation?: string
          persona?: string
          profile_kind?: string | null
          show_organisation?: boolean
          skills?: string[]
          updated_at?: string
          visibility?: string
        }
        Update: {
          avatar_file_id?: string | null
          bio?: string
          collaboration?: string[]
          created_at?: string
          display_name?: string
          experience_level?: string
          headline?: string
          id?: string
          interests?: string[]
          is_demo?: boolean
          location?: string
          organisation?: string
          persona?: string
          profile_kind?: string | null
          show_organisation?: boolean
          skills?: string[]
          updated_at?: string
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_avatar_file_id_fkey"
            columns: ["avatar_file_id"]
            isOneToOne: false
            referencedRelation: "files"
            referencedColumns: ["id"]
          },
        ]
      }
      reactions: {
        Row: {
          created_at: string
          post_id: string
          reaction: string
          user_id: string
        }
        Insert: {
          created_at?: string
          post_id: string
          reaction?: string
          user_id: string
        }
        Update: {
          created_at?: string
          post_id?: string
          reaction?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reactions_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      registration_events: {
        Row: {
          actor_id: string | null
          created_at: string
          id: number
          registration_id: string
          text: string
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          id?: never
          registration_id: string
          text: string
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          id?: never
          registration_id?: string
          text?: string
        }
        Relationships: [
          {
            foreignKeyName: "registration_events_registration_id_fkey"
            columns: ["registration_id"]
            isOneToOne: false
            referencedRelation: "registrations"
            referencedColumns: ["id"]
          },
        ]
      }
      registration_notes: {
        Row: {
          author_id: string | null
          body: string
          created_at: string
          id: string
          registration_id: string
        }
        Insert: {
          author_id?: string | null
          body: string
          created_at?: string
          id?: string
          registration_id: string
        }
        Update: {
          author_id?: string | null
          body?: string
          created_at?: string
          id?: string
          registration_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "registration_notes_registration_id_fkey"
            columns: ["registration_id"]
            isOneToOne: false
            referencedRelation: "registrations"
            referencedColumns: ["id"]
          },
        ]
      }
      registrations: {
        Row: {
          applicant_id: string
          award_place: string | null
          certificate_issued_at: string | null
          created_at: string
          id: string
          is_demo: boolean
          mode: string
          opportunity_id: string
          statement: string
          status: string
          team_id: string | null
          team_name: string | null
          updated_at: string
        }
        Insert: {
          applicant_id: string
          award_place?: string | null
          certificate_issued_at?: string | null
          created_at?: string
          id?: string
          is_demo?: boolean
          mode: string
          opportunity_id: string
          statement?: string
          status?: string
          team_id?: string | null
          team_name?: string | null
          updated_at?: string
        }
        Update: {
          applicant_id?: string
          award_place?: string | null
          certificate_issued_at?: string | null
          created_at?: string
          id?: string
          is_demo?: boolean
          mode?: string
          opportunity_id?: string
          statement?: string
          status?: string
          team_id?: string | null
          team_name?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "registrations_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registrations_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      research_findings: {
        Row: {
          body: string
          bullets: string[]
          heading: string
          id: string
          position: number
          run_id: string
          section_key: string
        }
        Insert: {
          body?: string
          bullets?: string[]
          heading: string
          id?: string
          position?: number
          run_id: string
          section_key: string
        }
        Update: {
          body?: string
          bullets?: string[]
          heading?: string
          id?: string
          position?: number
          run_id?: string
          section_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "research_findings_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "research_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      research_notes: {
        Row: {
          author_id: string
          body: string
          created_at: string
          id: string
          project_id: string
        }
        Insert: {
          author_id: string
          body: string
          created_at?: string
          id?: string
          project_id: string
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          id?: string
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "research_notes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "research_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      research_projects: {
        Row: {
          archived: boolean
          archived_reason: string | null
          categories: string[]
          created_at: string
          depth: string
          id: string
          is_demo: boolean
          owner_id: string
          question: string
          saved: boolean
          updated_at: string
          venture_id: string | null
        }
        Insert: {
          archived?: boolean
          archived_reason?: string | null
          categories?: string[]
          created_at?: string
          depth?: string
          id?: string
          is_demo?: boolean
          owner_id: string
          question: string
          saved?: boolean
          updated_at?: string
          venture_id?: string | null
        }
        Update: {
          archived?: boolean
          archived_reason?: string | null
          categories?: string[]
          created_at?: string
          depth?: string
          id?: string
          is_demo?: boolean
          owner_id?: string
          question?: string
          saved?: boolean
          updated_at?: string
          venture_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "research_projects_venture_id_fkey"
            columns: ["venture_id"]
            isOneToOne: false
            referencedRelation: "ventures"
            referencedColumns: ["id"]
          },
        ]
      }
      research_runs: {
        Row: {
          completed_at: string | null
          failure_reason: string | null
          id: string
          project_id: string
          provenance: string
          provider: string | null
          started_at: string
          status: string
        }
        Insert: {
          completed_at?: string | null
          failure_reason?: string | null
          id?: string
          project_id: string
          provenance: string
          provider?: string | null
          started_at?: string
          status?: string
        }
        Update: {
          completed_at?: string | null
          failure_reason?: string | null
          id?: string
          project_id?: string
          provenance?: string
          provider?: string | null
          started_at?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "research_runs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "research_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      research_sources: {
        Row: {
          file_id: string | null
          id: string
          kind: string
          note: string
          position: number
          run_id: string
          title: string
          url: string | null
        }
        Insert: {
          file_id?: string | null
          id?: string
          kind?: string
          note?: string
          position?: number
          run_id: string
          title: string
          url?: string | null
        }
        Update: {
          file_id?: string | null
          id?: string
          kind?: string
          note?: string
          position?: number
          run_id?: string
          title?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "research_sources_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "research_sources_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "research_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_items: {
        Row: {
          created_at: string
          id: string
          opportunity_id: string | null
          post_id: string | null
          user_id: string
          venture_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          opportunity_id?: string | null
          post_id?: string | null
          user_id: string
          venture_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          opportunity_id?: string | null
          post_id?: string | null
          user_id?: string
          venture_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "saved_items_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_items_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_items_venture_id_fkey"
            columns: ["venture_id"]
            isOneToOne: false
            referencedRelation: "ventures"
            referencedColumns: ["id"]
          },
        ]
      }
      studies: {
        Row: {
          consent_text: string
          consent_version: string
          created_at: string
          description: string
          eligibility: string
          ends_on: string | null
          format: string
          id: string
          is_demo: boolean
          note: string
          owner_id: string
          starts_on: string | null
          status: string
          target_participants: number
          title: string
          updated_at: string
          venture_id: string | null
        }
        Insert: {
          consent_text?: string
          consent_version?: string
          created_at?: string
          description?: string
          eligibility?: string
          ends_on?: string | null
          format?: string
          id?: string
          is_demo?: boolean
          note?: string
          owner_id: string
          starts_on?: string | null
          status?: string
          target_participants?: number
          title: string
          updated_at?: string
          venture_id?: string | null
        }
        Update: {
          consent_text?: string
          consent_version?: string
          created_at?: string
          description?: string
          eligibility?: string
          ends_on?: string | null
          format?: string
          id?: string
          is_demo?: boolean
          note?: string
          owner_id?: string
          starts_on?: string | null
          status?: string
          target_participants?: number
          title?: string
          updated_at?: string
          venture_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "studies_venture_id_fkey"
            columns: ["venture_id"]
            isOneToOne: false
            referencedRelation: "ventures"
            referencedColumns: ["id"]
          },
        ]
      }
      study_participants: {
        Row: {
          applied_at: string
          consent: string
          consent_at: string | null
          id: string
          is_demo: boolean
          status: string
          study_id: string
          user_id: string
        }
        Insert: {
          applied_at?: string
          consent?: string
          consent_at?: string | null
          id?: string
          is_demo?: boolean
          status?: string
          study_id: string
          user_id: string
        }
        Update: {
          applied_at?: string
          consent?: string
          consent_at?: string | null
          id?: string
          is_demo?: boolean
          status?: string
          study_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_participants_study_id_fkey"
            columns: ["study_id"]
            isOneToOne: false
            referencedRelation: "studies"
            referencedColumns: ["id"]
          },
        ]
      }
      submission_files: {
        Row: {
          file_id: string
          submission_id: string
        }
        Insert: {
          file_id: string
          submission_id: string
        }
        Update: {
          file_id?: string
          submission_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "submission_files_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submission_files_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      submissions: {
        Row: {
          created_at: string
          id: string
          link: string | null
          registration_id: string
          round_id: string | null
          submitted_by: string | null
          title: string
        }
        Insert: {
          created_at?: string
          id?: string
          link?: string | null
          registration_id: string
          round_id?: string | null
          submitted_by?: string | null
          title: string
        }
        Update: {
          created_at?: string
          id?: string
          link?: string | null
          registration_id?: string
          round_id?: string | null
          submitted_by?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "submissions_registration_id_fkey"
            columns: ["registration_id"]
            isOneToOne: false
            referencedRelation: "registrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submissions_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "opportunity_rounds"
            referencedColumns: ["id"]
          },
        ]
      }
      talent_profiles: {
        Row: {
          application_statement: string
          areas: string[]
          availability: string
          capacity: number
          hours_per_month: number
          is_demo: boolean
          kind: string
          review_note: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          submitted_at: string
          user_id: string
          verification: string
          years_experience: number | null
        }
        Insert: {
          application_statement?: string
          areas?: string[]
          availability?: string
          capacity?: number
          hours_per_month?: number
          is_demo?: boolean
          kind: string
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submitted_at?: string
          user_id: string
          verification?: string
          years_experience?: number | null
        }
        Update: {
          application_statement?: string
          areas?: string[]
          availability?: string
          capacity?: number
          hours_per_month?: number
          is_demo?: boolean
          kind?: string
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submitted_at?: string
          user_id?: string
          verification?: string
          years_experience?: number | null
        }
        Relationships: []
      }
      team_members: {
        Row: {
          created_at: string
          display_name: string
          id: string
          role: string
          team_id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          display_name: string
          id?: string
          role?: string
          team_id: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          display_name?: string
          id?: string
          role?: string
          team_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          created_at: string
          id: string
          is_demo: boolean
          name: string
          owner_id: string
          venture_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_demo?: boolean
          name: string
          owner_id: string
          venture_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_demo?: boolean
          name?: string
          owner_id?: string
          venture_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "teams_venture_id_fkey"
            columns: ["venture_id"]
            isOneToOne: false
            referencedRelation: "ventures"
            referencedColumns: ["id"]
          },
        ]
      }
      thread_participants: {
        Row: {
          last_read_at: string | null
          thread_id: string
          user_id: string
        }
        Insert: {
          last_read_at?: string | null
          thread_id: string
          user_id: string
        }
        Update: {
          last_read_at?: string | null
          thread_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "thread_participants_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "message_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      user_activity: {
        Row: {
          created_at: string
          href: string | null
          id: string
          text: string
          user_id: string
        }
        Insert: {
          created_at?: string
          href?: string | null
          id?: string
          text: string
          user_id: string
        }
        Update: {
          created_at?: string
          href?: string | null
          id?: string
          text?: string
          user_id?: string
        }
        Relationships: []
      }
      user_consents: {
        Row: {
          consent_type: string
          document_version: string
          granted: boolean
          id: string
          recorded_at: string
          user_id: string
        }
        Insert: {
          consent_type: string
          document_version: string
          granted: boolean
          id?: string
          recorded_at?: string
          user_id: string
        }
        Update: {
          consent_type?: string
          document_version?: string
          granted?: boolean
          id?: string
          recorded_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_preferences: {
        Row: {
          allow_messages: string
          notify_collaboration: boolean
          notify_comments: boolean
          notify_follows: boolean
          notify_opportunities: boolean
          notify_research: boolean
          show_activity: boolean
          updated_at: string
          user_id: string
          weekly_digest: boolean
        }
        Insert: {
          allow_messages?: string
          notify_collaboration?: boolean
          notify_comments?: boolean
          notify_follows?: boolean
          notify_opportunities?: boolean
          notify_research?: boolean
          show_activity?: boolean
          updated_at?: string
          user_id: string
          weekly_digest?: boolean
        }
        Update: {
          allow_messages?: string
          notify_collaboration?: boolean
          notify_comments?: boolean
          notify_follows?: boolean
          notify_opportunities?: boolean
          notify_research?: boolean
          show_activity?: boolean
          updated_at?: string
          user_id?: string
          weekly_digest?: boolean
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          grant_reason: string | null
          granted_at: string
          granted_by: string | null
          id: string
          institution_id: string | null
          revoked_at: string | null
          revoked_by: string | null
          role: string
          user_id: string
        }
        Insert: {
          grant_reason?: string | null
          granted_at?: string
          granted_by?: string | null
          id?: string
          institution_id?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
          role: string
          user_id: string
        }
        Update: {
          grant_reason?: string | null
          granted_at?: string
          granted_by?: string | null
          id?: string
          institution_id?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_institution_fk"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      user_tasks: {
        Row: {
          created_at: string
          done: boolean
          id: string
          text: string
          user_id: string
        }
        Insert: {
          created_at?: string
          done?: boolean
          id?: string
          text: string
          user_id: string
        }
        Update: {
          created_at?: string
          done?: boolean
          id?: string
          text?: string
          user_id?: string
        }
        Relationships: []
      }
      validation_sections: {
        Row: {
          notes: string
          section_id: string
          status: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          notes?: string
          section_id: string
          status?: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          notes?: string
          section_id?: string
          status?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "validation_sections_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "validation_workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      validation_workspaces: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          is_demo: boolean
          updated_at: string
          venture_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_demo?: boolean
          updated_at?: string
          venture_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_demo?: boolean
          updated_at?: string
          venture_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "validation_workspaces_venture_id_fkey"
            columns: ["venture_id"]
            isOneToOne: true
            referencedRelation: "ventures"
            referencedColumns: ["id"]
          },
        ]
      }
      venture_activity: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          detail: string
          id: number
          venture_id: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          detail?: string
          id?: never
          venture_id: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          detail?: string
          id?: never
          venture_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "venture_activity_venture_id_fkey"
            columns: ["venture_id"]
            isOneToOne: false
            referencedRelation: "ventures"
            referencedColumns: ["id"]
          },
        ]
      }
      venture_disclosures: {
        Row: {
          access_level: string
          expires_at: string | null
          granted_at: string
          granted_by: string
          grantee_institution_id: string | null
          grantee_user_id: string | null
          id: string
          note: string | null
          revoked_at: string | null
          revoked_by: string | null
          scope: string
          venture_id: string
        }
        Insert: {
          access_level: string
          expires_at?: string | null
          granted_at?: string
          granted_by: string
          grantee_institution_id?: string | null
          grantee_user_id?: string | null
          id?: string
          note?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
          scope?: string
          venture_id: string
        }
        Update: {
          access_level?: string
          expires_at?: string | null
          granted_at?: string
          granted_by?: string
          grantee_institution_id?: string | null
          grantee_user_id?: string | null
          id?: string
          note?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
          scope?: string
          venture_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "venture_disclosures_grantee_institution_id_fkey"
            columns: ["grantee_institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "venture_disclosures_venture_id_fkey"
            columns: ["venture_id"]
            isOneToOne: false
            referencedRelation: "ventures"
            referencedColumns: ["id"]
          },
        ]
      }
      venture_documents: {
        Row: {
          confidentiality: string
          created_at: string
          deleted_at: string | null
          file_id: string
          id: string
          title: string
          uploaded_by: string
          venture_id: string
        }
        Insert: {
          confidentiality?: string
          created_at?: string
          deleted_at?: string | null
          file_id: string
          id?: string
          title: string
          uploaded_by: string
          venture_id: string
        }
        Update: {
          confidentiality?: string
          created_at?: string
          deleted_at?: string | null
          file_id?: string
          id?: string
          title?: string
          uploaded_by?: string
          venture_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "venture_documents_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "venture_documents_venture_id_fkey"
            columns: ["venture_id"]
            isOneToOne: false
            referencedRelation: "ventures"
            referencedColumns: ["id"]
          },
        ]
      }
      venture_members: {
        Row: {
          added_by: string | null
          created_at: string
          member_role: string
          title: string
          user_id: string
          venture_id: string
        }
        Insert: {
          added_by?: string | null
          created_at?: string
          member_role?: string
          title?: string
          user_id: string
          venture_id: string
        }
        Update: {
          added_by?: string | null
          created_at?: string
          member_role?: string
          title?: string
          user_id?: string
          venture_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "venture_members_venture_id_fkey"
            columns: ["venture_id"]
            isOneToOne: false
            referencedRelation: "ventures"
            referencedColumns: ["id"]
          },
        ]
      }
      venture_public_summaries: {
        Row: {
          collaboration_needs: string
          featured: boolean
          geography: string
          industry: string
          is_demo: boolean
          owner_id: string
          problem: string
          published_at: string
          required_skills: string[]
          solution: string
          stage: string
          summary: string
          target_users: string
          title: string
          updated_at: string
          venture_id: string
        }
        Insert: {
          collaboration_needs?: string
          featured?: boolean
          geography: string
          industry: string
          is_demo?: boolean
          owner_id: string
          problem: string
          published_at?: string
          required_skills?: string[]
          solution: string
          stage: string
          summary: string
          target_users: string
          title: string
          updated_at?: string
          venture_id: string
        }
        Update: {
          collaboration_needs?: string
          featured?: boolean
          geography?: string
          industry?: string
          is_demo?: boolean
          owner_id?: string
          problem?: string
          published_at?: string
          required_skills?: string[]
          solution?: string
          stage?: string
          summary?: string
          target_users?: string
          title?: string
          updated_at?: string
          venture_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "venture_public_summaries_venture_id_fkey"
            columns: ["venture_id"]
            isOneToOne: true
            referencedRelation: "ventures"
            referencedColumns: ["id"]
          },
        ]
      }
      venture_updates: {
        Row: {
          author_id: string
          body: string
          created_at: string
          id: string
          is_demo: boolean
          is_public: boolean
          title: string
          venture_id: string
        }
        Insert: {
          author_id: string
          body?: string
          created_at?: string
          id?: string
          is_demo?: boolean
          is_public?: boolean
          title: string
          venture_id: string
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          id?: string
          is_demo?: boolean
          is_public?: boolean
          title?: string
          venture_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "venture_updates_venture_id_fkey"
            columns: ["venture_id"]
            isOneToOne: false
            referencedRelation: "ventures"
            referencedColumns: ["id"]
          },
        ]
      }
      venture_versions: {
        Row: {
          change_note: string | null
          created_at: string
          created_by: string | null
          id: string
          snapshot: Json
          venture_id: string
          version: number
        }
        Insert: {
          change_note?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          snapshot: Json
          venture_id: string
          version: number
        }
        Update: {
          change_note?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          snapshot?: Json
          venture_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "venture_versions_venture_id_fkey"
            columns: ["venture_id"]
            isOneToOne: false
            referencedRelation: "ventures"
            referencedColumns: ["id"]
          },
        ]
      }
      ventures: {
        Row: {
          collaboration_needs: string
          created_at: string
          existing_research: string
          featured: boolean
          geography: string
          id: string
          industry: string
          institution_id: string | null
          is_demo: boolean
          owner_id: string
          problem: string
          publication: string
          required_skills: string[]
          research_status: string
          review_note: string | null
          review_status: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          solution: string
          stage: string
          status: string
          submitted_at: string | null
          summary: string
          target_users: string
          title: string
          updated_at: string
          validation_status: string
          visibility: string
        }
        Insert: {
          collaboration_needs?: string
          created_at?: string
          existing_research?: string
          featured?: boolean
          geography?: string
          id?: string
          industry?: string
          institution_id?: string | null
          is_demo?: boolean
          owner_id: string
          problem?: string
          publication?: string
          required_skills?: string[]
          research_status?: string
          review_note?: string | null
          review_status?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          solution?: string
          stage?: string
          status?: string
          submitted_at?: string | null
          summary?: string
          target_users?: string
          title?: string
          updated_at?: string
          validation_status?: string
          visibility?: string
        }
        Update: {
          collaboration_needs?: string
          created_at?: string
          existing_research?: string
          featured?: boolean
          geography?: string
          id?: string
          industry?: string
          institution_id?: string | null
          is_demo?: boolean
          owner_id?: string
          problem?: string
          publication?: string
          required_skills?: string[]
          research_status?: string
          review_note?: string | null
          review_status?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          solution?: string
          stage?: string
          status?: string
          submitted_at?: string | null
          summary?: string
          target_users?: string
          title?: string
          updated_at?: string
          validation_status?: string
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "ventures_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_research_index: {
        Args: never
        Returns: {
          archived: boolean
          created_at: string
          depth: string
          failure_reason: string
          finding_count: number
          id: string
          is_demo: boolean
          owner_id: string
          provenance: string
          question: string
          run_status: string
          source_count: number
          venture_id: string
        }[]
      }
      admin_reveal_research: {
        Args: { p_project: string; p_reason: string }
        Returns: Json
      }
      admin_reveal_validation: {
        Args: { p_reason: string; p_workspace: string }
        Returns: Json
      }
      admin_reveal_venture: {
        Args: { p_reason: string; p_venture: string }
        Returns: Json
      }
      admin_validation_index: {
        Args: never
        Returns: {
          downgraded: number
          evidence_count: number
          framework_evidence: number
          owner_id: string
          people_evidence: number
          sections_done: number
          updated_at: string
          venture_id: string
          venture_title: string
          workspace_id: string
        }[]
      }
      admin_venture_index: {
        Args: never
        Returns: {
          created_at: string
          featured: boolean
          geography: string
          id: string
          industry: string
          is_demo: boolean
          member_count: number
          owner_id: string
          publication: string
          research_status: string
          review_note: string
          review_status: string
          reviewed_at: string
          stage: string
          status: string
          summary: string
          title: string
          updated_at: string
          validation_status: string
          visibility: string
        }[]
      }
      my_session_context: { Args: never; Returns: Json }
      public_settings: { Args: never; Returns: Json }
      published_cms: {
        Args: never
        Returns: {
          fields: Json
          id: string
          kind: string
          label: string
          position: number
        }[]
      }
      purge_demo_data: { Args: never; Returns: undefined }
      start_thread: {
        Args: {
          p_body: string
          p_kind?: string
          p_recipient: string
          p_subject: string
          p_thread_id?: string
          p_venture?: string
        }
        Returns: string
      }
      touch_last_active: { Args: never; Returns: undefined }
      venture_follower_counts: {
        Args: { p_ids: string[] }
        Returns: {
          followers: number
          venture_id: string
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
