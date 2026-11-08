/**
 * Which XBRL concepts feed which statement line, in priority order.
 *
 * Companies switch tags over time (Apple's `Revenues` ends in 2018, Shopify changes revenue tags in 2023),
 * so the period engine applies this priority list PER PERIOD, not once per company.
 */
export interface ConceptRef {
  taxonomy: "us-gaap" | "ifrs-full";
  tag: string;
  /** Marks a concept that is a true total (equity including non-controlling interests). */
  total?: boolean;
}

export type UnitType = "money" | "perShare" | "shares";

export interface MetricDef {
  key: string;
  label: string;
  statement: "income" | "balance" | "cashflow";
  kind: "flow" | "instant";
  unitType: UnitType;
  concepts: ConceptRef[];
  /** Not meaningful for banks and insurers; omitted for them instead of showing blanks. */
  hideForFinancials?: boolean;
}

const us = (tag: string, total?: boolean): ConceptRef => ({ taxonomy: "us-gaap", tag, total });
const ifrs = (tag: string, total?: boolean): ConceptRef => ({ taxonomy: "ifrs-full", tag, total });

export const METRICS: MetricDef[] = [
  {
    key: "revenue",
    label: "Revenue",
    statement: "income",
    kind: "flow",
    unitType: "money",
    concepts: [
      us("RevenueFromContractWithCustomerExcludingAssessedTax"),
      us("RevenueFromContractWithCustomerIncludingAssessedTax"),
      us("Revenues"),
      us("SalesRevenueNet"),
      ifrs("Revenue"),
    ],
  },
  {
    key: "costOfRevenue",
    label: "Cost of revenue",
    statement: "income",
    kind: "flow",
    unitType: "money",
    hideForFinancials: true,
    concepts: [us("CostOfRevenue"), us("CostOfGoodsAndServicesSold"), ifrs("CostOfSales")],
  },
  {
    key: "grossProfit",
    label: "Gross profit",
    statement: "income",
    kind: "flow",
    unitType: "money",
    hideForFinancials: true,
    concepts: [us("GrossProfit"), ifrs("GrossProfit")],
  },
  {
    key: "operatingIncome",
    label: "Operating income",
    statement: "income",
    kind: "flow",
    unitType: "money",
    hideForFinancials: true,
    concepts: [us("OperatingIncomeLoss"), ifrs("ProfitLossFromOperatingActivities")],
  },
  {
    key: "netIncome",
    label: "Net income",
    statement: "income",
    kind: "flow",
    unitType: "money",
    concepts: [us("NetIncomeLoss"), ifrs("ProfitLossAttributableToOwnersOfParent"), us("ProfitLoss"), ifrs("ProfitLoss")],
  },
  {
    key: "epsDiluted",
    label: "Diluted EPS",
    statement: "income",
    kind: "flow",
    unitType: "perShare",
    concepts: [us("EarningsPerShareDiluted"), ifrs("DilutedEarningsLossPerShare")],
  },
  {
    key: "cash",
    label: "Cash and cash equivalents",
    statement: "balance",
    kind: "instant",
    unitType: "money",
    concepts: [us("CashAndCashEquivalentsAtCarryingValue"), ifrs("CashAndCashEquivalents")],
  },
  {
    key: "totalAssets",
    label: "Total assets",
    statement: "balance",
    kind: "instant",
    unitType: "money",
    concepts: [us("Assets"), ifrs("Assets")],
  },
  {
    key: "totalLiabilities",
    label: "Total liabilities",
    statement: "balance",
    kind: "instant",
    unitType: "money",
    concepts: [us("Liabilities"), ifrs("Liabilities")],
  },
  {
    key: "totalEquity",
    label: "Total equity",
    statement: "balance",
    kind: "instant",
    unitType: "money",
    concepts: [
      us("StockholdersEquityIncludingPortionAttributableToNoncontrollingInterest", true),
      ifrs("Equity", true),
      us("StockholdersEquity"),
      ifrs("EquityAttributableToOwnersOfParent"),
    ],
  },
  {
    key: "operatingCashFlow",
    label: "Operating cash flow",
    statement: "cashflow",
    kind: "flow",
    unitType: "money",
    concepts: [us("NetCashProvidedByUsedInOperatingActivities"), ifrs("CashFlowsFromUsedInOperatingActivities")],
  },
  {
    key: "capex",
    label: "Capital expenditures",
    statement: "cashflow",
    kind: "flow",
    unitType: "money",
    hideForFinancials: true,
    concepts: [
      us("PaymentsToAcquirePropertyPlantAndEquipment"),
      us("PaymentsToAcquireProductiveAssets"),
      ifrs("PurchaseOfPropertyPlantAndEquipmentClassifiedAsInvestingActivities"),
    ],
  },
];

/** SIC 6000–6499: banks, brokers, insurers. Their statements lack gross profit, capex and operating income. */
export function isFinancialSic(sic: string | null | undefined): boolean {
  const n = Number(sic);
  return Number.isInteger(n) && n >= 6000 && n < 6500;
}
