// Serveur de développement : pages React, relais vers la chaîne, fichiers publics.
// Aucune logique métier ici (ADR 0001).
import { defineConfig, Plugin } from "vite";
import react from "@vitejs/plugin-react";
import fs from "fs";
import path from "path";

const DONNEES = path.resolve(__dirname, "../donnees");

// Seuls les fichiers publics sont servis : jamais recus/, registres/ ni immeubles/
const PUBLICS = /^\/donnees\/(deploiement\.json|lots\/lot-\d+\.json)$/;

function fichiersPublics(): Plugin {
  return {
    name: "fichiers-publics",
    configureServer(serveur) {
      serveur.middlewares.use((req, res, next) => {
        const url = req.url ?? "";
        if (!PUBLICS.test(url)) return next();
        const fichier = path.join(DONNEES, url.replace("/donnees/", ""));
        if (!fs.existsSync(fichier)) {
          res.statusCode = 404;
          return res.end();
        }
        res.setHeader("Content-Type", "application/json");
        res.end(fs.readFileSync(fichier));
      });
    },
  };
}

export default defineConfig({
  root: __dirname,
  plugins: [react(), fichiersPublics()],
  server: {
    port: 5173,
    // Relais vers la chaîne locale : le navigateur reste sur la même origine (pas de CORS)
    proxy: { "/rpc": { target: "http://127.0.0.1:8545", rewrite: () => "/" } },
  },
});
