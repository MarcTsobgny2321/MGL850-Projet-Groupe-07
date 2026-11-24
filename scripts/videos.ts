// Enregistre deux courtes vidéos de démo avec Playwright (navigateur piloté).
// Prérequis : npm run chaine (terminal 1) et npm run web (terminal 2) en cours.
// Usage : npm run videos  ->  videos/1-dossier.mp4 et videos/2-verification.mp4
// Attention : redéploie les contrats, donc efface donnees/.
import { chromium, Browser, Page } from "playwright";
import { execSync } from "child_process";
import fs from "fs";
import path from "path";

const URL = "http://localhost:5173";
const DOSSIER_VIDEOS = "videos";
const TAILLE = { width: 1280, height: 800 };

const RAPPORT = "exemples/rapport_inspection.pdf";
const RAPPORT_MODIFIE = "exemples/rapport_inspection_modifie.pdf";
const ATTESTATION = "exemples/attestation_syndicat.pdf";
const RECU_RAPPORT = "donnees/recus/rapport_inspection.json";
const RECU_ATTESTATION = "donnees/recus/attestation_syndicat.json";

// Commande de la console (émettre, sceller...), lancée entre deux scènes
function console_(commande: string) {
  execSync(`npm run -s ${commande}`, { stdio: "pipe" });
}

// Légende incrustée en bas de l'écran, pour comprendre la vidéo sans le son
async function legende(page: Page, texte: string, duree = 2200) {
  await page.evaluate((t) => {
    let el = document.getElementById("legende-video");
    if (!el) {
      el = document.createElement("div");
      el.id = "legende-video";
      el.style.cssText =
        "position:fixed;left:50%;bottom:28px;transform:translateX(-50%);z-index:10000;" +
        "background:rgba(20,32,48,.88);color:#fff;padding:12px 22px;border-radius:10px;" +
        "font:500 18px system-ui,sans-serif;max-width:80%;text-align:center;box-shadow:0 6px 20px rgba(0,0,0,.25)";
      document.body.appendChild(el);
    }
    el.textContent = t;
  }, texte);
  await page.waitForTimeout(duree);
}

// Change de compte ; la légende de la scène précédente disparaît
async function jeSuis(page: Page, role: string) {
  await page.evaluate(() => document.getElementById("legende-video")?.remove());
  await page.getByRole("combobox", { name: "Je suis" }).click();
  await page.getByRole("option", { name: `Je suis : ${role}` }).click();
  await page.waitForTimeout(400);
}

async function allerA(page: Page, onglet: string) {
  await page.getByRole("button", { name: onglet, exact: true }).first().click();
  await page.waitForTimeout(600);
}

async function ouvrirDossier(page: Page, n: number) {
  await allerA(page, "Dossiers");
  await page.getByRole("cell", { name: `Dossier ${n}`, exact: true }).click();
  await page.waitForTimeout(800);
}

async function choisirFichiers(page: Page, pdf: string, recu: string) {
  const champs = page.locator("input[type=file]");
  await champs.nth(0).setInputFiles(pdf);
  await champs.nth(1).setInputFiles(recu);
  await page.waitForTimeout(500);
}

async function deposer(page: Page, pdf: string, recu: string, attendu: string) {
  await choisirFichiers(page, pdf, recu);
  await page.getByRole("button", { name: "Déposer", exact: true }).click();
  await page.getByText(attendu).first().waitFor();
}

// On attend un état durable de l'écran : après un rechargement, le message de confirmation disparaît
// Ouvre une page qui enregistre sa vidéo ; à la fermeture, la convertit en MP4
async function enregistrer(navigateur: Browser, nom: string, scene: (page: Page) => Promise<void>) {
  const contexte = await navigateur.newContext({ viewport: TAILLE, recordVideo: { dir: DOSSIER_VIDEOS, size: TAILLE } });
  const page = await contexte.newPage();
  await page.goto(URL);
  await scene(page);
  await page.waitForTimeout(1500);
  const video = page.video()!;
  await contexte.close(); // la vidéo est écrite à la fermeture
  const webm = await video.path();
  const mp4 = path.join(DOSSIER_VIDEOS, `${nom}.mp4`);
  execSync(`ffmpeg -y -loglevel error -i "${webm}" -c:v libx264 -pix_fmt yuv420p -movflags +faststart "${mp4}"`);
  fs.rmSync(webm);
  console.log(`Vidéo : ${mp4}`);
}

