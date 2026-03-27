# VIto by Vitogaz — Backoffice Admin

## Rôle de ce projet
Interface d'administration — permet à l'équipe Vitogaz de gérer les revendeurs, produits et données de l'application VIto.

## Stack technique
- Framework : Next.js (App Router)
- Style : Tailwind CSS
- Déploiement : Vercel
- Communication : API REST via le backend NestJS

## Points d'attention
- Accès réservé aux administrateurs — vérifier les droits RBAC sur chaque page
- Les variables d'environnement doivent être définies sur Vercel ET en local dans .env.local
- Ne jamais exposer de routes admin sans authentification

## Commandes importantes
- npm run dev → lancer en développement
- npm run build → vérifier que le build passe avant de commiter
- npm run lint → vérifier le code

## Communication avec le backend
- API REST via le backend NestJS
- URL backend en variable d'environnement : NEXT_PUBLIC_API_URL

## Fonctionnalités principales
- Gestion des 523 revendeurs (CRUD + carte Google Maps)
- Gestion des produits avec upload d'images
- Tableau de bord administration

## Conventions
- Composants React en PascalCase
- Fichiers de pages dans /app
- Composants réutilisables dans /components
- TypeScript strict — pas de any
