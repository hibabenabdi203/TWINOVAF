/* =============================================================
   TWINOVA — TWINY : Co-pilote Industriel IA
   ✅ Bouton flottant sur toutes les pages
   ✅ 3 rôles : HACCP, Performance, Maintenance
   ✅ Accès aux données réelles de la BDD
   ✅ Validation intelligente
   ============================================================= */

const TWINY = (() => {

  // ── Contexte système TWINY ────────────────────────────────
 const SYSTEM_PROMPT = `Tu es TWINY, l'assistant expert et guide officiel de la plateforme TWINOVA — Jumeau Numérique Industriel pour PME agroalimentaires algériennes.

🎯 TES 4 RÔLES :
1. 🗺️ GUIDE PRODUIT — Tu guides l'utilisateur dans TWINOVA
2. 🛡️ CONSULTANT HACCP — Expert sécurité sanitaire
3. 📊 ANALYSTE PERFORMANCE — Expert TRS/KPIs
4. 🔧 TUTEUR MAINTENANCE — Expert maintenance prédictive

📚 LES 8 MODULES DE TWINOVA QUE TU CONNAIS PAR CŒUR :
- Dashboard : TRS, Disponibilité, Performance, Qualité, graphiques KPIs
- Saisie Production : Enregistrer les données journalières de production
- Simulateur : Simuler des améliorations et calculer les gains potentiels
- Plan d'Action : Actions prioritaires basées sur l'analyse des données
- Historique : Consulter l'historique de production et les tendances
- Recettes & Process : Gérer les recettes et suivre les lots de production
- Visualisation 3D : Jumeau numérique 3D de l'usine avec 4 modes de vue
- HACCP & Sécurité : Plans HACCP, contrôles sanitaires, libération de lots
- Énergie & Économie : EPI, Loss Costing, Bilan Carbone, Audit mensuel
- Intelligence Prédictive : HSI, RUL, Radar de risque, maintenance prédictive
- Benchmarking : SPI, positionnement sectoriel, comparaison anonyme
- Greenfield : Simulation de création d'usine, ROI, Business Plan

🗺️ GUIDE DE NAVIGATION :
- Pour saisir des données → Menu gauche → "Saisie Production"
- Pour voir les graphiques → "Dashboard"
- Pour contrôle sanitaire → "HACCP & Sécurité" → onglet "Contrôle Sanitaire"
- Pour changer les tarifs énergie → "Énergie & Économie" → onglet "Tarifs & Seuils"
- Pour voir la 3D → "Visualisation 3D" → choisir le mode de vue
- Pour comparer avec le secteur → "Benchmarking" → cliquer "Analyser"
- Pour créer une recette → "Recettes & Process" → "Nouvelle recette"
- Pour ajouter un composant → "Intelligence Prédictive" → "Composants" → "+ Ajouter"

💬 EXEMPLES D'INTERACTIONS GUIDE :
- "Comment créer un lot ?" → Recettes & Process → Suivi des Lots → remplir le formulaire
- "Où changer le prix du kWh ?" → Énergie & Économie → onglet Tarifs & Seuils
- "Comment lire la 3D ?" → Visualisation 3D → mode X-Ray pour voir l'usure interne
- "Comment soumettre mes données au benchmark ?" → Benchmarking → bouton "Soumettre mes données"
- "Mon TRS est rouge, pourquoi ?" → Dashboard → je vais analyser vos données en temps réel

🏭 CONTEXTE SECTORIEL :
- Secteurs : Laiterie, Boulangerie, Conserverie, Fromagerie (Algérie)
- Normes : HACCP, ISO 22000, CODEX Alimentarius, normes algériennes ONILEV/IAPSA
- Devise locale : Dinar Algérien (DZD)
- Objectifs TRS secteur : >85% optimal, 75-85% correct, <75% à améliorer

📏 RÈGLES D'OR :
1. Réponds TOUJOURS en français
2. Sois pédagogue et rassurant avec les opérateurs
3. Pour les alertes critiques → commence par 🔴
4. Pour les avertissements → commence par ⚠️
5. Pour les bonnes nouvelles → commence par ✅
6. Ne contredis JAMAIS les normes sanitaires HACCP
7. Donne toujours le chemin de navigation exact dans TWINOVA
8. Si tu as accès aux données réelles, analyse-les précisément
9. Adapte ton niveau de détail selon la page active
10. Maximum 150 mots par réponse — sois concis et précis`;

  // ── État ──────────────────────────────────────────────────
  let isOpen = false;
  let messages = [];
  let isTyping = false;
  let contexteDonnees = {};

  // ── Récupérer le contexte des données réelles ─────────────
  const recupererContexte = async () => {
    const token = localStorage.getItem('twinova_token');
    if (!token) return '';

    let contexte = '';

    try {
      // Dashboard KPIs
      const dashRes = await fetch('http://localhost:8000/historique/2');
      if (dashRes.ok) {
        const dash = await dashRes.json();
        if (dash.historique && dash.historique.length > 0) {
          const dernier = dash.historique[0];
          contexte += `\nDONNÉES ACTUELLES DE L'ENTREPRISE :
- TRS actuel : ${dernier.trs}%
- Disponibilité : ${dernier.disponibilite}%
- Performance : ${dernier.performance}%
- Qualité : ${dernier.qualite}%
- Date : ${new Date(dernier.date).toLocaleDateString('fr-FR')}`;
        }
      }
    } catch(e) {}

    return contexte;
  };

  // ── Appel API Claude ───────────────────────────────────────
  const appellerIA = async (userMessage) => {
    const contexte = await recupererContexte();
    const systemAvecContexte = SYSTEM_PROMPT + contexte;

    // Ajouter message utilisateur
    messages.push({ role: 'user', content: userMessage });

    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    mode: 'cors',
    headers: { 
        'Content-Type': 'application/json',
        'Authorization': 'Bearer VOTRE_CLE_API_ICI'
    },
  body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 1000,
      messages: [
        { role: 'system', content: systemAvecContexte },
        ...messages
      ]
    })
});

      const data = await response.json();
      const reponse = data.choices[0].message.content;

      // Ajouter réponse à l'historique
      messages.push({ role: 'assistant', content: reponse });

      // Garder max 20 messages
      if (messages.length > 20) messages = messages.slice(-20);

      return reponse;

    } catch(e) {
      return '🔴 Erreur de connexion à l\'IA. Vérifiez votre connexion internet.';
    }
  };

  // ── Validation intelligente ────────────────────────────────
  const validerSaisie = async (champ, valeur, contexte) => {
    const prompt = `Validation rapide — champ "${champ}" = "${valeur}" dans le contexte "${contexte}".
    
Réponds en JSON uniquement :
{
  "valide": true/false,
  "message": "explication courte si invalide",
  "suggestion": "valeur suggérée si applicable"
}`;

    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    mode: 'cors',
    headers: { 
        'Content-Type': 'application/json',
        'Authorization': 'Bearer VOTRE_CLE_API_ICI'
    },
    body: JSON.stringify({
      model: 'llama3-70b-8192',
      max_tokens: 200,
      messages: [
        { role: 'system', content: 'Tu es un validateur de données industrielles. Réponds uniquement en JSON valide.' },
        { role: 'user', content: prompt }
      ]
    })
});

      const data = await response.json();
      const text = data.choices[0].message.content;
      return JSON.parse(text.replace(/```json|```/g, '').trim());

    } catch(e) {
      return { valide: true };
    }
  };

  // ── Messages de bienvenue selon la page ───────────────────
  const getMessageBienvenue = () => {
    const page = document.querySelector('.nav-item.active')?.dataset?.page || 'dashboard';
    const messages_bienvenue = {
      dashboard: '👋 Bonjour ! Je suis **TWINY**, votre co-pilote industriel. Je vois vos KPIs en temps réel. Que souhaitez-vous analyser ?',
      haccp: '🛡️ Module HACCP actif. Je peux vous aider à interpréter vos contrôles sanitaires ou vérifier vos points critiques. Posez-moi vos questions !',
      energie: '⚡ Module Énergie actif. Je peux analyser votre consommation et identifier des opportunités d\'économies. Que voulez-vous optimiser ?',
      intelligence: '🔧 Module Maintenance actif. Je peux interpréter vos signaux HSI/RUL et vous guider dans vos interventions. Quel composant vous préoccupe ?',
      benchmark: '📊 Module Benchmarking actif. Je peux vous expliquer votre positionnement sectoriel et identifier vos leviers de progression.',
      default: '👋 Bonjour ! Je suis **TWINY**, votre co-pilote industriel IA. Comment puis-je vous aider ?'
    };
    return messages_bienvenue[page] || messages_bienvenue.default;
  };

  // ── Questions suggérées selon la page ────────────────────
  const getSuggestions = () => {
    const page = document.querySelector('.nav-item.active')?.dataset?.page || 'dashboard';
    const sugg = {
      dashboard: [
        'Pourquoi mon TRS est faible ?',
        'Comment améliorer ma disponibilité ?',
        'Quelles sont mes pertes financières ?'
      ],
      haccp: [
        'Mon pH est à 4.8, est-ce critique ?',
        'Quelle température pour pasteuriser le lait ?',
        'Comment libérer un lot bloqué ?'
      ],
      energie: [
        'Comment réduire ma consommation ?',
        'Qu\'est-ce que l\'EPI ?',
        'Quel est mon bilan carbone ?'
      ],
      intelligence: [
        'Mon HSI est à 45%, que faire ?',
        'Comment calculer le RUL ?',
        'Quand faire la maintenance ?'
      ],
      default: [
        'Explique-moi le TRS',
        'Comment fonctionne le HACCP ?',
        'Qu\'est-ce que le benchmarking ?'
      ]
    };
    return sugg[page] || sugg.default;
  };

  // ── Créer l'interface ─────────────────────────────────────
  const creerInterface = () => {
    // Bouton flottant
    const btn = document.createElement('div');
    btn.id = 'twiny-btn';
    btn.innerHTML = `
      <div class="twiny-btn-inner">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
  <!-- Tête -->
  <rect x="5" y="6" width="14" height="10" rx="3" stroke="#00FFD1" stroke-width="1.5" fill="rgba(0,255,209,0.1)"/>
  <!-- Yeux -->
  <circle cx="9" cy="11" r="1.5" fill="#00FFD1"/>
  <circle cx="15" cy="11" r="1.5" fill="#00FFD1"/>
  <!-- Antenne -->
  <line x1="12" y1="6" x2="12" y2="3" stroke="#00FFD1" stroke-width="1.5" stroke-linecap="round"/>
  <circle cx="12" cy="2.5" r="1" fill="#00FFD1"/>
  <!-- Corps -->
  <rect x="8" y="16" width="8" height="4" rx="1.5" stroke="#00FFD1" stroke-width="1.5" fill="rgba(0,255,209,0.1)"/>
  <!-- Jambes -->
  <line x1="9" y1="20" x2="9" y2="23" stroke="#00FFD1" stroke-width="1.5" stroke-linecap="round"/>
  <line x1="15" y1="20" x2="15" y2="23" stroke="#00FFD1" stroke-width="1.5" stroke-linecap="round"/>
  <!-- Bouche sourire -->
  <path d="M9.5 13 Q12 15 14.5 13" stroke="#00FFD1" stroke-width="1.2" stroke-linecap="round" fill="none"/>
</svg>
        <span>TWINY</span>
        <div class="twiny-pulse"></div>
      </div>`;
    btn.onclick = toggleChat;
    document.body.appendChild(btn);

    // Fenêtre de chat
    const chat = document.createElement('div');
    chat.id = 'twiny-chat';
    chat.innerHTML = `
      <div class="twiny-header">
        <div class="twiny-header-left">
          <div class="twiny-avatar">T</div>
          <div>
            <div class="twiny-name">TWINY</div>
            <div class="twiny-status">● Co-pilote Industriel IA</div>
          </div>
        </div>
        <div class="twiny-header-actions">
          <button type="button" class="twiny-clear" onclick="TWINY.effacerChat()" title="Nouvelle conversation">↺</button>
          <button type="button" class="twiny-close" onclick="TWINY.fermer()">✕</button>
        </div>
      </div>

      <div class="twiny-messages" id="twiny-messages"></div>

      <div class="twiny-suggestions" id="twiny-suggestions"></div>

      <div class="twiny-input-zone">
        <textarea id="twiny-input" placeholder="Posez votre question industrielle..."
          onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();TWINY.envoyer()}"
          rows="1"></textarea>
        <button type="button" class="twiny-send" onclick="TWINY.envoyer()">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M22 2L11 13M22 2L15 22L11 13L2 9L22 2Z" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
        </button>
      </div>`;
    document.body.appendChild(chat);

    // Message de bienvenue
    ajouterMessage('assistant', getMessageBienvenue());
    afficherSuggestions();
  };

  // ── Toggle chat ───────────────────────────────────────────
  const toggleChat = () => {
    isOpen = !isOpen;
    const chat = document.getElementById('twiny-chat');
    const btn = document.getElementById('twiny-btn');
    if (isOpen) {
      chat.classList.add('open');
      btn.classList.add('active');
      document.getElementById('twiny-input')?.focus();
    } else {
      chat.classList.remove('open');
      btn.classList.remove('active');
    }
  };

  const fermer = () => {
    isOpen = false;
    document.getElementById('twiny-chat')?.classList.remove('open');
    document.getElementById('twiny-btn')?.classList.remove('active');
  };

  // ── Afficher les suggestions ──────────────────────────────
  const afficherSuggestions = () => {
    const container = document.getElementById('twiny-suggestions');
    if (!container) return;
    const suggs = getSuggestions();
    container.innerHTML = suggs.map(s =>
      `<button type="button" class="twiny-sugg" onclick="TWINY.envoyerSuggestion('${s}')">${s}</button>`
    ).join('');
  };

  // ── Ajouter message ───────────────────────────────────────
  const ajouterMessage = (role, texte) => {
    const container = document.getElementById('twiny-messages');
    if (!container) return;

    const div = document.createElement('div');
    div.className = `twiny-msg twiny-msg-${role}`;

    // Formater le markdown basique
    const formatted = texte
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\n/g, '<br>');

    div.innerHTML = role === 'assistant'
      ? `<div class="twiny-avatar-sm">T</div><div class="twiny-bubble">${formatted}</div>`
      : `<div class="twiny-bubble">${formatted}</div>`;

    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
  };

  // ── Indicateur de frappe ──────────────────────────────────
  const afficherTyping = () => {
    const container = document.getElementById('twiny-messages');
    if (!container) return;
    const div = document.createElement('div');
    div.className = 'twiny-msg twiny-msg-assistant';
    div.id = 'twiny-typing';
    div.innerHTML = `<div class="twiny-avatar-sm">T</div>
      <div class="twiny-bubble twiny-typing-bubble">
        <span></span><span></span><span></span>
      </div>`;
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
  };

  const supprimerTyping = () => {
    document.getElementById('twiny-typing')?.remove();
  };

  // ── Envoyer message ───────────────────────────────────────
  const envoyer = async () => {
    const input = document.getElementById('twiny-input');
    if (!input) return;
    const texte = input.value.trim();
    if (!texte || isTyping) return;

    input.value = '';
    input.style.height = 'auto';

    // Cacher suggestions
    const suggs = document.getElementById('twiny-suggestions');
    if (suggs) suggs.style.display = 'none';

    ajouterMessage('user', texte);
    isTyping = true;
    afficherTyping();

    const reponse = await appellerIA(texte);
    supprimerTyping();
    ajouterMessage('assistant', reponse);
    isTyping = false;
  };

  const envoyerSuggestion = (texte) => {
    const input = document.getElementById('twiny-input');
    if (input) input.value = texte;
    envoyer();
  };

  const effacerChat = () => {
    messages = [];
    const container = document.getElementById('twiny-messages');
    if (container) container.innerHTML = '';
    ajouterMessage('assistant', getMessageBienvenue());
    afficherSuggestions();
    const suggs = document.getElementById('twiny-suggestions');
    if (suggs) suggs.style.display = 'flex';
  };

  // ── Init ──────────────────────────────────────────────────
  const init = () => {
    creerInterface();

    // Auto-resize textarea
    document.addEventListener('input', (e) => {
      if (e.target.id === 'twiny-input') {
        e.target.style.height = 'auto';
        e.target.style.height = Math.min(e.target.scrollHeight, 100) + 'px';
      }
    });
  };

  return { init, fermer, envoyer, envoyerSuggestion, effacerChat, validerSaisie };

})();

// Lancer TWINY après chargement
window.addEventListener('load', () => {
  setTimeout(() => TWINY.init(), 500);
});