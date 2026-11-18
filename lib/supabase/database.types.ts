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
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      clients: {
        Row: {
          created_at: string
          email: string
          id: string
          names: string
          photographer_id: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          names: string
          photographer_id: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          names?: string
          photographer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "clients_photographer_id_fkey"
            columns: ["photographer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      contracts: {
        Row: {
          id: string
          package_id: string
          package_snapshot: Json
          photographer_id: string
          project_id: string
          signed_at: string
          signer_name: string
        }
        Insert: {
          id?: string
          package_id: string
          package_snapshot: Json
          photographer_id: string
          project_id: string
          signed_at?: string
          signer_name: string
        }
        Update: {
          id?: string
          package_id?: string
          package_snapshot?: Json
          photographer_id?: string
          project_id?: string
          signed_at?: string
          signer_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "contracts_package_id_photographer_id_fkey"
            columns: ["package_id", "photographer_id"]
            isOneToOne: false
            referencedRelation: "packages"
            referencedColumns: ["id", "photographer_id"]
          },
          {
            foreignKeyName: "contracts_photographer_id_fkey"
            columns: ["photographer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_project_id_photographer_id_fkey"
            columns: ["project_id", "photographer_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id", "photographer_id"]
          },
        ]
      }
      packages: {
        Row: {
          created_at: string
          description: string | null
          duration_hours: number
          id: string
          is_active: boolean
          name: string
          photographer_id: string
          price: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          duration_hours: number
          id?: string
          is_active?: boolean
          name: string
          photographer_id: string
          price: number
        }
        Update: {
          created_at?: string
          description?: string | null
          duration_hours?: number
          id?: string
          is_active?: boolean
          name?: string
          photographer_id?: string
          price?: number
        }
        Relationships: [
          {
            foreignKeyName: "packages_photographer_id_fkey"
            columns: ["photographer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          display_name: string
          id: string
        }
        Insert: {
          display_name?: string
          id: string
        }
        Update: {
          display_name?: string
          id?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          access_token_hash: string | null
          client_id: string
          created_at: string
          event_date: string | null
          gallery_url: string | null
          id: string
          location: string | null
          photographer_id: string
          status: Database["public"]["Enums"]["project_status"]
        }
        Insert: {
          access_token_hash?: string | null
          client_id: string
          created_at?: string
          event_date?: string | null
          gallery_url?: string | null
          id?: string
          location?: string | null
          photographer_id: string
          status?: Database["public"]["Enums"]["project_status"]
        }
        Update: {
          access_token_hash?: string | null
          client_id?: string
          created_at?: string
          event_date?: string | null
          gallery_url?: string | null
          id?: string
          location?: string | null
          photographer_id?: string
          status?: Database["public"]["Enums"]["project_status"]
        }
        Relationships: [
          {
            foreignKeyName: "projects_client_id_photographer_id_fkey"
            columns: ["client_id", "photographer_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id", "photographer_id"]
          },
          {
            foreignKeyName: "projects_photographer_id_fkey"
            columns: ["photographer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_project: {
        Args: {
          p_email: string
          p_event_date?: string
          p_location?: string
          p_names: string
        }
        Returns: string
      }
      update_project: {
        Args: {
          p_email: string
          p_event_date?: string
          p_location?: string
          p_names: string
          p_project_id: string
        }
        Returns: undefined
      }
    }
    Enums: {
      project_status:
        | "inquiry"
        | "consultation"
        | "retainer_paid"
        | "awaiting_event"
        | "gallery_delivered"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      project_status: [
        "inquiry",
        "consultation",
        "retainer_paid",
        "awaiting_event",
        "gallery_delivered",
      ],
    },
  },
} as const
