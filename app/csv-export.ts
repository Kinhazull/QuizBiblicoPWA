export function csvCell(value:unknown){
 const raw=String(value??"");
 const neutralized=/^[\t\r ]*[=+\-@]/.test(raw)||/^[\t\r]/.test(raw)?`'${raw}`:raw;
 return `"${neutralized.replaceAll('"','""')}"`;
}

export function csvDocument(rows:unknown[][]){
 return "\uFEFF"+rows.map(row=>row.map(csvCell).join(";")).join("\r\n");
}
