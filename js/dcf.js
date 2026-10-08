// Value Stock Finder: Estimated Fair Value / DCF estimate (educational only).
// Classic script (no modules): declarations are shared globally; see index.html for the load order.

function annualCagrFromValues(values) {
  const nums = values.map(numberOrNull).filter(v => v !== null).reverse();
  if (nums.length < 2) return null;
  const first = nums[0];
  const last = nums[nums.length - 1];
  const years = nums.length - 1;
  if (first <= 0 || last <= 0 || years <= 0) return null;
  return Math.pow(last / first, 1 / years) - 1;
}

function fcfValues(m) {
  return (m.raw.cash || []).map(row => pickNum(row, ["freeCashFlow"])).filter(v => v !== null);
}

function dcfGrowthEstimate(m) {
  const fcfCagr = annualCagrFromValues(fcfValues(m));
  const candidates = [
    { value: fcfCagr, label: "historical FCF CAGR" },
    { value: m.fcfGrowth, label: "FMP FCF growth" },
    { value: m.revenueGrowth, label: "revenue growth" }
  ].filter(item => item.value !== null && Number.isFinite(item.value));

  if (!candidates.length) {
    return { rawGrowth: null, growthRate: 0, source: "fallback 0% growth" };
  }

  const selected = candidates[0];
  return {
    rawGrowth: selected.value,
    growthRate: clamp(selected.value, 0, DCF_MAX_GROWTH_RATE),
    source: selected.label
  };
}

function dcfBaseFcf(m) {
  const values = fcfValues(m);
  if (!values.length) return { value: null, source: "missing FCF", years: 0, latest: null };
  const latest = values[0];
  const avg = average(values);
  if (values.length >= 2 && avg !== null) {
    return { value: avg, source: `average FCF over ${values.length} years`, years: values.length, latest };
  }
  return { value: latest, source: "latest FCF", years: values.length, latest };
}

function computeDcfEstimate(m, dcfSettings) {
  const base = dcfBaseFcf(m);
  const growth = dcfGrowthEstimate(m);
  const discountRate = dcfSettings.discountRate;
  const terminalGrowth = dcfSettings.terminalGrowth;
  const projectionYears = dcfSettings.projectionYears;
  const marginSafetyRequirement = dcfSettings.marginSafetyRequirement;
  const reasons = [];

  if (discountRate <= terminalGrowth) reasons.push("Discount rate must be greater than terminal growth.");
  if (base.value === null || base.value <= 0) reasons.push("Not enough data: FCF must be positive.");
  if (m.shares === null || m.shares <= 0) reasons.push("Not enough data: shares outstanding are missing.");

  const confidenceTests = [
    discountRate > terminalGrowth,
    base.value !== null && base.value > 0,
    m.shares !== null && m.shares > 0,
    m.price !== null && m.price > 0,
    base.years >= 3,
    growth.rawGrowth !== null
  ];
  const confidenceScore = confidenceTests.filter(Boolean).length;
  const confidencePct = Math.round((confidenceScore / confidenceTests.length) * 100);

  if (reasons.length) {
    return {
      calculable: false,
      fairValuePerShare: null,
      estimatedValue: null,
      upsidePct: null,
      discountFromFairValuePct: null,
      marginOfSafetyPct: null,
      marginPassed: null,
      confidencePct,
      confidenceScore,
      confidenceMax: confidenceTests.length,
      baseFcf: base.value,
      baseFcfSource: base.source,
      latestFcf: base.latest,
      fcfYears: base.years,
      growthRate: growth.growthRate,
      rawGrowth: growth.rawGrowth,
      growthSource: growth.source,
      discountRate,
      terminalGrowth,
      projectionYears,
      marginSafetyRequirement,
      shares: m.shares,
      reasons
    };
  }

  let pvProjectedFcf = 0;
  let projectedFcf = base.value;
  for (let year = 1; year <= projectionYears; year++) {
    projectedFcf *= (1 + growth.growthRate);
    pvProjectedFcf += projectedFcf / Math.pow(1 + discountRate, year);
  }

  const terminalValue = projectedFcf * (1 + terminalGrowth) / (discountRate - terminalGrowth);
  const pvTerminalValue = terminalValue / Math.pow(1 + discountRate, projectionYears);
  const estimatedValue = pvProjectedFcf + pvTerminalValue;
  const fairValuePerShare = estimatedValue / m.shares;
  const upsidePct = m.price !== null && m.price > 0 ? (fairValuePerShare / m.price) - 1 : null;
  const discountFromFairValuePct = m.price !== null && fairValuePerShare > 0 ? (fairValuePerShare - m.price) / fairValuePerShare : null;
  const marginPassed = discountFromFairValuePct !== null ? discountFromFairValuePct >= marginSafetyRequirement : null;

  if (m.price === null || m.price <= 0) reasons.push("Fair value calculated, but current price is missing.");
  if (growth.rawGrowth !== null && growth.rawGrowth > DCF_MAX_GROWTH_RATE) reasons.push("Growth rate was capped conservatively at 8%.");
  if (growth.rawGrowth !== null && growth.rawGrowth < 0) reasons.push("Negative historical growth was floored at 0%.");
  if (growth.rawGrowth === null) reasons.push("No growth data; used 0% growth.");
  if (marginPassed === false) reasons.push("Margin of safety requirement was not met.");
  if (marginPassed === true) reasons.push("Margin of safety requirement was met.");

  return {
    calculable: true,
    fairValuePerShare,
    estimatedValue,
    upsidePct,
    discountFromFairValuePct,
    marginOfSafetyPct: discountFromFairValuePct,
    marginPassed,
    confidencePct,
    confidenceScore,
    confidenceMax: confidenceTests.length,
    baseFcf: base.value,
    baseFcfSource: base.source,
    latestFcf: base.latest,
    fcfYears: base.years,
    growthRate: growth.growthRate,
    rawGrowth: growth.rawGrowth,
    growthSource: growth.source,
    discountRate,
    terminalGrowth,
    projectionYears,
    marginSafetyRequirement,
    shares: m.shares,
    reasons
  };
}
