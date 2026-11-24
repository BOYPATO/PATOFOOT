import { Club, DetailedRole, Player } from '../types/game';
import {
  computeCaptainLeadershipScore,
  computeCornerSkillScore,
  computeFreekickSkillScore,
  computePenaltySkillScore,
} from './matchExperienceEngine';

export interface DerivedPlayerAttributes {
  finishing: number;
  passing: number;
  defending: number;
  physical: number;
  setPieces: number;
  leadership: number;
}

export interface PlayerComparisonReport {
  leftAttrs: DerivedPlayerAttributes;
  rightAttrs: DerivedPlayerAttributes;
  overallDelta: number; // right - left
  potentialDelta: number; // rightPot - leftPot
  ageDelta: number; // right.age - left.age
  wageDelta: number; // right.wage - left.wage
  marketValueDelta: number; // right.marketValue - left.marketValue
  verdictHeadline: string;
  verdictDetail: string;
  verdictTone: 'upgrade' | 'future' | 'economy' | 'neutral';
}

function clampAttr(v: number): number {
  return Math.max(35, Math.min(99, Math.round(v)));
}

export function computeDerivedPlayerAttributes(player: Player): DerivedPlayerAttributes {
  const ovr = player.overall;
  const skill = (player.specialSkill || '').toLowerCase();

  let finishing = ovr * 0.78;
  let passing = ovr * 0.8;
  let defending = ovr * 0.72;
  let physical = ovr * 0.82 + Math.max(-8, Math.min(8, (27 - player.age) * 0.75));

  switch (player.detailedRole) {
    case 'ATA':
      finishing = ovr * 0.99 + 3;
      passing = ovr * 0.84;
      defending = ovr * 0.48;
      physical = ovr * 0.9 + (player.age <= 25 ? 4 : 0);
      break;
    case 'MEI':
      finishing = ovr * 0.88 + 2;
      passing = ovr * 1.0 + 3;
      defending = ovr * 0.62;
      physical = ovr * 0.84;
      break;
    case 'VOL':
      finishing = ovr * 0.72;
      passing = ovr * 0.9 + 1;
      defending = ovr * 0.95 + 2;
      physical = ovr * 0.92 + 2;
      break;
    case 'LAT':
      finishing = ovr * 0.74;
      passing = ovr * 0.88 + 2;
      defending = ovr * 0.89 + 1;
      physical = ovr * 0.95 + 3;
      break;
    case 'ZAG':
      finishing = ovr * 0.58;
      passing = ovr * 0.76;
      defending = ovr * 1.0 + 3;
      physical = ovr * 0.93 + 2;
      break;
    case 'GOL':
      finishing = 38;
      passing = ovr * 0.74;
      defending = ovr * 1.01 + 3; // Reflexo & Posicionamento
      physical = ovr * 0.88 + 2;
      break;
  }

  if (skill.includes('finaliz') || skill.includes('artilheiro') || skill.includes('clínico')) {
    finishing += 5;
  }
  if (skill.includes('maestro') || skill.includes('passe') || skill.includes('garçom')) {
    passing += 5;
  }
  if (skill.includes('xerife') || skill.includes('paredão') || skill.includes('cão de guarda')) {
    defending += 5;
  }
  if (skill.includes('veloc') || skill.includes('motor') || skill.includes('explos')) {
    physical += 5;
  }

  const setPieces = clampAttr(
    Math.max(
      computePenaltySkillScore(player),
      computeFreekickSkillScore(player),
      computeCornerSkillScore(player)
    )
  );
  const leadership = computeCaptainLeadershipScore(player);

  return {
    finishing: clampAttr(finishing),
    passing: clampAttr(passing),
    defending: clampAttr(defending),
    physical: clampAttr(physical),
    setPieces,
    leadership,
  };
}

