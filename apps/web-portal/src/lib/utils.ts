export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

// Forms submit fixed-cardinality bracket-indexed rows, e.g.
// `condition[0][conditionName]`, `condition[1][conditionName]`. Rows with no
// meaningful values are dropped rather than sent as blank entries.
export function rowsFromFormData(
  formData: FormData,
  prefix: string,
  fields: string[],
  count: number,
): Array<Record<string, string>> {
  const rows: Array<Record<string, string>> = [];
  for (let i = 0; i < count; i++) {
    const row: Record<string, string> = {};
    let hasValue = false;
    for (const field of fields) {
      const value = formData.get(`${prefix}[${i}][${field}]`);
      if (typeof value === 'string' && value.trim() !== '') {
        row[field] = value.trim();
        hasValue = true;
      }
    }
    if (hasValue) rows.push(row);
  }
  return rows;
}
