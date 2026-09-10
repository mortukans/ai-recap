// Type shim for the Drizzle-generated migrations.js bundle (loaded at runtime by Metro).
declare const migrations: {
  journal: { entries: { idx: number; when: number; tag: string; breakpoints: boolean }[] };
  migrations: Record<string, string>;
};
export default migrations;
