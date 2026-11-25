/** Apaga dados privados guardados no aparelho (IndexedDB e caches de dados). Chamado ao sair. */
export async function clearLocalData() {
  try {
    const dbs = (await indexedDB.databases?.()) ?? [];
    await Promise.all(
      dbs.map(
        (db) =>
          new Promise<void>((resolve) => {
            if (!db.name) return resolve();
            const req = indexedDB.deleteDatabase(db.name);
            req.onsuccess = req.onerror = req.onblocked = () => resolve();
          }),
      ),
    );
  } catch {}
  try {
    // mantém só o cache de arquivos estáticos (sem dados pessoais)
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => !k.endsWith("-static")).map((k) => caches.delete(k)));
  } catch {}
  try {
    localStorage.clear();
    sessionStorage.clear();
  } catch {}
}