export function pickBestReferencePlayerFromSquad(
  userClub: Club,
  targetPlayer: Player
): Player | undefined {
  const candidates = userClub.squad.filter((p) => p.id !== targetPlayer.id);
  if (candidates.length === 0) return userClub.squad[0];

  const exactStarter = candidates
    .filter((p) => p.isStarter && p.detailedRole === targetPlayer.detailedRole)
    .sort((a, b) => b.overall - a.overall)[0];
  if (exactStarter) return exactStarter;

  const sameRoleAny = candidates
    .filter((p) => p.detailedRole === targetPlayer.detailedRole)
    .sort((a, b) => b.overall - a.overall)[0];
  if (sameRoleAny) return sameRoleAny;

  const samePos = candidates
    .filter((p) => p.position === targetPlayer.position)
    .sort((a, b) => b.overall - a.overall)[0];
  if (samePos) return samePos;

  return [...candidates].sort((a, b) => b.overall - a.overall)[0];
}

export function compareTwoPlayers(
  referencePlayer: Player,
  targetPlayer: Player
): PlayerComparisonReport {
  const leftAttrs = computeDerivedPlayerAttributes(referencePlayer);
  const rightAttrs = computeDerivedPlayerAttributes(targetPlayer);

  const leftPot = referencePlayer.potential || referencePlayer.overall + 2;
  const rightPot = targetPlayer.potential || targetPlayer.overall + 2;

  const overallDelta = targetPlayer.overall - referencePlayer.overall;
  const potentialDelta = rightPot - leftPot;
  const ageDelta = targetPlayer.age - referencePlayer.age;
  const wageDelta = targetPlayer.wage - referencePlayer.wage;
  const marketValueDelta = targetPlayer.marketValue - referencePlayer.marketValue;

  const fmtMoney = (v: number) =>
    new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      maximumFractionDigits: 0,
    }).format(Math.abs(v));

  if (overallDelta >= 2) {
    return {
      leftAttrs,
      rightAttrs,
      overallDelta,
      potentialDelta,
      ageDelta,
      wageDelta,
      marketValueDelta,
      verdictHeadline: `Salto Técnico Imediato (+${overallDelta} OVR)`,
      verdictDetail: `${targetPlayer.name} entrega impacto superior desde o primeiro jogo em relação a ${referencePlayer.name}${
        wageDelta <= 0
          ? `, ainda economizando ${fmtMoney(wageDelta)}/mês na folha!`
          : ` por um acréscimo salarial de ${fmtMoney(wageDelta)}/mês.`
      }`,
      verdictTone: 'upgrade',
    };
  }

  if (overallDelta >= -1 && potentialDelta >= 3 && targetPlayer.age <= 23) {
    return {
      leftAttrs,
      rightAttrs,
      overallDelta,
      potentialDelta,
      ageDelta,
      wageDelta,
      marketValueDelta,
      verdictHeadline: `Jovem de Alto Teto (+${potentialDelta} Potencial)`,
      verdictDetail: `Aos ${targetPlayer.age} anos, ${targetPlayer.name} possui potencial de chegar a OVR ${rightPot} e alto poder de revenda futura.`,
      verdictTone: 'future',
    };
  }

  if (overallDelta >= -1 && wageDelta < -15_000) {
    return {
      leftAttrs,
      rightAttrs,
      overallDelta,
      potentialDelta,
      ageDelta,
      wageDelta,
      marketValueDelta,
      verdictHeadline: `Excelente Custo-Benefício (-${fmtMoney(wageDelta)}/mês)`,
      verdictDetail: `${targetPlayer.name} mantém nível técnico equivalente com alívio relevante na folha mensal do clube.`,
      verdictTone: 'economy',
    };
  }

  const roleHint: Record<DetailedRole, string> = {
    GOL: 'meta',
    ZAG: 'miolo de zaga',
    LAT: 'corredor lateral',
    VOL: 'proteção à defesa',
    MEI: 'criação ofensiva',
    ATA: 'comando de ataque',
  };

  return {
    leftAttrs,
    rightAttrs,
    overallDelta,
    potentialDelta,
    ageDelta,
    wageDelta,
    marketValueDelta,
    verdictHeadline:
      overallDelta < 0
        ? `Opção de Composição (${overallDelta} OVR vs titular)`
        : 'Equilíbrio Técnico Parecido',
    verdictDetail: `${referencePlayer.name} (OVR ${referencePlayer.overall}) segue como referência atual para ${
      roleHint[referencePlayer.detailedRole] || 'o setor'
    }, enquanto ${targetPlayer.name} (OVR ${targetPlayer.overall}) serve para rotação ou disputa por vaga.`,
    verdictTone: 'neutral',
  };
}
