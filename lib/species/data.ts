/**
 * Species knowledge base — common recreational targets of Moroccan coasts
 * (Atlantic + Mediterranean) and nearby common species.
 *
 * DATA HONESTY POLICY:
 *  - Scientific names below are standard, well-established identifications.
 *  - Seasonal notes are GENERAL ecology (e.g. spawning closures exist for
 *    many species), not verified local schedules.
 *  - REGULATION status: Morocco's fishing regulation framework (Dahir
 *    n° 1-73-255, "Règlement sur la pêche maritime") sets minimum sizes and
 *    release obligations, but the concrete per-species minimum sizes and
 *    closed seasons are published in individual ministerial arrêtés that are
 *    updated over time. We could NOT verify the current arrêté text from
 *    this build environment (last verification attempt: 2026-10-11).
 *    → `regulation.status` is 'unverified' for all species on purpose.
 *    The UI shows the official source to check, never a guessed number.
 */

export interface SpeciesNames {
  en: string;
  fr: string;
  ar: string;
  ary: string;
}

export interface SpeciesRegulation {
  status: 'unverified' | 'verified';
  /** Always shown: where the authoritative rules live. */
  officialSource: string;
  /** Only present when a specific rule has actually been verified. */
  minimumSizeCm?: number | null;
  closedSeason?: string | null;
  lastVerified?: string;
  note: string;
}

export interface Species {
  id: string;
  names: SpeciesNames;
  scientificName: string;
  sea: ('atlantic' | 'mediterranean' | 'both')[];
  habitat: string;
  methods: string[]; // method ids this species is commonly taken with
  seasonalNote: string; // general ecology, explicitly not a local schedule
  regulation: SpeciesRegulation;
}

const DPM = {
  status: 'unverified' as const,
  officialSource:
    'Direction de la Pêche Maritime (dpm.gov.ma) — official Moroccan authority; minimum sizes and closed seasons are set by published ministerial arrêtés (Bulletin Officiel). Verify the current text before fishing.',
  note: 'Minimum sizes / seasons NOT verified in this build — check current DPM arrêtés.'
};

