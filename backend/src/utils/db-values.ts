export function toDbText(value: unknown) {
  if (value === undefined || value === null) return null;
  const text = String(value).trim();
  return text ? text : null;
}

export function toDbDate(value: unknown) {
  const text = toDbText(value);
  return text;
}

export function toDbNumber(value: unknown) {
  const text = toDbText(value);
  if (text === null) return null;
  const parsed = Number(text.replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

export function toDbInteger(value: unknown) {
  const number = toDbNumber(value);
  return number === null ? null : Math.trunc(number);
}

export function fromDbText(value: unknown) {
  return value === null || value === undefined ? "" : String(value);
}

export function fromDbDate(value: unknown) {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, "0");
    const day = String(value.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }
  return String(value).slice(0, 10);
}

export function fromDbJsonArray(value: unknown) {
  return Array.isArray(value) ? value : [];
}
