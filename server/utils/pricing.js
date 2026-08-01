function roundToNearestCurrency(value) {
  return Math.round(value / 1) * 1;
}

function calculateDynamicPrice({
  basePriceAmount,
  weightGrams,
  currentSilverRate,
  baseSilverRate = 225,
  silverRateChangeThreshold = 250,
  silverRateStep = 25,
  priceStepAmount = 25,
}) {
  const normalizedBasePrice = Number(basePriceAmount) || 0;
  const normalizedWeight = Number(weightGrams) || 0;
  const normalizedCurrentRate = Number(currentSilverRate) || 0;
  const normalizedThreshold = Number(silverRateChangeThreshold) || Number(baseSilverRate) || 0;
  const normalizedStep = Number(silverRateStep) || 0;
  const normalizedPriceStep = Number(priceStepAmount) || 0;

  if (!normalizedBasePrice || !normalizedWeight) {
    return normalizedBasePrice;
  }

  if (normalizedCurrentRate <= normalizedThreshold) {
    return normalizedBasePrice;
  }

  const rateAboveThreshold = normalizedCurrentRate - normalizedThreshold;
  const stepCount = Math.max(0, Math.floor(rateAboveThreshold / normalizedStep));
  const extraPrice = stepCount * normalizedPriceStep * normalizedWeight;

  return roundToNearestCurrency(normalizedBasePrice + extraPrice);
}

module.exports = {
  calculateDynamicPrice,
};
