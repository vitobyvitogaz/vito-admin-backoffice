/**
 * Utilitaire partagé — Export CSV côté client
 * Usage : exportToCSV(data, "nom_fichier")
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type CsvRow = Record<string, any>;

/**
 * Échappe une valeur pour l'insertion dans une cellule CSV.
 * - Convertit les booléens en "Oui" / "Non"
 * - Entoure de guillemets si la valeur contient une virgule, un guillemet ou un saut de ligne
 */
function escapeCsvValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "boolean") return value ? "Oui" : "Non";
  if (Array.isArray(value)) return escapeCsvValue(value.join(", "));

  const str = String(value);

  // Échapper les guillemets internes en les doublant
  const escaped = str.replace(/"/g, '""');

  // Entourer de guillemets si nécessaire
  if (escaped.includes(",") || escaped.includes('"') || escaped.includes("\n") || escaped.includes("\r")) {
    return `"${escaped}"`;
  }

  return escaped;
}

/**
 * Génère et déclenche le téléchargement d'un fichier CSV.
 *
 * @param data    Tableau d'objets à exporter
 * @param filename Nom du fichier sans extension (la date sera ajoutée automatiquement)
 * @param columns Mapping optionnel { clé_objet: "Label colonne" } pour renommer/filtrer les colonnes.
 *                Si absent, toutes les clés du premier objet sont utilisées telles quelles.
 */
export function exportToCSV(
  data: CsvRow[],
  filename: string,
  columns?: Record<string, string>
): void {
  if (!data || data.length === 0) {
    console.warn("exportToCSV : aucune donnée à exporter");
    return;
  }

  // Déterminer les colonnes à exporter
  const keys = columns ? Object.keys(columns) : Object.keys(data[0]);
  const headers = columns ? Object.values(columns) : keys;

  // Construire les lignes CSV
  const rows = data.map((row) =>
    keys.map((key) => escapeCsvValue(row[key])).join(",")
  );

  // Assembler le contenu CSV avec BOM UTF-8 pour Excel
  const bom = "\uFEFF";
  const csvContent = bom + [headers.join(","), ...rows].join("\n");

  // Générer le nom de fichier avec la date du jour
  const date = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
  const fullFilename = `${filename}_${date}.csv`;

  // Déclencher le téléchargement
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fullFilename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}