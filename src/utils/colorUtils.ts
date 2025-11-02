export interface ColorStop {
  color: string;
  position: number;
}

export const getIntensityColor = (value: number): string => {
  const p = Math.min(100, Math.max(0, value));
  let r, g, b;
  
  if (p >= 50) {
    const t = (p - 50) / 50;
    r = Math.round(255 * (1 - t) + 50 * t);
    g = Math.round(255 * (1 - t) + 255 * t);
    b = Math.round(0 * (1 - t) + 50 * t);
  } else {
    const t = p / 50;
    r = 255;
    g = Math.round(255 * t);
    b = 0;
  }
  
  return `rgb(${r},${g},${b})`;
};

export const getIntensityGradient = (value: number) => {
  const p = Math.min(100, Math.max(0, value));
  let r1, g1, b1, r2, g2, b2;
  
  if (p >= 50) {
    const t = (p - 50) / 50;
    r1 = Math.round(255 * (1 - t) + 100 * t);
    g1 = Math.round(255 * (1 - t) + 255 * t);
    b1 = Math.round(100 * (1 - t) + 100 * t);
    r2 = Math.round(255 * (1 - t) + 50 * t);
    g2 = Math.round(255 * (1 - t) + 255 * t);
    b2 = Math.round(0 * (1 - t) + 50 * t);
  } else {
    const t = p / 50;
    r1 = Math.round(255 * (1 - t) + 255 * t);
    g1 = Math.round(200 * (1 - t) + 255 * t);
    b1 = Math.round(0 * (1 - t) + 100 * t);
    r2 = 255;
    g2 = Math.round(255 * t);
    b2 = 0;
  }
  
  return [
    { color: `rgb(${r1},${g1},${b1})`, position: 0 },
    { color: `rgb(${r2},${g2},${b2})`, position: 100 }
  ];
};

export const createGradientString = (stops: ColorStop[], direction = 'to bottom'): string => {
  const stopStrings = stops.map(stop => `${stop.color} ${stop.position}%`);
  return `linear-gradient(${direction}, ${stopStrings.join(', ')})`;
};