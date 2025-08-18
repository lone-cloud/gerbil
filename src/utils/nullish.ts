export const isNotNullish = <T>(value: T | null | undefined): value is T =>
  value != null;

export const isNullish = (value: unknown): value is null | undefined =>
  value == null;
