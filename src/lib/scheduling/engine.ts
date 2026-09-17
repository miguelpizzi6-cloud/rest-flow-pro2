// Motor de regras da escala. TOTALMENTE puro, sem dependências de UI/DB.
// - Sábado nunca é folga.
// - Cada funcionário tem UMA folga por semana (dom-sex).
// - Ciclo de domingos: trabalha 3, folga no 4º, reinicia.
// - Nunca mais de 7 dias consecutivos trabalhados.

import { addDays, dow, ISODate, weekDays } from "./date-utils";

export interface Funcionario {
  id: string;
  nome: string;
  setor: string;
  contador_domingos: number; // 0..3 (quantos domingos trabalhou seguidos)
  ativo: boolean;
}


export interface EscalaCell {
  funcionario_id: string;
  data: ISODate;
  status: "folga" | "trabalho";
}

export interface WeeklyResult {
  cells: EscalaCell[];
  // Atualizações a aplicar em funcionarios após a semana
  contadorUpdates: Record<string, number>;
  warnings: string[];
}

/**
 * Gera escala para uma semana (domingo -> sábado).
 * @param funcionarios lista ativa
 * @param sunday ISODate do domingo da semana
 * @param historyByFunc mapa funcionario_id -> escalas dos últimos ~14 dias (para regra 7d)
 */
export function generateWeeklySchedule(
  funcionarios: Funcionario[],
  sunday: ISODate,
  historyByFunc: Record<string, EscalaCell[]> = {},
): WeeklyResult {
  const week = weekDays(sunday); // 7 dias
  const cells: EscalaCell[] = [];
  const contadorUpdates: Record<string, number> = {};
  const warnings: string[] = [];

  const ativos = funcionarios.filter((f) => f.ativo);

  // Estrutura para contabilizar folgas por horário/dia (balancear)
  const folgasPorDia: Record<ISODate, Record<string, number>> = {};
  for (const d of week) folgasPorDia[d] = {};


  // Ordenar: quem tem contador_domingos === 3 primeiro (folga forçada domingo)
  const ordenados = [...ativos].sort(
    (a, b) => (b.contador_domingos ?? 0) - (a.contador_domingos ?? 0),
  );

  for (const f of ordenados) {
    // Decide a folga da semana
    let folga: ISODate | null = null;
    const contador = f.contador_domingos ?? 0;

    if (contador >= 3) {
      // Folga obrigatória no domingo
      folga = week[0];
      contadorUpdates[f.id] = 0;
    } else {
      // Escolhe o melhor dia (dom-sex) minimizando dias consecutivos e balanceando por turno
      const candidatos = week.slice(0, 6); // dom..sex
      let best: { data: ISODate; score: number } | null = null;

      for (const data of candidatos) {
        // Simula: constrói uma projeção dos 14 dias em torno para checar 7d
        const proj = buildProjection(f.id, data, week, historyByFunc[f.id] || []);
        if (!isSevenDayOk(proj)) continue;

        // Score: balancear folgas por setor-dia (menos gente do mesmo setor já folgando = melhor)
        const chave = f.setor || "-";
        const jaFolgando = folgasPorDia[data][chave] ?? 0;

        // Preferir meio de semana para distribuição
        const meio = Math.abs(dow(data) - 3);
        const score = jaFolgando * 10 + meio;

        if (!best || score < best.score) best = { data, score };
      }

      if (!best) {
        // Fallback: primeira que passa
        for (const data of candidatos) {
          const proj = buildProjection(f.id, data, week, historyByFunc[f.id] || []);
          if (isSevenDayOk(proj)) {
            best = { data, score: 0 };
            break;
          }
        }
      }

      if (!best) {
        warnings.push(`Não foi possível encontrar folga viável para ${f.nome}. Alocando domingo.`);
        best = { data: week[0], score: 0 };
      }
      folga = best.data;

      // Se folgar no domingo, contador zera; caso contrário incrementa (trabalha domingo)
      if (folga === week[0]) {
        contadorUpdates[f.id] = 0;
      } else {
        contadorUpdates[f.id] = contador + 1;
      }
    }

    const chaveH = f.setor || "-";
    folgasPorDia[folga][chaveH] = (folgasPorDia[folga][chaveH] ?? 0) + 1;


    for (const d of week) {
      cells.push({
        funcionario_id: f.id,
        data: d,
        status: d === folga ? "folga" : "trabalho",
      });
    }
  }

  return { cells, contadorUpdates, warnings };
}

