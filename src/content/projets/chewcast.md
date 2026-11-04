---
name: Chewcast
order: 2
kind: perso
year: "2026"
tags: [Express, SQLite, PWA]
url: https://chewcast.evanbouvier.fr
summary: "App de pêche au lancer, terrain + planification : météo, marées et recommandations générées automatiquement."
seoDescription: "Chewcast, app de pêche au lancer (PWA, Express, SQLite) : spots du sud Bretagne, sessions planifiées selon marées et météo, réglementation 2026."
# Capture mobile : contain + fond sombre pour la garder lisible en entier.
preview:
  kind: image
  image: ../../assets/previews/chewcast-duo.webp
  fit: contain
# Captures mobile 430x932 de l'app (convention : src/assets/previews/README.md).
gallery:
  layout: portrait
  images:
    - src: ../../assets/gallery/chewcast/chewcast-accueil.webp
      alt: "Écran d'accueil de Chewcast : prochaine session planifiée et accès rapides aux sections"
      legende: "Accueil"
    - src: ../../assets/gallery/chewcast/chewcast-spots.webp
      alt: "Catalogue des spots de pêche avec commune, type de zone, espèces ciblées et niveau de difficulté"
      legende: "Catalogue des spots"
    - src: ../../assets/gallery/chewcast/chewcast-planifier.webp
      alt: "Assistant de planification d'une session en plusieurs étapes : spot, horaires, espèces ciblées"
      legende: "Planifier une session"
    - src: ../../assets/gallery/chewcast/chewcast-reference.webp
      alt: "Section Référence : tailles minimales réglementaires 2026, guide leurres, nœuds et théorie des marées"
      legende: "Référence"
---

Chewcast est une PWA auto-hébergée (Express + SQLite) pensée pour la pêche au lancer, à la fois en préparation et sur le terrain. L'accueil résume la prochaine session planifiée et donne un accès rapide aux quatre sections de l'app. Le catalogue de spots recense des postes de pêche réels du sud Bretagne (accès, structures, espèces ciblées, niveau de difficulté). La planification de session est un formulaire en plusieurs étapes (choix du spot, horaires, espèces ciblées) qui s'appuie sur des données marée/météo récupérées automatiquement, et la section Référence embarque une base réglementaire 2026 (tailles minimales, quotas) ainsi que des guides pratiques (leurres, nœuds, théorie des marées).
