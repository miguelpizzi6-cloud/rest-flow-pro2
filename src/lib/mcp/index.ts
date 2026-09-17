import { auth, defineMcp } from "@lovable.dev/mcp-js";
import getMyProfile from "./tools/get-my-profile";
import listSchedule from "./tools/list-schedule";
import listEmployees from "./tools/list-employees";
import listSwaps from "./tools/list-swaps";

const projectRef = import.meta.env['VITE_SUPABASE_PROJECT_ID'] ?? "project-ref-unset";

export default defineMcp({
  name: "smart-leave-manager",
  title: "Smart Leave Manager",
  version: "0.1.0",
  instructions:
    "Ferramentas do sistema de Gestão Inteligente de Folgas. Use get_my_profile para saber quem é o usuário, list_schedule para ver folgas e dias de trabalho, list_employees para consultar o cadastro e list_swaps para acompanhar trocas de folga. O acesso respeita as permissões do usuário autenticado.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [getMyProfile, listSchedule, listEmployees, listSwaps],
});
