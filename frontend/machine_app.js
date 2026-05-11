// ============================================================
//  TWIN MACHINE — machine_app.js
//  TWINOVA — Digital Twin Niveau 1
//  Backend : https://twinovaf.onrender.com
// ============================================================

const MACHINE_API = "http://localhost:8000";

// Cache local des machines
let allMachines = [];

// ============================================================
//  INIT — appelé quand l'onglet Twin Machine est ouvert
// ============================================================
async function initMachineModule() {
  await loadAllMachines();
  await loadMachineDashboard();
  populateMachineSelects();
  await syncComplet3D();
}

// ============================================================
//  CHARGEMENT DONNÉES
// ============================================================

async function loadAllMachines() {
  try {
    const token = localStorage.getItem("token");
    const res = await fetch(`${MACHINE_API}/machines/`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    allMachines = await res.json();
    renderMachinesListe(allMachines);
    renderParcVisuel(allMachines);
  } catch (err) {
    console.error("[TwinMachine] Erreur chargement machines:", err);
    showError("machines-liste-container", "Impossible de charger les machines. Vérifiez la connexion.");
  }
}

async function loadMachineDashboard() {
  try {
    const token = localStorage.getItem("token");
    const res = await fetch(`${MACHINE_API}/machines/dashboard/global`, {
      headers: { "Authorization": `Bearer ${token}` }
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    renderDashboardKPIs(data);
    renderAlertesActives(data);
  } catch (err) {
    // Fallback : calcul local depuis allMachines
    if (allMachines.length > 0) {
      renderDashboardKPIsLocal(allMachines);
      renderAlertesActivesLocal(allMachines);
    } else {
      showError("alertes-container", "Impossible de charger le dashboard.");
    }
  }
}

async function loadMaintenance() {
  const machineId = document.getElementById("maint-machine-select").value;
  if (!machineId) return;

  try {
    const token = localStorage.getItem("token");
    const res = await fetch(`${MACHINE_API}/machines/${machineId}/maintenances`, {
      headers: { "Authorization": `Bearer ${token}` }
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    renderMaintenanceTable(data);
  } catch (err) {
    document.getElementById("maintenance-container").innerHTML =
      `<p class="info-text"><i class="fas fa-info-circle"></i> Aucun historique de maintenance disponible.</p>`;
  }
}

// ============================================================
//  RENDER — DASHBOARD KPIs (depuis /dashboard/global)
// ============================================================
function renderDashboardKPIs(data) {
  setKPI("kpi-hsi-moyen",     formatVal(data.hsi_moyen, 0) + "%");
  setKPI("kpi-en-marche",     data.machines_en_marche ?? "--");
  setKPI("kpi-maintenance",   data.machines_en_maintenance ?? "--");
  setKPI("kpi-alertes",       data.total_alertes ?? "--");
  setKPI("kpi-dispo-moyenne", formatVal(data.disponibilite_moyenne, 1) + "%");
  setKPI("kpi-rul-min",       formatVal(data.rul_min, 0) + " h");
}

// Fallback calcul local
function renderDashboardKPIsLocal(machines) {
  const hsiVals   = machines.map(m => m.hsi).filter(v => v != null);
  const dispos    = machines.map(m => m.taux_disponibilite).filter(v => v != null);
  const ruls      = machines.map(m => m.rul_heures).filter(v => v != null);
  const alertes   = machines.reduce((acc, m) => acc + (m.alertes ? m.alertes.length : 0), 0);

  const avg = arr => arr.length ? (arr.reduce((a,b)=>a+b,0)/arr.length) : 0;

  setKPI("kpi-hsi-moyen",     formatVal(avg(hsiVals), 0) + "%");
  setKPI("kpi-en-marche",     machines.filter(m => m.statut === "en_marche").length);
  setKPI("kpi-maintenance",   machines.filter(m => m.statut === "maintenance").length);
  setKPI("kpi-alertes",       alertes);
  setKPI("kpi-dispo-moyenne", formatVal(avg(dispos), 1) + "%");
  setKPI("kpi-rul-min",       formatVal(Math.min(...ruls), 0) + " h");
}

function setKPI(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

// ============================================================
//  RENDER — ALERTES ACTIVES
// ============================================================
function renderAlertesActives(data) {
  const container = document.getElementById("alertes-container");
  // Rassemble les alertes depuis allMachines car le dashboard peut ne pas les inclure
  renderAlertesActivesLocal(allMachines);
}

function renderAlertesActivesLocal(machines) {
  const container = document.getElementById("alertes-container");
  const alertesMachines = machines.filter(m => m.alertes && m.alertes.length > 0);

  if (alertesMachines.length === 0) {
    container.innerHTML = `<p class="no-data-text"><i class="fas fa-check-circle" style="color:#00d084"></i> Aucune alerte active — Parc en bonne santé</p>`;
    return;
  }

  let html = "";
  alertesMachines.forEach(m => {
    m.alertes.forEach(a => {
      const niveauClass = m.niveau_alerte === "critique" ? "alerte-critique" : "alerte-attention";
      const icon = m.niveau_alerte === "critique" ? "fa-exclamation-circle" : "fa-exclamation-triangle";
      html += `
        <div class="alerte-row ${niveauClass}">
          <i class="fas ${icon}"></i>
          <span class="alerte-machine">${m.nom} (${m.code_machine})</span>
          <span class="alerte-msg">${a.message}</span>
          <span class="alerte-type badge-type">${a.type}</span>
        </div>`;
    });
  });
  container.innerHTML = html;
}

// ============================================================
//  RENDER — PARC VISUEL (cartes statut)
// ============================================================
function renderParcVisuel(machines) {
  const grid = document.getElementById("parc-visuel-grid");
  if (!grid) return;

  grid.innerHTML = machines.map(m => {
    const { couleur, icone, label } = getStatutInfo(m.statut);
    const niveauBadge = m.niveau_alerte !== "aucune"
      ? `<span class="badge-alerte badge-${m.niveau_alerte}">${(m.niveau_alerte || '').toUpperCase()}</span>`
      : "";
    return `
      <div class="parc-card parc-${m.statut}" onclick="ouvrirFiche(${m.id})">
        <div class="parc-card-header">
          <span class="parc-icone" style="color:${couleur}"><i class="fas ${icone}"></i></span>
          <span class="parc-statut-dot" style="background:${couleur}"></span>
        </div>
        <div class="parc-card-body">
          <div class="parc-nom">${m.nom}</div>
          <div class="parc-code">${m.code_machine}</div>
          <div class="parc-statut-label" style="color:${couleur}">${label}</div>
          ${niveauBadge}
          <div class="parc-hsi">HSI : <strong>${m.hsi ?? "--"}%</strong></div>
        </div>
      </div>`;
  }).join("");
}

// ============================================================
//  RENDER — LISTE MACHINES (tableau)
// ============================================================
function renderMachinesListe(machines) {
  const container = document.getElementById("machines-liste-container");
  if (machines.length === 0) {
    container.innerHTML = `<p class="no-data-text">Aucune machine trouvée.</p>`;
    return;
  }

  const rows = machines.map(m => {
    const { couleur, label } = getStatutInfo(m.statut);
    const alertIcon = m.niveau_alerte === "critique"
      ? `<i class="fas fa-exclamation-circle" style="color:#ff4444"></i>`
      : m.niveau_alerte === "attention"
      ? `<i class="fas fa-exclamation-triangle" style="color:#ffaa00"></i>`
      : `<i class="fas fa-check-circle" style="color:#00d084"></i>`;

    return `
      <tr onclick="ouvrirFiche(${m.id})" style="cursor:pointer;">
        <td><span class="statut-dot" style="background:${couleur}"></span>${m.code_machine}</td>
        <td>${m.nom}</td>
        <td>${m.categorie}</td>
        <td><span class="badge-statut" style="background:${couleur}20;color:${couleur};border:1px solid ${couleur}40">${label}</span></td>
        <td>${m.hsi ?? "--"}%</td>
        <td>${m.taux_disponibilite ?? "--"}%</td>
        <td>${m.rul_heures ?? "--"} h</td>
        <td>${alertIcon} ${m.niveau_alerte}</td>
        <td>${m.operateur ?? "--"}</td>
        <td>
          <button class="btn-sm btn-primary" onclick="event.stopPropagation(); ouvrirFiche(${m.id})">
            <i class="fas fa-eye"></i> Fiche
          </button>
          <button class="btn-sm btn-secondary" onclick="event.stopPropagation(); ouvrirSaisie(${m.id})">
            <i class="fas fa-edit"></i> Saisir
          </button>
        </td>
      </tr>`;
  }).join("");

  container.innerHTML = `
    <table class="machine-table">
      <thead>
        <tr>
          <th>Code</th>
          <th>Nom</th>
          <th>Catégorie</th>
          <th>Statut</th>
          <th>HSI</th>
          <th>Dispo.</th>
          <th>RUL</th>
          <th>Alerte</th>
          <th>Opérateur</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`;
}

// ============================================================
//  FICHE DÉTAILLÉE MACHINE
// ============================================================
async function ouvrirFiche(machineId) {
  switchMachineTab("liste");

  try {
    const token = localStorage.getItem("token");
    const res = await fetch(`${MACHINE_API}/machines/${machineId}`, {
      headers: { "Authorization": `Bearer ${token}` }
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const m = await res.json();
    renderFiche(m);
  } catch (err) {
    // Fallback : chercher dans le cache local
    const m = allMachines.find(x => x.id === machineId);
    if (m) renderFiche(m);
    else showError("machine-fiche", "Impossible de charger la fiche.");
  }
}

// ================================================================
//  TWINOVA — FICHE MACHINE COMPLÈTE
//  Remplacez les fonctions ouvrirFiche() et renderFiche()
//  dans machine_app.js par ce code
// ================================================================

async function ouvrirFiche(machineId) {
  switchMachineTab('liste');

  const ficheEl = document.getElementById('machine-fiche');
  ficheEl.style.display = 'block';
  document.getElementById('fiche-nom').textContent = 'Chargement...';
  document.getElementById('fiche-content').innerHTML = `
    <div style="text-align:center;padding:40px;color:#888">
      <i class="fas fa-spinner fa-spin" style="font-size:2rem;color:#00d084"></i>
      <p style="margin-top:12px">Chargement de la fiche machine...</p>
    </div>`;

  try {
    const res = await fetch(`${MACHINE_API}/machines/${machineId}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    renderFiche(data);
  } catch (err) {
    document.getElementById('fiche-content').innerHTML =
      `<p style="color:#ff8888;padding:20px"><i class="fas fa-times-circle"></i> Erreur : ${err.message}</p>`;
  }

  ficheEl.scrollIntoView({ behavior: 'smooth' });
}

function renderFiche(data) {
  const m        = data.machine;
  const saisies  = data.historique_saisies || [];
  const maints   = data.maintenances || [];
  const derniere = saisies[0] || null;

  document.getElementById('fiche-nom').textContent = m.nom;

  // ── Statut et couleurs ──────────────────────────────────────
  const statutInfo = getStatutInfo(m.statut);
  const hsi        = derniere?.hsi ?? null;
  const hsiColor   = hsi === null ? '#888' : hsi >= 75 ? '#00d084' : hsi >= 55 ? '#ffaa00' : '#ff3333';
  const niveauAlerte = derniere?.niveau_alerte ?? 'aucune';

  // ── Alertes ─────────────────────────────────────────────────
  const alertes = derniere?.alertes || [];
  const alertesHtml = alertes.length > 0
    ? alertes.map(a => `
        <div class="fiche-alerte fiche-alerte-${a.gravite || 'attention'}">
          <i class="fas fa-exclamation-triangle"></i>
          <div>
            <div class="fiche-alerte-msg">${a.message}</div>
            <div class="fiche-alerte-type">${a.type?.toUpperCase() || ''}</div>
          </div>
        </div>`).join('')
    : `<div class="fiche-ok"><i class="fas fa-check-circle"></i> Aucune alerte — Machine en bonne santé</div>`;

  // ── Prévision panne ─────────────────────────────────────────
  const rul = derniere?.rul_heures;
  let previsionHtml = '';
  if (rul !== null && rul !== undefined) {
    const rulJours = Math.round(rul / 8);
    const couleurRul = rul < 500 ? '#ff3333' : rul < 2000 ? '#ffaa00' : '#00d084';
    const iconRul    = rul < 500 ? 'fa-skull-crossbones' : rul < 2000 ? 'fa-exclamation-triangle' : 'fa-check-circle';
    const msgRul     = rul < 500
      ? 'Maintenance URGENTE requise'
      : rul < 2000
      ? 'Planifier une maintenance prochainement'
      : 'Machine en bonne santé prévisionnelle';

    previsionHtml = `
      <div class="fiche-prevision" style="border-left-color:${couleurRul}">
        <div class="fiche-prev-header">
          <i class="fas ${iconRul}" style="color:${couleurRul}"></i>
          <span style="color:${couleurRul};font-weight:700">Prévision de panne</span>
        </div>
        <div class="fiche-prev-rul">
          <span class="fiche-prev-val" style="color:${couleurRul}">${rul.toLocaleString()} h</span>
          <span class="fiche-prev-label">soit ~${rulJours} jours restants</span>
        </div>
        <div class="fiche-prev-msg">${msgRul}</div>
      </div>`;
  }

  // ── Historique saisies (tableau) ────────────────────────────
  const historiqueHtml = saisies.length > 0
    ? `<table class="fiche-hist-table">
        <thead>
          <tr>
            <th>Date</th><th>Statut</th><th>Temp.</th>
            <th>Vibration</th><th>HSI</th><th>RUL</th><th>Alerte</th><th>Opérateur</th>
          </tr>
        </thead>
        <tbody>
          ${saisies.slice(0, 10).map(s => {
            const sc = s.niveau_alerte === 'critique' ? '#ff3333'
                     : s.niveau_alerte === 'attention' ? '#ffaa00' : '#00d084';
            return `<tr>
              <td>${new Date(s.date_saisie).toLocaleString('fr-FR')}</td>
              <td><span style="color:${getStatutInfo(s.statut).couleur}">${getStatutInfo(s.statut).label}</span></td>
              <td>${s.temperature != null ? s.temperature + '°C' : '--'}</td>
              <td>${s.vibration   != null ? s.vibration   + ' mm/s' : '--'}</td>
              <td style="color:${s.hsi >= 75 ? '#00d084' : s.hsi >= 55 ? '#ffaa00' : '#ff3333'};font-weight:700">
                ${s.hsi != null ? s.hsi + '%' : '--'}</td>
              <td>${s.rul_heures  != null ? s.rul_heures.toLocaleString() + ' h' : '--'}</td>
              <td style="color:${sc}">${s.niveau_alerte}</td>
              <td>${s.operateur || '--'}</td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>`
    : `<p style="color:#888;padding:20px;text-align:center">Aucune saisie enregistrée</p>`;

  // ── Maintenances ────────────────────────────────────────────
  const maintsHtml = maints.length > 0
    ? maints.map(mt => {
        const c = mt.type_maintenance === 'corrective' ? '#ff3333'
                : mt.type_maintenance === 'predictive' ? '#ffaa00' : '#4fc3f7';
        return `<div class="fiche-maint-item">
          <span class="fiche-maint-badge" style="background:${c}20;color:${c};border:1px solid ${c}40">
            ${mt.type_maintenance}
          </span>
          <div class="fiche-maint-info">
            <div class="fiche-maint-titre">${mt.titre || mt.description || '--'}</div>
            <div class="fiche-maint-date">
              📅 ${mt.date_planifiee ? new Date(mt.date_planifiee).toLocaleDateString('fr-FR') : '--'}
              · 👨‍🔧 ${mt.technicien || '--'}
              · 💰 ${mt.cout_dza ? mt.cout_dza.toLocaleString() + ' DZD' : '--'}
            </div>
          </div>
          <span class="fiche-maint-statut fiche-maint-${mt.statut}">${mt.statut}</span>
        </div>`;
      }).join('')
    : `<p style="color:#888;padding:16px;text-align:center">Aucune maintenance enregistrée</p>`;

  // ── Rendu final ─────────────────────────────────────────────
  document.getElementById('fiche-content').innerHTML = `

    <!-- BANDEAU STATUT -->
    <div class="fiche-statut-banner" style="background:${statutInfo.couleur}15;border:1px solid ${statutInfo.couleur}40">
      <div class="fiche-statut-left">
        <span class="fiche-statut-dot" style="background:${statutInfo.couleur}"></span>
        <span class="fiche-statut-label" style="color:${statutInfo.couleur}">${statutInfo.label.toUpperCase()}</span>
        <span class="fiche-statut-code">${m.code_machine}</span>
      </div>
      <div class="fiche-statut-right">
        <span class="fiche-alerte-badge fiche-alerte-niveau-${niveauAlerte}">
          ${niveauAlerte === 'aucune' ? '✅ Normal' : niveauAlerte === 'attention' ? '⚠️ Attention' : '🔴 Critique'}
        </span>
        <button class="btn-saisir-fiche" onclick="ouvrirSaisie(${m.id})">
          <i class="fas fa-edit"></i> Nouvelle saisie
        </button>
      </div>
    </div>

    <!-- GRILLE PRINCIPALE -->
    <div class="fiche-main-grid">

      <!-- COLONNE GAUCHE -->
      <div class="fiche-col-left">

        <!-- KPIs principaux -->
        <div class="fiche-kpis-row">
          <div class="fiche-kpi-big">
            <div class="fiche-kpi-big-val" style="color:${hsiColor}">${hsi ?? '--'}<span>%</span></div>
            <div class="fiche-kpi-big-label">HSI</div>
            <div class="fiche-kpi-big-sub">Health Score Index</div>
          </div>
          <div class="fiche-kpi-big">
            <div class="fiche-kpi-big-val" style="color:#4fc3f7">${derniere?.taux_disponibilite ?? '--'}<span>%</span></div>
            <div class="fiche-kpi-big-label">Disponibilité</div>
            <div class="fiche-kpi-big-sub">Dernière saisie</div>
          </div>
          <div class="fiche-kpi-big">
            <div class="fiche-kpi-big-val" style="color:#ab47bc">${rul != null ? Math.round(rul / 8) : '--'}<span> j</span></div>
            <div class="fiche-kpi-big-label">RUL</div>
            <div class="fiche-kpi-big-sub">Jours restants</div>
          </div>
          <div class="fiche-kpi-big">
            <div class="fiche-kpi-big-val" style="color:#ff6b35">${derniere?.temperature ?? '--'}<span>°C</span></div>
            <div class="fiche-kpi-big-label">Température</div>
            <div class="fiche-kpi-big-sub">Dernière mesure</div>
          </div>
        </div>

        <!-- Prévision panne -->
        ${previsionHtml}
${genererRecommandations(m, derniere)}
        <!-- Alertes -->
        <div class="fiche-section">
          <div class="fiche-section-title"><i class="fas fa-bell"></i> Alertes Actives</div>
          ${alertesHtml}
        </div>

        <!-- Monitoring dernière saisie -->
        <div class="fiche-section">
          <div class="fiche-section-title"><i class="fas fa-wave-square"></i> Dernière Saisie Monitoring</div>
          ${derniere ? `
          <div class="fiche-monitoring-grid">
            ${renderMonitItem('Pression',    derniere.pression,    'bar',   '#4fc3f7')}
            ${renderMonitItem('Vibration',   derniere.vibration,   'mm/s',  '#ab47bc')}
            ${renderMonitItem('Courant',     derniere.courant_ampere, 'A',  '#ffa726')}
            ${renderMonitItem('Consommation',derniere.consommation_kwh,'kWh','#66bb6a')}
            ${renderMonitItem('Heures fonct.',derniere.heures_fonctionnement,'h','#26a69a')}
            ${renderMonitItem('Production',  derniere.production_heure,'/h', '#ff7043')}
          </div>
          <div style="margin-top:8px;font-size:0.78rem;color:#888">
            <i class="fas fa-user"></i> ${derniere.operateur || '--'} &nbsp;·&nbsp;
            <i class="fas fa-clock"></i> ${new Date(derniere.date_saisie).toLocaleString('fr-FR')}
          </div>` : '<p style="color:#888;font-size:0.85rem">Aucune saisie disponible</p>'}
        </div>

      </div>

      <!-- COLONNE DROITE -->
      <div class="fiche-col-right">

        <!-- Identité machine -->
        <div class="fiche-section">
          <div class="fiche-section-title"><i class="fas fa-id-card"></i> Identité Machine</div>
          <table class="fiche-identite-table">
            <tr><td>Catégorie</td><td>${m.categorie}</td></tr>
            <tr><td>Marque</td><td>${m.marque ?? '--'}</td></tr>
            <tr><td>Modèle</td><td>${m.modele ?? '--'}</td></tr>
            <tr><td>N° Série</td><td>${m.numero_serie ?? '--'}</td></tr>
            <tr><td>Année install.</td><td>${m.annee_installation ?? '--'}</td></tr>
            <tr><td>Durée de vie</td><td>${m.duree_vie_ans ?? '--'} ans</td></tr>
            <tr><td>Puissance</td><td>${m.puissance_kw ?? '--'} kW</td></tr>
            <tr><td>Capacité max</td><td>${m.capacite_max ?? '--'} ${m.unite_capacite ?? ''}</td></tr>
            <tr><td>Temp. max</td><td>${m.temperature_max ?? '--'}°C</td></tr>
            <tr><td>Pression max</td><td>${m.pression_max_bar ?? '--'} bar</td></tr>
            <tr><td>Localisation</td><td>${m.localisation ?? '--'}</td></tr>
          </table>
        </div>

        <!-- Maintenances -->
        <div class="fiche-section">
          <div class="fiche-section-title">
            <i class="fas fa-tools"></i> Maintenances
            <button class="btn-sm-add" onclick="switchMachineTab('maintenance')">
              + Planifier
            </button>
          </div>
          ${maintsHtml}
        </div>

      </div>
    </div>

    <!-- HISTORIQUE SAISIES -->
    <div class="fiche-section" style="margin-top:16px">
      <div class="fiche-section-title"><i class="fas fa-history"></i> Historique des Saisies (10 dernières)</div>
      <div style="overflow-x:auto">${historiqueHtml}</div>
    </div>
  `;
}

function renderMonitItem(label, val, unite, couleur) {
  if (val == null) return `
    <div class="fiche-monit-item">
      <div class="fiche-monit-label">${label}</div>
      <div class="fiche-monit-val" style="color:#555">--</div>
    </div>`;
  return `
    <div class="fiche-monit-item">
      <div class="fiche-monit-label">${label}</div>
      <div class="fiche-monit-val" style="color:${couleur}">${val} <span style="font-size:0.75rem">${unite}</span></div>
    </div>`;
}

function renderMonitoringItem(label, val, unite, couleur) {
  if (val == null) return `<div class="monitoring-item"><div class="mon-label">${label}</div><div class="mon-val" style="color:#555">--</div></div>`;
  return `<div class="monitoring-item"><div class="mon-label">${label}</div><div class="mon-val" style="color:${couleur}">${val} ${unite}</div></div>`;
}

function fermerFiche() {
  document.getElementById("machine-fiche").style.display = "none";
}

// ============================================================
//  SAISIE MONITORING — FORMULAIRE
// ============================================================
function ouvrirSaisie(machineId) {
  switchMachineTab("saisie");
  if (machineId) {
    document.getElementById("saisie-machine-id").value = machineId;
  }
}

function onSelectMachine() {
  const id = parseInt(document.getElementById("saisie-machine-id").value);
  const m = allMachines.find(x => x.id === id);
  if (m && m.operateur) {
    document.getElementById("saisie-operateur").value = m.operateur;
  }
}

function resetSaisieForm() {
  ["saisie-machine-id","saisie-operateur","saisie-statut",
   "saisie-temperature","saisie-pression","saisie-vibration",
   "saisie-vitesse","saisie-courant","saisie-consommation",
   "saisie-heures","saisie-cycles","saisie-production","saisie-notes"]
    .forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = "";
    });
  hideSaisieMessage();
}

async function soumettreMonitoring() {
  const machineId = document.getElementById("saisie-machine-id").value;
  const operateur = document.getElementById("saisie-operateur").value.trim();

  if (!machineId) { showSaisieMessage("Veuillez sélectionner une machine.", "error"); return; }
  if (!operateur)  { showSaisieMessage("Veuillez saisir le nom de l'opérateur.", "error"); return; }

  const payload = {
    statut:                document.getElementById("saisie-statut").value       || null,
    operateur,
    temperature:           parseFloatOrNull("saisie-temperature"),
    pression:              parseFloatOrNull("saisie-pression"),
    vibration:             parseFloatOrNull("saisie-vibration"),
    vitesse_reelle:        parseFloatOrNull("saisie-vitesse"),
    courant_ampere:        parseFloatOrNull("saisie-courant"),
    consommation_kwh:      parseFloatOrNull("saisie-consommation"),
    heures_fonctionnement: parseFloatOrNull("saisie-heures"),
    nombre_cycles:         parseIntOrNull("saisie-cycles"),
    production_heure:      parseFloatOrNull("saisie-production"),
    notes:                 document.getElementById("saisie-notes").value.trim() || null
  };

  try {
    const token = localStorage.getItem("token");
    const res = await fetch(`${MACHINE_API}/machines/${machineId}/saisie`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || `HTTP ${res.status}`);
    }

    showSaisieMessage("✅ Saisie enregistrée avec succès !", "success");
    resetSaisieForm();

    // Recharger le cache machines
    await loadAllMachines();
    await loadMachineDashboard();

    // Synchroniser la 3D si disponible
    syncMachines3D();

  } catch (err) {
    showSaisieMessage(`❌ Erreur : ${err.message}`, "error");
  }
}

// ============================================================
//  MAINTENANCE — FORMULAIRE
// ============================================================
async function planifierMaintenance() {
  const machineId   = document.getElementById("maint-form-machine").value;
  const type        = document.getElementById("maint-type").value;
  const datePlan    = document.getElementById("maint-date").value;
  const description = document.getElementById("maint-description").value.trim();
  const technicien  = document.getElementById("maint-technicien").value.trim();
  const duree       = parseFloat(document.getElementById("maint-duree").value) || null;
  const cout        = parseFloat(document.getElementById("maint-cout").value)  || null;

  if (!machineId) { showMaintMessage("Veuillez sélectionner une machine.", "error"); return; }
  if (!datePlan)  { showMaintMessage("Veuillez choisir une date.", "error"); return; }

  const payload = { type_maintenance: type, date_planifiee: datePlan, description, technicien, duree_heures: duree, cout_estime: cout };

  try {
    const token = localStorage.getItem("token");
    const res = await fetch(`${MACHINE_API}/machines/${machineId}/maintenances`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    showMaintMessage("✅ Maintenance planifiée avec succès !", "success");
    loadMaintenance();
  } catch (err) {
    showMaintMessage(`❌ Erreur : ${err.message}`, "error");
  }
}

function renderMaintenanceTable(data) {
  const container = document.getElementById("maintenance-container");
  if (!data || data.length === 0) {
    container.innerHTML = `<p class="no-data-text">Aucune maintenance enregistrée pour cette machine.</p>`;
    return;
  }

  const rows = data.map(m => `
    <tr>
      <td>${m.date_planifiee ?? "--"}</td>
      <td>${m.date_realisee  ?? "<span style='color:#aaa'>Non réalisée</span>"}</td>
      <td><span class="badge-type badge-${m.type_maintenance}">${m.type_maintenance}</span></td>
      <td>${m.statut ?? "--"}</td>
      <td>${m.technicien ?? "--"}</td>
      <td>${m.duree_heures ?? "--"} h</td>
      <td>${m.cout_reel != null ? m.cout_reel.toLocaleString() + " DZD" : "--"}</td>
      <td>${m.description ?? "--"}</td>
    </tr>`).join("");

  container.innerHTML = `
    <table class="machine-table">
      <thead>
        <tr>
          <th>Date planifiée</th><th>Date réalisée</th><th>Type</th>
          <th>Statut</th><th>Technicien</th><th>Durée</th><th>Coût</th><th>Description</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`;
}

// ============================================================
//  FILTRES
// ============================================================
function filterMachines() {
  const statut = document.getElementById("filter-statut").value;
  const alerte = document.getElementById("filter-alerte").value;
  let filtered = [...allMachines];
  if (statut) filtered = filtered.filter(m => m.statut === statut);
  if (alerte) filtered = filtered.filter(m => m.niveau_alerte === alerte);
  renderMachinesListe(filtered);
}

// ============================================================
//  CONNEXION 3D — Synchroniser couleurs Three.js
// ============================================================
function syncMachines3D() {
  if (typeof updateMachineColors3D === "function") {
    const statusMap = {};
    allMachines.forEach(m => { statusMap[m.code_machine] = m.statut; });
    updateMachineColors3D(statusMap);
  }
}

// Couleur par statut (utilisé dans la 3D et les badges)
function getMachineColor3D(statut) {
  const colors = {
    "en_marche":   0x00d084,   // vert
    "arret":       0x888888,   // gris
    "maintenance": 0xffaa00,   // orange
    "panne":       0xff3333    // rouge
  };
  return colors[statut] ?? 0x888888;
}

// ============================================================
//  NAVIGATION ONGLETS
// ============================================================
function switchMachineTab(tab) {
  document.querySelectorAll(".machine-tab").forEach(btn => btn.classList.remove("active"));
  document.querySelectorAll(".machine-tab-content").forEach(el => el.style.display = "none");

  document.getElementById(`machine-tab-${tab}`).style.display = "block";

  const idx = ["dashboard","liste","saisie","maintenance"].indexOf(tab);
  const tabs = document.querySelectorAll(".machine-tab");
  if (tabs[idx]) tabs[idx].classList.add("active");
}

// ============================================================
//  POPULATE SELECTS
// ============================================================
function populateMachineSelects() {
  const selects = ["saisie-machine-id","maint-machine-select","maint-form-machine"];
  selects.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.innerHTML = `<option value="">-- Choisir une machine --</option>` +
      allMachines.map(m => `<option value="${m.id}">${m.nom} (${m.code_machine})</option>`).join("");
  });
}

// ============================================================
//  HELPERS
// ============================================================
function getStatutInfo(statut) {
  const map = {
    "en_marche":   { couleur: "#00d084", icone: "fa-play-circle",          label: "En marche"   },
    "arret":       { couleur: "#888888", icone: "fa-stop-circle",           label: "Arrêt"        },
    "maintenance": { couleur: "#ffaa00", icone: "fa-tools",                 label: "Maintenance"  },
    "panne":       { couleur: "#ff3333", icone: "fa-exclamation-circle",    label: "Panne"        }
  };
  return map[statut] ?? { couleur: "#888888", icone: "fa-question-circle", label: statut };
}

function getHSIColor(hsi) {
  if (hsi == null) return "#888";
  if (hsi >= 80) return "#00d084";
  if (hsi >= 60) return "#ffaa00";
  return "#ff3333";
}

function formatVal(val, decimals) {
  if (val == null || isNaN(val)) return "--";
  return Number(val).toFixed(decimals);
}

function parseFloatOrNull(id) {
  const v = document.getElementById(id)?.value;
  return (v === "" || v == null) ? null : parseFloat(v);
}

function parseIntOrNull(id) {
  const v = document.getElementById(id)?.value;
  return (v === "" || v == null) ? null : parseInt(v);
}

function showError(containerId, msg) {
  const el = document.getElementById(containerId);
  if (el) el.innerHTML = `<p class="error-text"><i class="fas fa-times-circle"></i> ${msg}</p>`;
}

function showSaisieMessage(msg, type) {
  const el = document.getElementById("saisie-message");
  el.style.display = "block";
  el.className = `saisie-message msg-${type}`;
  el.innerHTML = msg;
  setTimeout(hideSaisieMessage, 5000);
}

function hideSaisieMessage() {
  const el = document.getElementById("saisie-message");
  if (el) el.style.display = "none";
}

function showMaintMessage(msg, type) {
  const el = document.getElementById("maint-message");
  el.style.display = "block";
  el.className = `saisie-message msg-${type}`;
  el.innerHTML = msg;
  setTimeout(() => { el.style.display = "none"; }, 5000);
}
// ============================================================
//  AJOUT DANS machine_app.js
//  Ajoutez ces fonctions à la fin du fichier
//  Et modifiez initMachineModule() comme indiqué
// ============================================================

// ── 1. MODIFIEZ initMachineModule() — ajoutez syncComplet3D() à la fin ──
// 
// async function initMachineModule() {
//   await loadAllMachines();
//   await loadMachineDashboard();
//   populateMachineSelects();
//   await syncComplet3D();   // ← AJOUTEZ CETTE LIGNE
// }

// ── 2. AJOUTEZ ces fonctions à la fin de machine_app.js ──────────────────

// Synchronisation complète machines + produits → 3D
async function syncComplet3D() {
  try {
    const res = await fetch(`${MACHINE_API}/machines/`);
    if (!res.ok) return;
    const machines = await res.json();
    
    if (typeof updateMachinesData3D === 'function') {
      updateMachinesData3D(machines);
      // Sync produits
try {
  const lotsRes = await fetch(`https://twinovaf.onrender.com/lots/2`);
  if (lotsRes.ok) {
    const lotsData = await lotsRes.json();
    const lots = Array.isArray(lotsData) ? lotsData : (lotsData.lots || []);
    if (typeof updateProduitsData3D === 'function') {
      updateProduitsData3D(lots);
    }
  }
} catch(e) {}
    }
  } catch (err) {
    console.warn('[TwinMachine] Sync 3D:', err.message);
  }
}

// Charger et envoyer les produits/recettes vers la 3D
async function syncProduits3D() {
  try {
    const res = await fetch(`${MACHINE_API}/recettes/`);
    if (!res.ok) return;
    const recettes = await res.json();
    if (typeof updateProduitsData3D === 'function') {
      updateProduitsData3D(recettes);
    }
  } catch (err) {
    // Silencieux — les produits gardent leurs données statiques
  }
}

// Appelé après chaque saisie monitoring (déjà dans soumettreMonitoring)
function syncMachines3D() {
  if (allMachines.length > 0 && typeof updateMachinesData3D === 'function') {
    updateMachinesData3D(allMachines);
  }
}
// ================================================================
//  BLOC RECOMMANDATIONS — À ajouter dans renderFiche()
//  Dans fiche_machine_complete.js, cherchez :
//  "<!-- Alertes -->"
//  et ajoutez ce bloc JUSTE AVANT
// ================================================================

// Copiez cette fonction dans machine_app.js
// et appelez renderRecommandations(m, derniere) dans renderFiche()

function genererRecommandations(m, derniere) {
  if (!derniere) return '';

  const hsi     = derniere.hsi ?? 100;
  const rul     = derniere.rul_heures;
  const vibr    = derniere.vibration;
  const temp    = derniere.temperature;
  const dispo   = derniere.taux_disponibilite;
  const alertes = derniere.alertes || [];
  const niveau  = derniere.niveau_alerte;

  const recos = [];

  // ── Règle 1 : HSI critique ──────────────────────────────────
  if (hsi < 35) {
    recos.push({
      priorite: 1,
      urgence: 'URGENT',
      couleur: '#ff3333',
      icon: 'fa-skull-crossbones',
      titre: 'Arrêt machine recommandé',
      detail: `HSI à ${hsi}% — risque de casse imminente. Arrêter la machine et appeler le technicien immédiatement.`,
      action: 'Planifier maintenance corrective',
      coutEvite: Math.round((m.puissance_kw || 10) * 8760 * 0.15 * 45),
      delai: 'Immédiatement'
    });
  } else if (hsi < 55) {
    recos.push({
      priorite: 1,
      urgence: 'CRITIQUE',
      couleur: '#ff3333',
      icon: 'fa-exclamation-circle',
      titre: 'Maintenance corrective urgente',
      detail: `HSI à ${hsi}% — dégradation avancée détectée. Intervention technique requise sous 48h.`,
      action: 'Planifier maintenance corrective',
      coutEvite: Math.round((m.puissance_kw || 10) * 24 * 45 * 3),
      delai: 'Sous 48h'
    });
  } else if (hsi < 75) {
    recos.push({
      priorite: 2,
      urgence: 'ATTENTION',
      couleur: '#ffaa00',
      icon: 'fa-exclamation-triangle',
      titre: 'Maintenance préventive à planifier',
      detail: `HSI à ${hsi}% — usure détectée. Planifier une intervention avant dégradation critique.`,
      action: 'Planifier maintenance préventive',
      coutEvite: Math.round((m.puissance_kw || 10) * 8 * 45 * 5),
      delai: 'Dans les 2 semaines'
    });
  }

  // ── Règle 2 : RUL faible ───────────────────────────────────
  if (rul !== null && rul !== undefined) {
    if (rul < 500) {
      recos.push({
        priorite: 1,
        urgence: 'URGENT',
        couleur: '#ff3333',
        icon: 'fa-hourglass-end',
        titre: `RUL critique : ${rul}h restantes`,
        detail: `La machine atteindra sa limite de durée de vie dans ${Math.round(rul/8)} jours. Préparer le remplacement.`,
        action: 'Commander pièces de rechange',
        coutEvite: Math.round(rul * 45 * 2),
        delai: 'Sous 48h'
      });
    } else if (rul < 2000) {
      recos.push({
        priorite: 2,
        urgence: 'ATTENTION',
        couleur: '#ffaa00',
        icon: 'fa-hourglass-half',
        titre: `RUL à surveiller : ${rul.toLocaleString()}h restantes`,
        detail: `Environ ${Math.round(rul/8)} jours avant maintenance majeure. Planifier à l'avance.`,
        action: 'Planifier maintenance préventive',
        coutEvite: Math.round(rul * 45),
        delai: `Dans ${Math.round(rul/8/7)} semaines`
      });
    }
  }

  // ── Règle 3 : Vibration élevée ─────────────────────────────
  if (vibr !== null && vibr !== undefined) {
    if (vibr > 4.5) {
      recos.push({
        priorite: 1,
        urgence: 'CRITIQUE',
        couleur: '#ff3333',
        icon: 'fa-wave-square',
        titre: `Vibration dangereuse : ${vibr} mm/s`,
        detail: 'Vibration au-delà du seuil ISO 10816 (4.5 mm/s). Vérifier roulements, courroies et boulonnerie.',
        action: 'Inspection mécanique immédiate',
        coutEvite: 85000,
        delai: 'Immédiatement'
      });
    } else if (vibr > 2.8) {
      recos.push({
        priorite: 2,
        urgence: 'ATTENTION',
        couleur: '#ffaa00',
        icon: 'fa-wave-square',
        titre: `Vibration élevée : ${vibr} mm/s`,
        detail: 'Vibration au-dessus du seuil normal (2.8 mm/s). Surveiller et planifier inspection.',
        action: 'Inspection préventive à planifier',
        coutEvite: 35000,
        delai: 'Dans la semaine'
      });
    }
  }

  // ── Règle 4 : Température hors limite ──────────────────────
  if (temp !== null && temp !== undefined && m.temperature_max) {
    if (temp > m.temperature_max) {
      recos.push({
        priorite: 1,
        urgence: 'CRITIQUE',
        couleur: '#ff3333',
        icon: 'fa-thermometer-full',
        titre: `Température hors limite : ${temp}°C > ${m.temperature_max}°C`,
        detail: 'Risque de détérioration du process et des composants. Vérifier le système de refroidissement.',
        action: 'Vérifier circuit de refroidissement',
        coutEvite: 120000,
        delai: 'Immédiatement'
      });
    }
  }

  // ── Règle 5 : Disponibilité faible ─────────────────────────
  if (dispo !== null && dispo !== undefined) {
    if (dispo < 70) {
      recos.push({
        priorite: 2,
        urgence: 'ATTENTION',
        couleur: '#ffaa00',
        icon: 'fa-chart-line',
        titre: `Disponibilité critique : ${dispo}%`,
        detail: 'Disponibilité en dessous de 70%. Analyser les causes d\'arrêts et mettre en place un plan d\'action.',
        action: 'Analyser causes d\'arrêts',
        coutEvite: Math.round((85 - dispo) * 1200),
        delai: 'Cette semaine'
      });
    }
  }

  // ── Si tout va bien ─────────────────────────────────────────
  if (recos.length === 0) {
    return `
      <div class="fiche-section reco-ok-section">
        <div class="fiche-section-title"><i class="fas fa-lightbulb"></i> Aide à la Décision</div>
        <div class="reco-ok">
          <i class="fas fa-check-circle"></i>
          <div>
            <div class="reco-ok-titre">Machine en bon état — Aucune action requise</div>
            <div class="reco-ok-detail">HSI optimal · Continuer le suivi régulier · Prochaine saisie recommandée dans 24h</div>
          </div>
        </div>
      </div>`;
  }

  // ── Trier par priorité ──────────────────────────────────────
  recos.sort((a, b) => a.priorite - b.priorite);

  const totalCoutEvite = recos.reduce((sum, r) => sum + r.coutEvite, 0);

  return `
    <div class="fiche-section reco-section">
      <div class="fiche-section-title">
        <i class="fas fa-lightbulb"></i> Aide à la Décision
        <span class="reco-count">${recos.length} action${recos.length > 1 ? 's' : ''} recommandée${recos.length > 1 ? 's' : ''}</span>
      </div>

      <div class="reco-cout-evite">
        <i class="fas fa-shield-alt"></i>
        Coût total évitable si action immédiate :
        <strong>${totalCoutEvite.toLocaleString()} DZD</strong>
      </div>

      ${recos.map((r, i) => `
        <div class="reco-item" style="border-left-color:${r.couleur}">
          <div class="reco-header">
            <span class="reco-num">${i + 1}</span>
            <span class="reco-urgence" style="background:${r.couleur}20;color:${r.couleur};border:1px solid ${r.couleur}40">
              <i class="fas ${r.icon}"></i> ${r.urgence}
            </span>
            <span class="reco-titre">${r.titre}</span>
            <span class="reco-delai" style="color:${r.couleur}">⏱ ${r.delai}</span>
          </div>
          <div class="reco-detail">${r.detail}</div>
          <div class="reco-footer">
            <span class="reco-action"><i class="fas fa-arrow-right"></i> ${r.action}</span>
            <span class="reco-cout">💰 Coût évité : <strong>${r.coutEvite.toLocaleString()} DZD</strong></span>
          </div>
        </div>
      `).join('')}
    </div>`;
}
function ouvrirModalNouvelleMachine() {
  document.getElementById('modal-nouvelle-machine').style.display = 'flex';
}
 
function fermerModalMachine(event) {
  if (event && event.target !== document.getElementById('modal-nouvelle-machine')) return;
  document.getElementById('modal-nouvelle-machine').style.display = 'none';
  resetModalMachine();
}
 
function resetModalMachine() {
  ['nm-code','nm-nom','nm-description','nm-marque','nm-modele',
   'nm-serie','nm-localisation','nm-puissance','nm-capacite',
   'nm-unite','nm-eau','nm-temp-max','nm-pression-max']
    .forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  const msg = document.getElementById('nm-message');
  if (msg) msg.style.display = 'none';
}
 
async function soumettreNouvelleMachine() {
  const code = document.getElementById('nm-code').value.trim();
  const nom  = document.getElementById('nm-nom').value.trim();
 
  if (!code) { showNmMessage('Le code machine est obligatoire.', 'error'); return; }
  if (!nom)  { showNmMessage('Le nom de la machine est obligatoire.', 'error'); return; }
 
  const payload = {
    code_machine:      code,
    nom:               nom,
    categorie:         document.getElementById('nm-categorie').value,
    statut:            document.getElementById('nm-statut').value,
    description:       document.getElementById('nm-description').value.trim() || null,
    marque:            document.getElementById('nm-marque').value.trim()       || null,
    modele:            document.getElementById('nm-modele').value.trim()       || null,
    numero_serie:      document.getElementById('nm-serie').value.trim()        || null,
    localisation:      document.getElementById('nm-localisation').value.trim() || null,
    annee_installation:parseInt(document.getElementById('nm-annee').value)     || null,
    duree_vie_ans:     parseInt(document.getElementById('nm-duree-vie').value) || 10,
    puissance_kw:      parseFloat(document.getElementById('nm-puissance').value)  || null,
    capacite_max:      parseFloat(document.getElementById('nm-capacite').value)   || null,
    unite_capacite:    document.getElementById('nm-unite').value.trim()        || null,
    consommation_eau_lh: parseFloat(document.getElementById('nm-eau').value)   || null,
    temperature_max:   parseFloat(document.getElementById('nm-temp-max').value)   || null,
    pression_max_bar:  parseFloat(document.getElementById('nm-pression-max').value)|| null,
  };
 
  try {
    const res = await fetch(`${MACHINE_API}/machines/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
 
    const result = await res.json();
 
    if (!res.ok) {
      throw new Error(result.detail || `HTTP ${res.status}`);
    }
 
    showNmMessage(`✅ Machine "${nom}" créée avec succès !`, 'success');
 
    // Recharger la liste après 1.5s et fermer le modal
    setTimeout(async () => {
      document.getElementById('modal-nouvelle-machine').style.display = 'none';
      resetModalMachine();
      await loadAllMachines();
      populateMachineSelects();
    }, 1500);
 
  } catch (err) {
    showNmMessage(`❌ Erreur : ${err.message}`, 'error');
  }
}
 
function showNmMessage(msg, type) {
  const el = document.getElementById('nm-message');
  el.style.display = 'block';
  el.className = `saisie-message msg-${type}`;
  el.innerHTML = msg;
}