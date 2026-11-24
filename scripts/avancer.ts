// Avance l'horloge de la chaîne locale, pour montrer un retard, une expiration
// ou une vérification « avant l'annulation ».
// Usage : npm run avancer -- <jours>
import { fournisseur, maintenantChaine } from "./comptes";

async function main() {
  const jours = Number(process.argv[2]);
  if (!(jours > 0)) {
    console.log("Usage : npm run avancer -- <jours>");
    process.exitCode = 1;
    return;
  }
  await fournisseur.send("evm_increaseTime", [Math.round(jours * 24 * 3600)]);
  await fournisseur.send("evm_mine", []); // un bloc vide porte la nouvelle date
  const date = new Date((await maintenantChaine()) * 1000).toLocaleString("fr-CA");
  console.log(`Chaîne avancée de ${jours} jour(s). Heure de la chaîne : ${date}`);
}

main().catch((erreur) => {
  console.error(erreur.message ?? erreur);
  process.exitCode = 1;
});
