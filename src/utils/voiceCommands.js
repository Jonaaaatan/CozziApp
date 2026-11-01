// Intérprete de comandos de voz (sección 8 de la propuesta).
// Es una función pura: recibe lo que dijo el usuario y devuelve un comando
// estructurado. No sabe nada de pantallas ni de la voz, así que sirve igual para
// texto escrito, reconocimiento de voz del navegador o un servicio futuro.
const WORDS = {
  un: 1, uno: 1, una: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8,
  nueve: 9, diez: 10, once: 11, doce: 12, quince: 15, veinte: 20, treinta: 30,
  cuarenta: 40, cincuenta: 50, sesenta: 60,
};

export const normalize = (text) =>
  String(text).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[¿?¡!.,;:]/g, ' ').replace(/\s+/g, ' ').trim();

const toNumber = (token) => (/^\d+$/.test(token) ? parseInt(token, 10) : WORDS[token] ?? null);

function parseDuration(t) {
  const re = /(\d+|[a-z]+)\s*(horas?|hrs?|minutos?|mins?|segundos?|segs?)\b/g;
  let m;
  while ((m = re.exec(t))) {
    const n = toNumber(m[1]);
    if (n == null) continue;
    const unit = m[2][0]; // h, m, s
    return unit === 'h' ? n * 3600 : unit === 'm' ? n * 60 : n;
  }
  if (/media hora/.test(t)) return 1800;
  return null;
}

export function parseCommand(input) {
  const t = normalize(input);
  if (!t) return { type: 'unknown' };

  if (/temporizador|cronometro|alarma/.test(t)) {
    if (/(cancela|quita|deten|detener|elimina|apaga|borra)/.test(t)) return { type: 'cancelTimer' };
    const seconds = parseDuration(t);
    return seconds ? { type: 'setTimer', seconds } : { type: 'unknown' };
  }
  if (/(cuanto tiempo falta|cuanto falta|tiempo restante|cuanto queda)/.test(t)) return { type: 'timeLeft' };

  const people = t.match(/para (\d+|[a-z]+) (personas?|comensales|porciones)/);
  if (people && toNumber(people[1])) return { type: 'servings', servings: toNumber(people[1]) };

  if (/(terminar|termine|finalizar|finalice|acabe)/.test(t)) return { type: 'finish' };
  if (/(anterior|regresa|regresar|atras|vuelve)/.test(t)) return { type: 'prev' };
  if (/(que sigue|cual sigue|que viene)/.test(t)) return { type: 'peek' };
  if (/(continuar|continua|reanuda|sigue leyendo)/.test(t)) return { type: 'resume' };
  if (/(siguiente|sigue|adelante|avanza|listo|ya esta|ya quedo)/.test(t)) return { type: 'next' };
  if (/(repite|repetir|otra vez|de nuevo)/.test(t)) return { type: 'repeat' };
  if (/(pausa|pausar|callate|silencio|detente)/.test(t)) return { type: 'pause' };
  if (/(mas despacio|lento)/.test(t)) return { type: 'slower' };
  if (/(cuanto necesito|ingredientes|que necesito|que lleva)/.test(t)) return { type: 'ingredients' };
  if (/(sustitu|reemplaz|cambiar por|en lugar de)/.test(t)) return { type: 'substitute', text: t };
  if (/(explica|que significa|como hago|como se|como sé|como se si|ayuda)/.test(t)) return { type: 'explain' };

  return { type: 'unknown' };
}