async function sceneDossier(page: Page) {
  await legende(page, "Un dossier de vente, de l'ouverture à la fermeture");

  await jeSuis(page, "courtier");
  await allerA(page, "Dossiers");
  await legende(page, "Le courtier ouvre le dossier. Seule l'empreinte salée du cadastre va sur la chaîne");
  await page.getByRole("button", { name: "Ouvrir le dossier" }).click();
  await page.getByText("Dossier 1 ouvert").waitFor();
  await page.waitForTimeout(1200);

  await jeSuis(page, "vendeur");
  await ouvrirDossier(page, 1);
  await legende(page, "Le vendeur donne son accord (transaction signée par son compte)");
  await page.getByRole("button", { name: "Approuver le dossier" }).click();
  await page.getByText("Votre accord est donné").waitFor();

  await jeSuis(page, "acheteur");
  await ouvrirDossier(page, 1);
  await page.getByRole("button", { name: "Approuver le dossier" }).click();
  await page.getByText("Actif", { exact: true }).first().waitFor();
  await legende(page, "Les deux parties ont donné leur accord : le dossier est actif");

  await legende(page, "Pendant ce temps, l'inspecteur et le syndicat émettent leurs documents, et le service scelle un lot", 1500);
  console_(`emettre -- ${RAPPORT} inspecteur 1234567 30`);
  console_(`emettre -- ${ATTESTATION} syndicat 1234567`);
  console_("sceller");
  await legende(page, "Lot 1 scellé sur la chaîne");

  await legende(page, "L'acheteur essaie de déposer un rapport modifié d'un seul octet");
  await deposer(page, RAPPORT_MODIFIE, RECU_RAPPORT, "Dépôt impossible");
  await legende(page, "Refusé : ce PDF n'existe dans aucun lot scellé", 2800);

  await legende(page, "Il dépose le vrai rapport. Le contrat le vérifie auprès de ProofAnchor");
  await deposer(page, RAPPORT, RECU_RAPPORT, "Vous avez déposé tous les documents");
  await page.waitForTimeout(1200);

  await jeSuis(page, "vendeur");
  await ouvrirDossier(page, 1);
  await legende(page, "Le vendeur dépose l'attestation du syndicat");
  await deposer(page, ATTESTATION, RECU_ATTESTATION, "Vous avez déposé tous les documents");
  await page.waitForTimeout(1200);

  await jeSuis(page, "notaire");
  await ouvrirDossier(page, 1);
  await legende(page, "Le notaire ferme le dossier. C'est le contrat qui décide s'il est conforme");
  await page.getByRole("button", { name: "Fermer le dossier" }).click();
  await page.getByText("Fermé", { exact: true }).first().waitFor();
  await page.mouse.wheel(0, -2000);
  await legende(page, "Dossier fermé et conforme : tout est arrivé à temps", 3000);
}

async function sceneVerification(page: Page) {
  await jeSuis(page, "notaire");
  await allerA(page, "Vérification");
  await legende(page, "Vérifier un document : le PDF ne quitte pas l'ordinateur, seule son empreinte est calculée");

  await choisirFichiers(page, RAPPORT, RECU_RAPPORT);
  await page.getByPlaceholder("1234567").fill("1234567");
  await page.getByRole("button", { name: "Vérifier", exact: true }).click();
  await page.getByText(/^Valide le/).waitFor();
  await legende(page, "Valide : intact, scellé, signé par un émetteur reconnu, et pour le bon immeuble", 3000);
  await page.mouse.wheel(0, 700);
  await page.waitForTimeout(1500);
  await page.mouse.wheel(0, -700);

  await choisirFichiers(page, RAPPORT_MODIFIE, RECU_RAPPORT);
  await page.getByRole("button", { name: "Vérifier", exact: true }).click();
  await page.getByText(/^Non valide le/).waitFor();
  await legende(page, "Le même rapport modifié d'un octet : non valide", 2800);

  const lot1 = JSON.parse(fs.readFileSync("donnees/lots/lot-1.json", "utf8")).dateScellement as number;
  await legende(page, "Un jour plus tard, l'inspecteur annule son rapport. Un nouveau lot est scellé", 1500);
  console_("avancer -- 1");
  console_(`emettre -- --annuler ${RECU_RAPPORT}`);
  console_("sceller");

  await choisirFichiers(page, RAPPORT, RECU_RAPPORT);
  await page.getByPlaceholder("1234567").fill("");
  await page.getByRole("button", { name: "Vérifier", exact: true }).click();
  await page.getByText(/annulé par son émetteur/).waitFor();
  await legende(page, "Aujourd'hui, le rapport n'est plus valide : il a été annulé", 2800);

  // Une heure après le scellement du lot 1, avant l'annulation (heure locale)
  const d = new Date((lot1 + 3600) * 1000);
  const deux = (n: number) => String(n).padStart(2, "0");
  const avant = `${d.getFullYear()}-${deux(d.getMonth() + 1)}-${deux(d.getDate())}T${deux(d.getHours())}:${deux(d.getMinutes())}`;
  await page.locator("input[type=datetime-local]").fill(avant);
  await page.getByRole("button", { name: "Vérifier", exact: true }).click();
  await page.getByText(/^Valide le/).waitFor();
  await legende(page, "Mais à la date de la signature, il était valide. La réponse pour une date passée ne change jamais", 3500);
}

async function main() {
  try {
    execSync("curl -s -o /dev/null http://127.0.0.1:8545", { stdio: "pipe" });
    execSync(`curl -s -o /dev/null ${URL}`, { stdio: "pipe" });
  } catch {
    throw new Error("Lancer d'abord npm run chaine et npm run web");
  }
  console_("deployer"); // repart de zéro : dossier 1 et lot 1
  fs.mkdirSync(DOSSIER_VIDEOS, { recursive: true });

  const navigateur = await chromium.launch({ slowMo: 60 });
  try {
    await enregistrer(navigateur, "1-dossier", sceneDossier);
    await enregistrer(navigateur, "2-verification", sceneVerification);
  } finally {
    await navigateur.close();
  }
}

main().catch((erreur) => {
  console.error(erreur.message ?? erreur);
  process.exitCode = 1;
});
