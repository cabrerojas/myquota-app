/**
 * cardTheme.ts
 *
 * Derives a visual theme from a card's `cardType` string (e.g. "Visa Infinite",
 * "Mastercard Black"). No external brand assets required — every theme is built
 * from design tokens defined here.
 *
 * Usage:
 *   const theme = getCardTheme("Visa Infinite");
 *   // → { bg, accent, textColor, networkLabel, levelBadgeText, ... }
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export type CardNetwork = "VISA" | "MASTERCARD" | "AMEX" | "DINERS" | "OTHER";

export type CardLevel =
  | "worldelite"
  | "infinite"
  | "signature"
  | "black"
  | "platinum"
  | "gold"
  | "classic"
  | "standard";

export interface CardTheme {
  /** Primary background color of the card. */
  bg: string;
  /** Accent color used for the decorative circle overlay. */
  accent: string;
  /** Opacity of the decorative overlay (0–1). */
  overlayOpacity: number;
  /** Primary text color (cardholder name, last4). */
  textColor: string;
  /** Secondary/muted text color. */
  subtextColor: string;
  /** Display label for the network (e.g. "VISA", "MASTERCARD"). */
  networkLabel: string;
  /** Color used to render the network label text. */
  networkLabelColor: string;
  /** Background color of the level badge pill. */
  levelBadgeBg: string;
  /** Text color of the level badge. */
  levelBadgeColor: string;
  /** Text displayed inside the level badge (e.g. "INFINITE", "GOLD"). */
  levelBadgeText: string;
  /** Color of the EMV chip decoration. */
  chipColor: string;
}

export interface ParsedCardType {
  network: CardNetwork;
  level: CardLevel;
  /** e.g. "VISA", "MASTERCARD" */
  displayNetwork: string;
  /** e.g. "Infinite", "Platinum" */
  displayLevel: string;
}

// ─── Keyword maps ─────────────────────────────────────────────────────────────

const NETWORK_DETECTION: { network: CardNetwork; keywords: string[] }[] = [
  { network: "VISA", keywords: ["visa"] },
  { network: "MASTERCARD", keywords: ["mastercard", "master card"] },
  { network: "AMEX", keywords: ["amex", "american express"] },
  { network: "DINERS", keywords: ["diners", "diner"] },
];

/** Ordered from most to least premium — first match wins. */
const LEVEL_DETECTION: { level: CardLevel; keywords: string[] }[] = [
  { level: "worldelite", keywords: ["world elite", "worldelite"] },
  { level: "infinite", keywords: ["infinite", "infinita"] },
  { level: "signature", keywords: ["signature"] },
  { level: "black", keywords: ["black", "negro"] },
  { level: "platinum", keywords: ["platinum", "platino"] },
  { level: "gold", keywords: ["gold", "oro", "dorado"] },
  { level: "classic", keywords: ["classic", "clásica", "clasica"] },
];

const DISPLAY_NETWORK: Record<CardNetwork, string> = {
  VISA: "VISA",
  MASTERCARD: "MASTERCARD",
  AMEX: "AMEX",
  DINERS: "DINERS",
  OTHER: "CARD",
};

// ─── Theme catalog ─────────────────────────────────────────────────────────────

type PartialLevelMap = Partial<Record<CardLevel, CardTheme>> & {
  default: CardTheme;
};

