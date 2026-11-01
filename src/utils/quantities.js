// Ajuste de porciones: "600 g" con factor 2 -> "1200 g"; "1/2 taza" -> "1 taza";
// "1 1/2 tazas" -> "3 tazas".
const fmt = (n) => {
  const r = Math.round(n * 10) / 10;
  return String(r);
};

export function scaleQty(qty, factor) {
  if (factor === 1) return qty;
  const m = String(qty).match(/^(\d+\s+\d+\/\d+|\d+\/\d+|\d+(?:[.,]\d+)?)(.*)$/);
  if (!m) return qty; // "al gusto", "1 manojo"... si no empieza con número se deja igual
  const num = m[1];
  let value;
  if (/^\d+\s+\d+\/\d+$/.test(num)) {
    const [whole, frac] = num.split(/\s+/);
    const [a, b] = frac.split('/').map(Number);
    value = Number(whole) + a / b;
  } else if (num.includes('/')) {
    const [a, b] = num.split('/').map(Number);
    value = a / b;
  } else {
    value = parseFloat(num.replace(',', '.'));
  }
  return `${fmt(value * factor)}${m[2]}`;
}
