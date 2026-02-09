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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      clients: {
        Row: {
          city: string | null
          contact1_name: string | null
          contact1_phone: string | null
          contact2_name: string | null
          contact2_phone: string | null
          created_at: string
          district: string | null
          document_number: string | null
          document_type: string | null
          full_name: string
          guarantor_id: string | null
          id: string
          lat: number | null
          lng: number | null
          notes: string | null
          number: string | null
          operator_id: string
          photo_document_path: string | null
          photo_selfie_path: string | null
          pix_key: string | null
          state: string | null
          status: string
          street: string | null
          updated_at: string
          zip: string | null
        }
        Insert: {
          city?: string | null
          contact1_name?: string | null
          contact1_phone?: string | null
          contact2_name?: string | null
          contact2_phone?: string | null
          created_at?: string
          district?: string | null
          document_number?: string | null
          document_type?: string | null
          full_name: string
          guarantor_id?: string | null
          id?: string
          lat?: number | null
          lng?: number | null
          notes?: string | null
          number?: string | null
          operator_id: string
          photo_document_path?: string | null
          photo_selfie_path?: string | null
          pix_key?: string | null
          state?: string | null
          status?: string
          street?: string | null
          updated_at?: string
          zip?: string | null
        }
        Update: {
          city?: string | null
          contact1_name?: string | null
          contact1_phone?: string | null
          contact2_name?: string | null
          contact2_phone?: string | null
          created_at?: string
          district?: string | null
          document_number?: string | null
          document_type?: string | null
          full_name?: string
          guarantor_id?: string | null
          id?: string
          lat?: number | null
          lng?: number | null
          notes?: string | null
          number?: string | null
          operator_id?: string
          photo_document_path?: string | null
          photo_selfie_path?: string | null
          pix_key?: string | null
          state?: string | null
          status?: string
          street?: string | null
          updated_at?: string
          zip?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_guarantor_id_fkey"
            columns: ["guarantor_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      loans: {
        Row: {
          client_id: string
          created_at: string
          cycle_days: number
          cycle_interest_amount: number
          due_at: string
          guarantor_client_id: string | null
          id: string
          monthly_rate_pct: number
          operator_id: string
          principal_initial: number
          principal_open: number
          recipient_account_number: string | null
          recipient_bank: string | null
          recipient_cpf: string | null
          recipient_full_name: string | null
          recipient_pix_key: string | null
          status: string
          transfer_at: string
          transfer_receipt_path: string | null
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          cycle_days?: number
          cycle_interest_amount: number
          due_at: string
          guarantor_client_id?: string | null
          id?: string
          monthly_rate_pct: number
          operator_id: string
          principal_initial: number
          principal_open: number
          recipient_account_number?: string | null
          recipient_bank?: string | null
          recipient_cpf?: string | null
          recipient_full_name?: string | null
          recipient_pix_key?: string | null
          status?: string
          transfer_at?: string
          transfer_receipt_path?: string | null
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          cycle_days?: number
          cycle_interest_amount?: number
          due_at?: string
          guarantor_client_id?: string | null
          id?: string
          monthly_rate_pct?: number
          operator_id?: string
          principal_initial?: number
          principal_open?: number
          recipient_account_number?: string | null
          recipient_bank?: string | null
          recipient_cpf?: string | null
          recipient_full_name?: string | null
          recipient_pix_key?: string | null
          status?: string
          transfer_at?: string
          transfer_receipt_path?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "loans_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loans_guarantor_client_id_fkey"
            columns: ["guarantor_client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          cycle_interest_paid: number
          id: string
          late_fee_paid: number
          loan_id: string
          note: string | null
          operator_id: string
          paid_at: string
          principal_paid: number
          receipt_path: string | null
          type: string
        }
        Insert: {
          amount: number
          created_at?: string
          cycle_interest_paid?: number
          id?: string
          late_fee_paid?: number
          loan_id: string
          note?: string | null
          operator_id: string
          paid_at?: string
          principal_paid?: number
          receipt_path?: string | null
          type: string
        }
        Update: {
          amount?: number
          created_at?: string
          cycle_interest_paid?: number
          id?: string
          late_fee_paid?: number
          loan_id?: string
          note?: string | null
          operator_id?: string
          paid_at?: string
          principal_paid?: number
          receipt_path?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_loan_id_fkey"
            columns: ["loan_id"]
            isOneToOne: false
            referencedRelation: "loans"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          active: boolean
          created_at: string
          full_name: string | null
          id: string
          numeric_login: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          full_name?: string | null
          id: string
          numeric_login: string
        }
        Update: {
          active?: boolean
          created_at?: string
          full_name?: string | null
          id?: string
          numeric_login?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
    Enums: {
      app_role: ["admin", "user"],
    },
  },
} as const