const CATALOG: Record<CardNetwork, PartialLevelMap> = {
  // ── VISA ──────────────────────────────────────────────────────────────────
  VISA: {
    infinite: {
      bg: "#0B1D51",
      accent: "#1E3A8A",
      overlayOpacity: 0.45,
      textColor: "#FFFFFF",
      subtextColor: "rgba(255,255,255,0.60)",
      networkLabel: "VISA",
      networkLabelColor: "#C9A84C",
      levelBadgeBg: "rgba(201,168,76,0.22)",
      levelBadgeColor: "#C9A84C",
      levelBadgeText: "INFINITE",
      chipColor: "#C9A84C",
    },
    signature: {
      bg: "#0C1A40",
      accent: "#1A2E6B",
      overlayOpacity: 0.45,
      textColor: "#FFFFFF",
      subtextColor: "rgba(255,255,255,0.60)",
      networkLabel: "VISA",
      networkLabelColor: "#60C8E8",
      levelBadgeBg: "rgba(96,200,232,0.18)",
      levelBadgeColor: "#60C8E8",
      levelBadgeText: "SIGNATURE",
      chipColor: "#8BBFD4",
    },
    platinum: {
      bg: "#1E293B",
      accent: "#334155",
      overlayOpacity: 0.5,
      textColor: "#FFFFFF",
      subtextColor: "rgba(255,255,255,0.58)",
      networkLabel: "VISA",
      networkLabelColor: "#CBD5E1",
      levelBadgeBg: "rgba(203,213,225,0.18)",
      levelBadgeColor: "#CBD5E1",
      levelBadgeText: "PLATINUM",
      chipColor: "#94A3B8",
    },
    gold: {
      bg: "#78350F",
      accent: "#92400E",
      overlayOpacity: 0.45,
      textColor: "#FEF3C7",
      subtextColor: "rgba(254,243,199,0.68)",
      networkLabel: "VISA",
      networkLabelColor: "#FCD34D",
      levelBadgeBg: "rgba(252,211,77,0.22)",
      levelBadgeColor: "#FCD34D",
      levelBadgeText: "GOLD",
      chipColor: "#F9A825",
    },
    classic: {
      bg: "#1E40AF",
      accent: "#3B82F6",
      overlayOpacity: 0.35,
      textColor: "#FFFFFF",
      subtextColor: "rgba(255,255,255,0.65)",
      networkLabel: "VISA",
      networkLabelColor: "#FFFFFF",
      levelBadgeBg: "rgba(255,255,255,0.18)",
      levelBadgeColor: "#FFFFFF",
      levelBadgeText: "CLASSIC",
      chipColor: "#BFDBFE",
    },
    default: {
      bg: "#1D4ED8",
      accent: "#2563EB",
      overlayOpacity: 0.38,
      textColor: "#FFFFFF",
      subtextColor: "rgba(255,255,255,0.65)",
      networkLabel: "VISA",
      networkLabelColor: "#FFFFFF",
      levelBadgeBg: "rgba(255,255,255,0.18)",
      levelBadgeColor: "#FFFFFF",
      levelBadgeText: "VISA",
      chipColor: "#93C5FD",
    },
  },

  // ── MASTERCARD ────────────────────────────────────────────────────────────
  MASTERCARD: {
    worldelite: {
      bg: "#101010",
      accent: "#1C1C1C",
      overlayOpacity: 0.6,
      textColor: "#FFFFFF",
      subtextColor: "rgba(255,255,255,0.52)",
      networkLabel: "MASTERCARD",
      networkLabelColor: "#FF4D4D",
      levelBadgeBg: "rgba(235,0,27,0.20)",
      levelBadgeColor: "#FF6060",
      levelBadgeText: "WORLD ELITE",
      chipColor: "#D4D4D4",
    },
    black: {
      bg: "#0F172A",
      accent: "#1E293B",
      overlayOpacity: 0.55,
      textColor: "#FFFFFF",
      subtextColor: "rgba(255,255,255,0.55)",
      networkLabel: "MASTERCARD",
      networkLabelColor: "#F97316",
      levelBadgeBg: "rgba(249,115,22,0.20)",
      levelBadgeColor: "#F97316",
      levelBadgeText: "BLACK",
      chipColor: "#CBD5E1",
    },
    platinum: {
      bg: "#1C1C1C",
      accent: "#2A2A2A",
      overlayOpacity: 0.5,
      textColor: "#FFFFFF",
      subtextColor: "rgba(255,255,255,0.58)",
      networkLabel: "MASTERCARD",
      networkLabelColor: "#D1D5DB",
      levelBadgeBg: "rgba(209,213,219,0.16)",
      levelBadgeColor: "#D1D5DB",
      levelBadgeText: "PLATINUM",
      chipColor: "#9CA3AF",
    },
    gold: {
      bg: "#451A03",
      accent: "#78350F",
      overlayOpacity: 0.45,
      textColor: "#FEF3C7",
      subtextColor: "rgba(254,243,199,0.68)",
      networkLabel: "MASTERCARD",
      networkLabelColor: "#FBC02D",
      levelBadgeBg: "rgba(251,192,45,0.22)",
      levelBadgeColor: "#FBC02D",
      levelBadgeText: "GOLD",
      chipColor: "#D97706",
    },
    classic: {
      bg: "#7F1D1D",
      accent: "#991B1B",
      overlayOpacity: 0.4,
      textColor: "#FFFFFF",
      subtextColor: "rgba(255,255,255,0.65)",
      networkLabel: "MASTERCARD",
      networkLabelColor: "#FCA5A5",
      levelBadgeBg: "rgba(252,165,165,0.18)",
      levelBadgeColor: "#FCA5A5",
      levelBadgeText: "CLASSIC",
      chipColor: "#FCA5A5",
    },
    default: {
      bg: "#7F1D1D",
      accent: "#991B1B",
      overlayOpacity: 0.4,
      textColor: "#FFFFFF",
      subtextColor: "rgba(255,255,255,0.65)",
      networkLabel: "MASTERCARD",
      networkLabelColor: "#FCA5A5",
      levelBadgeBg: "rgba(252,165,165,0.18)",
      levelBadgeColor: "#FCA5A5",
      levelBadgeText: "CARD",
      chipColor: "#FCA5A5",
    },
  },

  // ── AMEX ──────────────────────────────────────────────────────────────────
  AMEX: {
    platinum: {
      bg: "#1A1A1A",
      accent: "#2A2A2A",
      overlayOpacity: 0.55,
      textColor: "#E5E5E5",
      subtextColor: "rgba(229,229,229,0.60)",
      networkLabel: "AMEX",
      networkLabelColor: "#A3A3A3",
      levelBadgeBg: "rgba(163,163,163,0.18)",
      levelBadgeColor: "#A3A3A3",
      levelBadgeText: "PLATINUM",
      chipColor: "#C0C0C0",
    },
    gold: {
      bg: "#92400E",
      accent: "#B45309",
      overlayOpacity: 0.4,
      textColor: "#FEF3C7",
      subtextColor: "rgba(254,243,199,0.68)",
      networkLabel: "AMEX",
      networkLabelColor: "#FCD34D",
      levelBadgeBg: "rgba(252,211,77,0.20)",
      levelBadgeColor: "#FCD34D",
      levelBadgeText: "GOLD",
      chipColor: "#F9A825",
    },
    default: {
      bg: "#065F46",
      accent: "#047857",
      overlayOpacity: 0.45,
      textColor: "#FFFFFF",
      subtextColor: "rgba(255,255,255,0.65)",
      networkLabel: "AMEX",
      networkLabelColor: "#6EE7B7",
      levelBadgeBg: "rgba(110,231,183,0.20)",
      levelBadgeColor: "#6EE7B7",
      levelBadgeText: "AMEX",
      chipColor: "#6EE7B7",
    },
  },

  // ── DINERS ────────────────────────────────────────────────────────────────
  DINERS: {
    default: {
      bg: "#312E81",
      accent: "#3730A3",
      overlayOpacity: 0.4,
      textColor: "#FFFFFF",
      subtextColor: "rgba(255,255,255,0.65)",
      networkLabel: "DINERS",
      networkLabelColor: "#A5B4FC",
      levelBadgeBg: "rgba(165,180,252,0.20)",
      levelBadgeColor: "#A5B4FC",
      levelBadgeText: "DINERS",
      chipColor: "#A5B4FC",
    },
  },

  // ── OTHER / fallback ──────────────────────────────────────────────────────
  OTHER: {
    default: {
      bg: "#1E3A5F",
      accent: "#2E5090",
      overlayOpacity: 0.4,
      textColor: "#FFFFFF",
      subtextColor: "rgba(255,255,255,0.65)",
      networkLabel: "CARD",
      networkLabelColor: "#93C5FD",
      levelBadgeBg: "rgba(147,197,253,0.18)",
      levelBadgeColor: "#93C5FD",
      levelBadgeText: "CARD",
      chipColor: "#93C5FD",
    },
  },
};

