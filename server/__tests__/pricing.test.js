const { calculateDynamicPrice } = require('../utils/pricing');

describe('calculateDynamicPrice', () => {
  it('keeps the base price unchanged until the threshold is reached', () => {
    const price = calculateDynamicPrice({
      basePriceAmount: 10000,
      weightGrams: 10,
      currentSilverRate: 250,
      baseSilverRate: 225,
      silverRateChangeThreshold: 250,
      silverRateStep: 25,
      priceStepAmount: 25,
    });

    expect(price).toBe(10000);
  });

  it('adds a step amount per gram once the threshold is crossed', () => {
    const price = calculateDynamicPrice({
      basePriceAmount: 10000,
      weightGrams: 10,
      currentSilverRate: 275,
      baseSilverRate: 225,
      silverRateChangeThreshold: 250,
      silverRateStep: 25,
      priceStepAmount: 25,
    });

    expect(price).toBe(10250);
  });
});
