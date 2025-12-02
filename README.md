# CleanDevis 2.0 💎

Application premium de chiffrage et de génération de devis pour le nettoyage de fin de chantier.
Conçu pour **Clean Concept**, cet outil permet de calculer, ventiler et exporter des devis précis en se basant sur une convergence de 4 méthodes de calcul.

![CleanDevis Dashboard](https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=1200&q=80)

## ✨ Fonctionnalités Clés

### 1. Calculateur Intelligent 🧮
- **4 Méthodes de Calcul** convergentes :
  - *M1 (Technique)* : Basée sur la cadence (Logements/Jour).
  - *M2 (Marché)* : Basée sur une grille tarifaire de référence.
  - *M3 (Surface Min)* : Basée sur le rendement surfacique (Chantier difficile).
  - *M4 (Surface Max)* : Basée sur le rendement surfacique (Chantier fluide).
- **Ajustement de Complexité** : Distance, Finition, Accès, État initial.
- **Visualisation** : Comparaison graphique des scénarios (Recommandé, Bas, Haut, Technique).

### 2. Ventilation & Détails 📊
- Répartition automatique du prix global par **Phase** (Vitrerie, OPR, Pré-livraison, Livraison) et par **Typologie** (T1, T2, T3...).
- Mode "Global / Forfait" si aucune typologie n'est définie.
- Ajustement manuel des prix unitaires.
- Comparaison en temps réel avec l'objectif financier.

### 3. Intégration Sellsy CRM ⚡
- **Recherche Client** : Connectée à votre base Sellsy directement depuis le calculateur.
- **Création d'Opportunité** : Automatique lors de la validation d'un projet.
- **Export Devis** : Génération d'un devis détaillé dans Sellsy en un clic, respectant le mapping de vos produits/services.

### 4. Design & UX 🎨
- **Thème Obsidian** : Interface sombre, élégante et contrastée (Dark Mode par défaut).
- **Light Mode** : Disponible via le menu latéral.
- **Animations** : Transitions fluides et micro-interactions.

## 🛠️ Stack Technique

- **Frontend** : React 18, TypeScript, Vite.
- **Styling** : Tailwind CSS (avec configuration personnalisée `brand-colors`).
- **Charts** : Recharts.
- **Icons** : Lucide React.
- **Navigation** : React Router DOM.

## 🚀 Installation & Démarrage

### Pré-requis
- Node.js (v16+)
- npm ou yarn

### Installation
```bash
# Cloner le projet
git clone https://github.com/votre-repo/cleandevis-2.git

# Installer les dépendances
npm install
```

### Lancement
```bash
# Démarrer le serveur de développement
npm run dev
```
L'application sera accessible sur `http://localhost:5173`.

## ⚙️ Configuration

Accédez à la page **Settings** pour configurer :
1.  **Paramètres de Calcul** : Coût équipe, rendements cibles, grille de prix marché.
2.  **Intégration Sellsy** :
    *   Entrez vos `Client ID` et `Client Secret`.
    *   Configurez le mapping des produits (ex: `VITRERIE` -> `REF-VIT-01`).
    *   *Note : Les clés sont stockées localement (localStorage) pour le développement.*

## 📂 Structure du Projet

```
src/
├── components/   # Composants UI réutilisables (Layout, Sidebar...)
├── pages/        # Pages principales (Calculator, Ventilation, Settings...)
├── services/     # Logique métier et API (calculationService, sellsyService)
├── types.ts      # Définitions TypeScript globales
└── main.tsx      # Point d'entrée
```

## 🔒 Sécurité

Pour une mise en production, il est impératif de mettre en place un **Proxy Backend** pour sécuriser les échanges avec l'API Sellsy et ne pas exposer vos clés API côté client.

---
*Développé avec ❤️ par l'équipe Clean Concept.*
