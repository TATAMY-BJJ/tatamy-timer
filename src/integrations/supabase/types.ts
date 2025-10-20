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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      akce: {
        Row: {
          created_at: string | null
          datum: string
          id: string
          nazev: string | null
          pocet_zinenek: number
        }
        Insert: {
          created_at?: string | null
          datum: string
          id?: string
          nazev?: string | null
          pocet_zinenek: number
        }
        Update: {
          created_at?: string | null
          datum?: string
          id?: string
          nazev?: string | null
          pocet_zinenek?: number
        }
        Relationships: []
      }
      rozhodci: {
        Row: {
          akce_id: string
          cislo_id: number
          id: string
          jmeno: string | null
          prijmeni: string | null
        }
        Insert: {
          akce_id: string
          cislo_id: number
          id?: string
          jmeno?: string | null
          prijmeni?: string | null
        }
        Update: {
          akce_id?: string
          cislo_id?: number
          id?: string
          jmeno?: string | null
          prijmeni?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rozhodci_akce_id_fkey"
            columns: ["akce_id"]
            isOneToOne: false
            referencedRelation: "akce"
            referencedColumns: ["id"]
          },
        ]
      }
      useky: {
        Row: {
          akce_id: string
          end_ts: string | null
          id: string
          rozhodci_id: string
          start_ts: string
          zinenka_cislo: number
        }
        Insert: {
          akce_id: string
          end_ts?: string | null
          id?: string
          rozhodci_id: string
          start_ts?: string
          zinenka_cislo: number
        }
        Update: {
          akce_id?: string
          end_ts?: string | null
          id?: string
          rozhodci_id?: string
          start_ts?: string
          zinenka_cislo?: number
        }
        Relationships: [
          {
            foreignKeyName: "useky_akce_id_fkey"
            columns: ["akce_id"]
            isOneToOne: false
            referencedRelation: "akce"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "useky_rozhodci_id_fkey"
            columns: ["rozhodci_id"]
            isOneToOne: false
            referencedRelation: "rozhodci"
            referencedColumns: ["id"]
          },
        ]
      }
      zinenky: {
        Row: {
          akce_id: string
          casomeric: string | null
          cislo: number
          created_at: string
          id: string
          nazev: string | null
        }
        Insert: {
          akce_id: string
          casomeric?: string | null
          cislo: number
          created_at?: string
          id?: string
          nazev?: string | null
        }
        Update: {
          akce_id?: string
          casomeric?: string | null
          cislo?: number
          created_at?: string
          id?: string
          nazev?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "zinenky_akce_id_fkey"
            columns: ["akce_id"]
            isOneToOne: false
            referencedRelation: "akce"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      soucty: {
        Row: {
          akce_id: string | null
          celkem_ms: number | null
          cislo_id: number | null
          jmeno: string | null
          prijmeni: string | null
          rozhodci_id: string | null
          zinenka_cislo: number | null
        }
        Relationships: [
          {
            foreignKeyName: "useky_akce_id_fkey"
            columns: ["akce_id"]
            isOneToOne: false
            referencedRelation: "akce"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "useky_rozhodci_id_fkey"
            columns: ["rozhodci_id"]
            isOneToOne: false
            referencedRelation: "rozhodci"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      [_ in never]: never
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
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