// ─── Public API ───────────────────────────────────────────────────────────────

/** Parses `cardType` string into structured metadata. */
export function parseCardType(cardType: string): ParsedCardType {
  const lower = cardType.toLowerCase();

  // Detect network
  let network: CardNetwork = "OTHER";
  for (const { network: net, keywords } of NETWORK_DETECTION) {
    if (keywords.some((kw) => lower.includes(kw))) {
      network = net;
      break;
    }
  }

  // Detect level (most premium first)
  let level: CardLevel = "standard";
  let displayLevel = "";
  for (const { level: lv, keywords } of LEVEL_DETECTION) {
    if (keywords.some((kw) => lower.includes(kw))) {
      level = lv;
      // Pick the original-case word from cardType that matches
      const matched = cardType
        .split(/\s+/)
        .find((w) => keywords.some((kw) => w.toLowerCase() === kw));
      displayLevel = matched
        ? matched.charAt(0).toUpperCase() + matched.slice(1)
        : lv.charAt(0).toUpperCase() + lv.slice(1);
      break;
    }
  }
  if (!displayLevel) {
    displayLevel = cardType; // use full cardType as fallback label
  }

  return {
    network,
    level,
    displayNetwork: DISPLAY_NETWORK[network],
    displayLevel,
  };
}

/** Returns the full visual theme for a given `cardType` string. */
export function getCardTheme(
  cardType: string,
): CardTheme & Pick<ParsedCardType, "displayNetwork" | "displayLevel"> {
  const { network, level, displayNetwork, displayLevel } =
    parseCardType(cardType);

  const networkCatalog = CATALOG[network];
  const theme: CardTheme =
    (networkCatalog[level] as CardTheme | undefined) ?? networkCatalog.default;

  return { ...theme, displayNetwork, displayLevel };
}