export const SPECIES: Species[] = [
  {
    id: 'chub_mackerel',
    names: {
      en: 'Chub mackerel',
      fr: 'Maquereau',
      ar: 'الماكريل الصغير (المحارم)',
      ary: 'المحارم'
    },
    scientificName: 'Scomber colias',
    sea: ['atlantic', 'mediterranean'],
    habitat: 'Pelagic schools, very common near the Moroccan coast, surface to mid-water.',
    methods: ['surfcasting', 'shore_spinning', 'boat'],
    seasonalNote:
      'General: large schools move along the coast through most of the year; exact local presence varies by year and region.',
    regulation: { ...DPM }
  },
  {
    id: 'european_bass',
    names: {
      en: 'European sea bass',
      fr: 'Bar / Loup de mer',
      ar: 'البلطي البحري (البار)',
      ary: 'البار'
    },
    scientificName: 'Dicentrarchus labrax',
    sea: ['atlantic', 'mediterranean'],
    habitat: 'Coastal waters, estuaries, harbors; juveniles in shallow areas, adults further out.',
    methods: ['surfcasting', 'shore_spinning', 'harbor', 'boat'],
    seasonalNote:
      'General: often more active at dusk/dawn and with rising water; no verified local calendar in this build.',
    regulation: { ...DPM }
  },
  {
    id: 'red_mullet',
    names: {
      en: 'Red mullet (horse mackerel relative — common name "bogue")',
      fr: 'Bogue (loubia)',
      ar: 'الروغي (اللوبياء)',
      ary: 'اللوبياء'
    },
    scientificName: 'Mullus barbatus',
    sea: ['atlantic', 'mediterranean'],
    habitat: 'Sandy and muddy bottoms, shallow bays and harbors; bottom-feeder.',
    methods: ['surfcasting', 'harbor', 'boat'],
    seasonalNote: 'General: steady target in sheltered sandy bays; exact seasons unverified.',
    regulation: { ...DPM }
  },
  {
    id: 'mormyrid_dorado',
    names: {
      en: 'Siber (sardine sarda / Atlantic bonito group)',
      fr: 'Chinchard (sar) / Thon rouge (sarda)',
      ar: 'الشنشيرة (السردين الكبير)',
      ary: 'الشنشيرة'
    },
    scientificName: 'Scomberomorus / Sarda spp. (verify local identification)',
    sea: ['atlantic', 'mediterranean'],
    habitat: 'Pelagic, near coastal structures and currents.',
    methods: ['surfcasting', 'shore_spinning', 'boat'],
    seasonalNote:
      'General: pelagic species — local presence is patchy and seasonal; identification between Scomberomorus and Sarda needs care.',
    regulation: { ...DPM }
  },
  {
    id: 'common_dorade',
    names: {
      en: 'Two-banded seabream',
      fr: 'Dorade grise',
      ar: 'الدوارة (المرجانا الرمادية)',
      ary: 'الدوارة'
    },
    scientificName: 'Diplodus vulgaris',
    sea: ['atlantic', 'mediterranean'],
    habitat: 'Rocks, jetties, shallow water around structures.',
    methods: ['shore_spinning', 'harbor', 'rock'],
    seasonalNote: 'General: around harbor structures most of the year; unverified locally.',
    regulation: { ...DPM }
  },
  {
    id: 'annular_seabream',
    names: {
      en: 'Annular seabream (loup de mer gris)',
      fr: 'Loup de mer gris',
      ar: 'الزرنبة (دوارة مخططة)',
      ary: 'الزرنبة'
    },
    scientificName: 'Diplodus sargus',
    sea: ['mediterranean'],
    habitat: 'Rocky coastal areas, jetties, seagrass beds.',
    methods: ['shore_spinning', 'rock', 'harbor'],
    seasonalNote: 'General: Mediterranean coastal species; unverified locally.',
    regulation: { ...DPM }
  },
  {
    id: 'conger_eel',
    names: {
      en: 'Conger eel',
      fr: 'Congre',
      ar: 'الجندوف (الكونغرة)',
      ary: 'الكونجرة'
    },
    scientificName: 'Conger conger',
    sea: ['atlantic'],
    habitat: 'Rocks, ports, shipwrecks; nocturnal bottom predator.',
    methods: ['rock', 'harbor', 'surfcasting'],
    seasonalNote: 'General: often targeted at night from rocky spots; unverified locally.',
    regulation: { ...DPM }
  },
  {
    id: 'hake',
    names: {
      en: 'Hake',
      fr: 'Lieu',
      ar: 'الحاق (اللو)',
      ary: 'الحاق'
    },
    scientificName: 'Merluccius merluccius',
    sea: ['atlantic', 'mediterranean'],
    habitat: 'Sandy/muddy bottom, deeper than most shore waters but approaches coast in some bays.',
    methods: ['boat', 'harbor'],
    seasonalNote: 'General: deep-water species; from shore only in deep bays/ports. Unverified locally.',
    regulation: { ...DPM }
  },
  {
    id: 'turbot',
    names: {
      en: 'Turbot',
      fr: 'Lieudit (turbot)',
      ar: 'المجدور (الطربوت)',
      ary: 'المجدور'
    },
    scientificName: 'Psetta maxima',
    sea: ['atlantic'],
    habitat: 'Sandy bottom, 5–50 m; valued flatfish.',
    methods: ['boat', 'harbor'],
    seasonalNote: 'General: flatfish near coast in colder months; unverified locally.',
    regulation: { ...DPM }
  },
  {
    id: 'plaice',
    names: {
      en: 'Plaice',
      fr: 'Lieu noir (limande)',
      ar: 'السلطعون (الليماند)',
      ary: 'الليماند'
    },
    scientificName: 'Pleuronectes platessa',
    sea: ['atlantic'],
    habitat: 'Sandy bottom, relatively shallow.',
    methods: ['surfcasting', 'boat'],
    seasonalNote: 'General: winter flatfish; unverified locally.',
    regulation: { ...DPM }
  },
  {
    id: 'sardine',
    names: {
      en: 'European sardine',
      fr: 'Sarde',
      ar: 'السردين',
      ary: 'السردين'
    },
    scientificName: 'Sardina pilchardus',
    sea: ['atlantic', 'mediterranean'],
    habitat: 'Pelagic schools in coastal waters.',
    methods: ['surfcasting', 'shore_spinning'],
    seasonalNote: 'General: schooling behavior, patchy presence; unverified locally.',
    regulation: { ...DPM }
  },
  {
    id: 'shrimp',
    names: {
      en: 'Penaeid shrimp',
      fr: 'Crevette',
      ar: 'الجمبري',
      ary: 'الجمبري'
    },
    scientificName: 'Penaeus / Metapenaeus spp. (verify local species)',
    sea: ['atlantic'],
    habitat: 'Sandy bottom and estuaries; night activity.',
    methods: ['harbor', 'boat', 'surfcasting'],
    seasonalNote: 'General: estuarine and coastal; species-level ID and rules unverified.',
    regulation: { ...DPM }
  }
];

export function getSpecies(id: string): Species | null {
  return SPECIES.find((s) => s.id === id) ?? null;
}

/**
 * Localized common-name lookup for the logbook UI.
 * Unknown species (user free text) are returned as-is.
 */
export function speciesDisplayName(
  locale: string,
  knownIdOrName: string,
  freeText?: string
): string {
  const sp = getSpecies(knownIdOrName);
  if (sp) {
    const n = sp.names;
    if (locale === 'fr') return n.fr;
    if (locale === 'ar') return n.ar;
    if (locale === 'ary') return n.ary;
    return n.en;
  }
  return freeText ?? knownIdOrName;
}
