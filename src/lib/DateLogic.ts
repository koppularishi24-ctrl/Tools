import { 
  differenceInCalendarDays, 
  differenceInWeeks, 
  differenceInMonths, 
  differenceInYears, 
  addDays, 
  addMonths,
  addYears,
  format,
  getWeek,
  isLeapYear,
  isValid,
  startOfDay
} from 'date-fns';

export interface DateDiffResult {
  totalDays: number;
  inclusiveDays: number;
  exclusiveDays: number;
  weeks: number;
  remainingDaysAfterWeeks: number;
  months: number;
  remainingDaysAfterMonths: number;
  years: number;
  remainingMonthsAfterYears: number;
  remainingDaysAfterYearsMonths: number;
  summary: string;
}

export function calculateDateDiff(from: Date, to: Date): DateDiffResult {
  const start = startOfDay(from);
  const end = startOfDay(to);
  
  // Sort dates to handle negative diffs (always use absolute)
  const [d1, d2] = start <= end ? [start, end] : [end, start];

  // Total absolute days using differenceInCalendarDays to prevent DST/timezone shifts
  const totalDays = Math.abs(differenceInCalendarDays(d2, d1));
  const inclusiveDays = totalDays + 1;
  const exclusiveDays = Math.max(0, totalDays - 1);

  // Weeks + Days
  const totalWeeks = Math.floor(totalDays / 7);
  const remainingDaysWeeks = totalDays % 7;

  // Months + Days
  const totalMonths = Math.abs(differenceInMonths(d2, d1));
  const dateAfterMonths = addMonths(d1, totalMonths);
  const remainingDaysMonths = Math.abs(differenceInCalendarDays(d2, dateAfterMonths));

  // Years + Months + Days
  const totalYears = Math.abs(differenceInYears(d2, d1));
  const dateAfterYears = addYears(d1, totalYears);
  const remainingMonths = Math.abs(differenceInMonths(d2, dateAfterYears));
  const dateAfterYearsMonths = addMonths(dateAfterYears, remainingMonths);
  const remainingDaysBreakdown = Math.abs(differenceInCalendarDays(d2, dateAfterYearsMonths));
  
  // Real human readable summary (preserving user input order of start and end)
  const summary = `There are ${totalDays} days between ${format(start, 'dd/MM/yyyy')} and ${format(end, 'dd/MM/yyyy')}.`;

  return {
    totalDays,
    inclusiveDays,
    exclusiveDays,
    weeks: totalWeeks,
    remainingDaysAfterWeeks: remainingDaysWeeks,
    months: totalMonths,
    remainingDaysAfterMonths: remainingDaysMonths,
    years: totalYears,
    remainingMonthsAfterYears: remainingMonths,
    remainingDaysAfterYearsMonths: remainingDaysBreakdown,
    summary
  };
}

export function getDayInfo(date: Date) {
  const target = startOfDay(date);
  if (!isValid(target)) return null;
  
  return {
    dayName: format(target, 'EEEE'),
    fullDate: format(target, 'dd/MM/yyyy'),
    weekNumber: getWeek(target),
    isWeekend: [0, 6].includes(target.getDay()),
    isLeapYear: isLeapYear(target),
  };
}

export interface ALBlockResult {
  index: number;
  journeyPeriod: number;
  leaves: number[];
  leaveTotal: number;
  alEntitled: number;
  totalLeaveCounted: number;
  journeyMsg: string;
  verdict: string;
  emoji: string;
  diff: number;
}

export interface ALSheetResult {
  name: string;
  blocks: ALBlockResult[];
  grandEncash: number;
  grandExcess: number;
}

function parseALNumber(v: any): number {
  if (v === undefined || v === null) return NaN;
  if (typeof v === "number") return v;
  const s = String(v).trim();
  if (!s) return NaN;
  const n = Number(s);
  return isNaN(n) ? NaN : n;
}

export function calculateALSheet(sheetName: string, sheetData: any[][]): ALSheetResult {
  if (!sheetData || sheetData.length === 0) {
    throw new Error("Empty sheet.");
  }

  const header = sheetData[0].map(c => (c == null ? "" : String(c).trim().toLowerCase()));
  let jIndex = -1;
  let lIndex = -1;

  header.forEach((h, idx) => {
    if (h.includes("journey") && jIndex === -1) jIndex = idx;
    if (h.includes("leave") && lIndex === -1) lIndex = idx;
  });

  if (jIndex === -1 || lIndex === -1) {
    throw new Error("Could not find 'Journey' and/or 'Leave' column in header.");
  }

  const blocks: any[][] = [];
  let currentBlock: any[] = [];

  for (let i = 1; i < sheetData.length; i++) {
    const row = sheetData[i] || [];
    const jv = parseALNumber(row[jIndex]);
    const lv = parseALNumber(row[lIndex]);

    const isBlank = isNaN(jv) && isNaN(lv);
    if (isBlank) {
      if (currentBlock.length > 0) {
        blocks.push(currentBlock);
        currentBlock = [];
      }
    } else {
      currentBlock.push({ rowIndex: i + 1, j: jv, l: lv });
    }
  }
  if (currentBlock.length > 0) blocks.push(currentBlock);

  if (blocks.length === 0) {
    throw new Error("No data blocks found.");
  }

  let grandEncash = 0;
  let grandExcess = 0;
  const blockResults: ALBlockResult[] = [];

  blocks.forEach((block, bi) => {
    let journeyPeriod = 0;
    let jFirstIndex = -1;

    for (let r = 0; r < block.length; r++) {
      if (!isNaN(block[r].j)) {
        journeyPeriod = Math.round(block[r].j);
        jFirstIndex = r;
        break;
      }
    }

    const leaves: number[] = [];
    block.forEach((row, idx) => {
      if (!isNaN(row.l)) {
        leaves.push(Math.round(row.l));
      }
      if (!isNaN(row.j) && jFirstIndex !== -1 && idx !== jFirstIndex) {
        leaves.push(Math.round(row.j));
      }
    });

    const leaveTotal = leaves.reduce((a, b) => a + b, 0);

    let alEntitled: number;
    let totalLeaveCounted: number;
    let journeyMsg: string;

    if (journeyPeriod < 4) {
      alEntitled = 60;
      totalLeaveCounted = leaveTotal + journeyPeriod;
      journeyMsg = "Journey period < 4 → AL = 60 (Journey counted)";
    } else {
      alEntitled = 56;
      totalLeaveCounted = leaveTotal;
      journeyMsg = "Journey period ≥ 4 → AL = 56 (Journey NOT counted)";
    }

    const diff = alEntitled - totalLeaveCounted;
    let verdict: string, emoji: string;

    if (diff > 0) {
      verdict = `Result: ENCASH = ${diff} day(s)`;
      emoji = "💰";
      grandEncash += diff;
    } else if (diff < 0) {
      verdict = `Result: EXCESS = ${-diff} day(s)`;
      emoji = "⚠️";
      grandExcess += -diff;
    } else {
      verdict = "Result: 0 days remaining. Fully utilized.";
      emoji = "✅";
    }

    blockResults.push({
      index: bi + 1,
      journeyPeriod,
      leaves,
      leaveTotal,
      alEntitled,
      totalLeaveCounted,
      journeyMsg,
      verdict,
      emoji,
      diff
    });
  });

  return {
    name: sheetName,
    blocks: blockResults,
    grandEncash,
    grandExcess
  };
}
