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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      escalas: {
        Row: {
          created_at: string
          data: string
          funcionario_id: string
          id: string
          status: Database["public"]["Enums"]["escala_status"]
        }
        Insert: {
          created_at?: string
          data: string
          funcionario_id: string
          id?: string
          status: Database["public"]["Enums"]["escala_status"]
        }
        Update: {
          created_at?: string
          data?: string
          funcionario_id?: string
          id?: string
          status?: Database["public"]["Enums"]["escala_status"]
        }
        Relationships: [
          {
            foreignKeyName: "escalas_funcionario_id_fkey"
            columns: ["funcionario_id"]
            isOneToOne: false
            referencedRelation: "funcionarios"
            referencedColumns: ["id"]
          },
        ]
      }
      funcionarios: {
        Row: {
          ativo: boolean
          contador_domingos: number
          created_at: string
          horario_entrada: string
          horario_intervalo_inicio: string
          horario_intervalo_volta: string
          horario_saida: string
          horarios_semana: Json
          id: string
          matricula: string
          nome: string
          setor: Database["public"]["Enums"]["setor"]
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          ativo?: boolean
          contador_domingos?: number
          created_at?: string
          horario_entrada?: string
          horario_intervalo_inicio?: string
          horario_intervalo_volta?: string
          horario_saida?: string
          horarios_semana?: Json
          id?: string
          matricula: string
          nome: string
          setor?: Database["public"]["Enums"]["setor"]
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          ativo?: boolean
          contador_domingos?: number
          created_at?: string
          horario_entrada?: string
          horario_intervalo_inicio?: string
          horario_intervalo_volta?: string
          horario_saida?: string
          horarios_semana?: Json
          id?: string
          matricula?: string
          nome?: string
          setor?: Database["public"]["Enums"]["setor"]
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      historico_trocas: {
        Row: {
          data_troca: string
          descricao: string | null
          funcionario1_id: string | null
          funcionario2_id: string | null
          id: string
          troca_id: string | null
        }
        Insert: {
          data_troca?: string
          descricao?: string | null
          funcionario1_id?: string | null
          funcionario2_id?: string | null
          id?: string
          troca_id?: string | null
        }
        Update: {
          data_troca?: string
          descricao?: string | null
          funcionario1_id?: string | null
          funcionario2_id?: string | null
          id?: string
          troca_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "historico_trocas_funcionario1_id_fkey"
            columns: ["funcionario1_id"]
            isOneToOne: false
            referencedRelation: "funcionarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "historico_trocas_funcionario2_id_fkey"
            columns: ["funcionario2_id"]
            isOneToOne: false
            referencedRelation: "funcionarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "historico_trocas_troca_id_fkey"
            columns: ["troca_id"]
            isOneToOne: false
            referencedRelation: "trocas"
            referencedColumns: ["id"]
          },
        ]
      }
      trocas: {
        Row: {
          aceito_por: string | null
          atualizado_em: string
          criado_em: string
          criador_id: string
          data_desejada: string
          data_origem: string
          escala_origem_id: string | null
          expira_em: string
          id: string
          status: Database["public"]["Enums"]["troca_status"]
          turno: string | null
        }
        Insert: {
          aceito_por?: string | null
          atualizado_em?: string
          criado_em?: string
          criador_id: string
          data_desejada: string
          data_origem: string
          escala_origem_id?: string | null
          expira_em: string
          id?: string
          status?: Database["public"]["Enums"]["troca_status"]
          turno?: string | null
        }
        Update: {
          aceito_por?: string | null
          atualizado_em?: string
          criado_em?: string
          criador_id?: string
          data_desejada?: string
          data_origem?: string
          escala_origem_id?: string | null
          expira_em?: string
          id?: string
          status?: Database["public"]["Enums"]["troca_status"]
          turno?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "trocas_aceito_por_fkey"
            columns: ["aceito_por"]
            isOneToOne: false
            referencedRelation: "funcionarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trocas_criador_id_fkey"
            columns: ["criador_id"]
            isOneToOne: false
            referencedRelation: "funcionarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trocas_escala_origem_id_fkey"
            columns: ["escala_origem_id"]
            isOneToOne: false
            referencedRelation: "escalas"
            referencedColumns: ["id"]
          },
        ]
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
      app_role: "admin" | "funcionario"
      escala_status: "folga" | "trabalho"
      setor:
        | "Tesouraria"
        | "Operadores"
        | "Fiscais"
        | "Atendimento"
        | "Empacotadores"
        | "Delivery"
      troca_status: "aberta" | "aceita" | "cancelada" | "expirada"
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
      app_role: ["admin", "funcionario"],
      escala_status: ["folga", "trabalho"],
      setor: [
        "Tesouraria",
        "Operadores",
        "Fiscais",
        "Atendimento",
        "Empacotadores",
        "Delivery",
      ],
      troca_status: ["aberta", "aceita", "cancelada", "expirada"],
    },
  },
} as const