/**
 * Constrói uma projeção dos últimos 6 dias + semana toda, marcando o dia `folga`
 * como folga e o resto como trabalho.
 */
function buildProjection(
  funcId: string,
  folgaData: ISODate,
  week: ISODate[],
  history: EscalaCell[],
): EscalaCell[] {
  const start = addDays(week[0], -7);
  const dates: ISODate[] = [];
  for (let i = 0; i < 14; i++) dates.push(addDays(start, i));

  const histMap = new Map(history.map((h) => [h.data, h.status]));

  return dates.map((data) => {
    if (week.includes(data)) {
      return {
        funcionario_id: funcId,
        data,
        status: data === folgaData ? "folga" : "trabalho",
      };
    }
    return {
      funcionario_id: funcId,
      data,
      status: histMap.get(data) ?? "trabalho",
    };
  });
}

/**
 * Retorna true se nunca ultrapassar 7 dias consecutivos de trabalho.
 */
export function isSevenDayOk(cells: EscalaCell[]): boolean {
  const ordered = [...cells].sort((a, b) => a.data.localeCompare(b.data));
  let streak = 0;
  for (const c of ordered) {
    if (c.status === "trabalho") {
      streak += 1;
      if (streak > 7) return false;
    } else {
      streak = 0;
    }
  }
  return true;
}

/**
 * Conta dias consecutivos de trabalho terminando no dia anterior à `nextFolga`.
 */
export function diasConsecutivosAte(cells: EscalaCell[], nextFolga: ISODate): number {
  const ordered = cells
    .filter((c) => c.data < nextFolga)
    .sort((a, b) => b.data.localeCompare(a.data));
  let count = 0;
  for (const c of ordered) {
    if (c.status === "trabalho") count += 1;
    else break;
  }
  return count;
}

/**
 * Simula uma troca entre duas células de folga (de dois funcionários diferentes)
 * e valida a regra dos 7 dias para AMBOS.
 * cellsA/cellsB devem conter contexto de +/- 7 dias em torno das datas trocadas.
 */
export function simulateSwap(
  cellsFuncA: EscalaCell[],
  cellsFuncB: EscalaCell[],
  dataA: ISODate,
  dataB: ISODate,
): { ok: boolean; motivo?: string } {
  // Troca: A perde folga em dataA (vira trabalho) e ganha folga em dataB.
  // B perde folga em dataB (vira trabalho) e ganha folga em dataA.
  const newA = cellsFuncA.map((c) => {
    if (c.data === dataA) return { ...c, status: "trabalho" as const };
    if (c.data === dataB) return { ...c, status: "folga" as const };
    return c;
  });
  const newB = cellsFuncB.map((c) => {
    if (c.data === dataB) return { ...c, status: "trabalho" as const };
    if (c.data === dataA) return { ...c, status: "folga" as const };
    return c;
  });

  // Sábado nunca pode ser folga
  if (dow(dataA) === 6 || dow(dataB) === 6) {
    return { ok: false, motivo: "Sábado nunca pode ser folga." };
  }

  if (!isSevenDayOk(newA)) {
    return { ok: false, motivo: "A troca faria o solicitante trabalhar mais de 7 dias seguidos." };
  }
  if (!isSevenDayOk(newB)) {
    return { ok: false, motivo: "A troca faria o outro funcionário trabalhar mais de 7 dias seguidos." };
  }
  return { ok: true };
}
