/**
 * src/utils/formatMoney.ts
 *
 * Single source of truth for currency display. Uses a decimal point,
 * not a comma, per explicit direction — even though French convention
 * technically uses a comma, this project's own choice is a period, so
 * that's what ships. Euro symbol stays, placed after the amount.
 */

export function formatMoney(value: number): string {
  return `${value.toFixed(2)} €`;
}
