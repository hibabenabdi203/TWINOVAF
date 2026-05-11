# ═══════════════════════════════════════════════════════════════
# TWINOVA — MODULE TWIN MACHINE
# machine_routes.py — Routes FastAPI
# ═══════════════════════════════════════════════════════════════

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime
from database import get_db
from machine_models import Machine, SaisieMachine, MaintenanceMachine

router_machine = APIRouter(prefix="/machines", tags=["Twin Machine"])


# ════════════════════════════════════════════════
# MACHINES — CRUD
# ════════════════════════════════════════════════

@router_machine.get("/")
def liste_machines(db: Session = Depends(get_db)):
    """Retourne toutes les machines avec leur dernière saisie"""
    machines = db.query(Machine).filter(Machine.est_active == True).all()
    result = []
    for m in machines:
        derniere_saisie = db.query(SaisieMachine).filter(
            SaisieMachine.machine_id == m.id
        ).order_by(SaisieMachine.date_saisie.desc()).first()

        result.append({
            "id": m.id,
            "code_machine": m.code_machine,
            "nom": m.nom,
            "categorie": m.categorie,
            "description": m.description,
            "marque": m.marque,
            "modele": m.modele,
            "annee_installation": m.annee_installation,
            "duree_vie_ans": m.duree_vie_ans,
            "puissance_kw": m.puissance_kw,
            "consommation_eau_lh": m.consommation_eau_lh,
            "capacite_max": m.capacite_max,
            "unite_capacite": m.unite_capacite,
            "temperature_min": m.temperature_min,
            "temperature_max": m.temperature_max,
            "pression_max_bar": m.pression_max_bar,
            "vitesse_max": m.vitesse_max,
            "statut": m.statut,
            "localisation": m.localisation,
            "objet_3d_id": m.objet_3d_id,
            "modele_3d": m.modele_3d,
            "lien_manuel": m.lien_manuel,
            "notes": m.notes,
            "produit_id": m.produit_id,
            "monitoring": {
                "temperature": derniere_saisie.temperature if derniere_saisie else None,
                "pression": derniere_saisie.pression if derniere_saisie else None,
                "vibration": derniere_saisie.vibration if derniere_saisie else None,
                "vitesse_reelle": derniere_saisie.vitesse_reelle if derniere_saisie else None,
                "courant_ampere": derniere_saisie.courant_ampere if derniere_saisie else None,
                "consommation_kwh": derniere_saisie.consommation_kwh if derniere_saisie else None,
                "heures_fonctionnement": derniere_saisie.heures_fonctionnement if derniere_saisie else None,
                "nombre_cycles": derniere_saisie.nombre_cycles if derniere_saisie else None,
                "production_heure": derniere_saisie.production_heure if derniere_saisie else None,
                "taux_disponibilite": derniere_saisie.taux_disponibilite if derniere_saisie else None,
                "hsi": derniere_saisie.hsi if derniere_saisie else None,
                "rul_heures": derniere_saisie.rul_heures if derniere_saisie else None,
                "niveau_alerte": derniere_saisie.niveau_alerte if derniere_saisie else "aucune",
                "alertes": derniere_saisie.alertes if derniere_saisie else [],
                "operateur": derniere_saisie.operateur if derniere_saisie else None,
                "date_saisie": str(derniere_saisie.date_saisie) if derniere_saisie else None,
            }
        })
    return result


@router_machine.get("/{machine_id}")
def detail_machine(machine_id: int, db: Session = Depends(get_db)):
    """Retourne le détail complet d'une machine"""
    machine = db.query(Machine).filter(Machine.id == machine_id).first()
    if not machine:
        raise HTTPException(status_code=404, detail="Machine introuvable")

    saisies = db.query(SaisieMachine).filter(
        SaisieMachine.machine_id == machine_id
    ).order_by(SaisieMachine.date_saisie.desc()).limit(30).all()

    maintenances = db.query(MaintenanceMachine).filter(
        MaintenanceMachine.machine_id == machine_id
    ).order_by(MaintenanceMachine.date_planifiee.desc()).all()

    return {
        "machine": {
            "id": machine.id,
            "code_machine": machine.code_machine,
            "nom": machine.nom,
            "categorie": machine.categorie,
            "description": machine.description,
            "marque": machine.marque,
            "modele": machine.modele,
            "numero_serie": machine.numero_serie,
            "annee_installation": machine.annee_installation,
            "duree_vie_ans": machine.duree_vie_ans,
            "puissance_kw": machine.puissance_kw,
            "consommation_eau_lh": machine.consommation_eau_lh,
            "capacite_max": machine.capacite_max,
            "unite_capacite": machine.unite_capacite,
            "pression_max_bar": machine.pression_max_bar,
            "temperature_min": machine.temperature_min,
            "temperature_max": machine.temperature_max,
            "vitesse_max": machine.vitesse_max,
            "statut": machine.statut,
            "localisation": machine.localisation,
            "objet_3d_id": machine.objet_3d_id,
            "modele_3d": machine.modele_3d,
            "lien_manuel": machine.lien_manuel,
            "notes": machine.notes,
            "produit_id": machine.produit_id,
        },
        "historique_saisies": [
            {
                "id": s.id,
                "date_saisie": str(s.date_saisie),
                "statut": s.statut,
                "temperature": s.temperature,
                "pression": s.pression,
                "vibration": s.vibration,
                "vitesse_reelle": s.vitesse_reelle,
                "courant_ampere": s.courant_ampere,
                "consommation_kwh": s.consommation_kwh,
                "heures_fonctionnement": s.heures_fonctionnement,
                "nombre_cycles": s.nombre_cycles,
                "production_heure": s.production_heure,
                "taux_disponibilite": s.taux_disponibilite,
                "hsi": s.hsi,
                "rul_heures": s.rul_heures,
                "niveau_alerte": s.niveau_alerte,
                "alertes": s.alertes or [],
                "operateur": s.operateur,
                "notes": s.notes,
            }
            for s in saisies
        ],
        "maintenances": [
            {
                "id": m.id,
                "type_maintenance": m.type_maintenance,
                "titre": m.titre,
                "description": m.description,
                "date_planifiee": str(m.date_planifiee) if m.date_planifiee else None,
                "date_reelle": str(m.date_reelle) if m.date_reelle else None,
                "statut": m.statut,
                "technicien": m.technicien,
                "cout_dza": m.cout_dza,
                "pieces_changees": m.pieces_changees or [],
                "notes": m.notes,
            }
            for m in maintenances
        ]
    }


@router_machine.post("/")
def creer_machine(data: dict, db: Session = Depends(get_db)):
    """Crée une nouvelle machine"""
    # Vérifier que le code machine est unique
    existant = db.query(Machine).filter(Machine.code_machine == data.get("code_machine")).first()
    if existant:
        raise HTTPException(status_code=400, detail="Code machine déjà utilisé")

    machine = Machine(
        code_machine=data.get("code_machine"),
        nom=data.get("nom"),
        categorie=data.get("categorie"),
        description=data.get("description"),
        marque=data.get("marque"),
        modele=data.get("modele"),
        numero_serie=data.get("numero_serie"),
        annee_installation=data.get("annee_installation"),
        duree_vie_ans=data.get("duree_vie_ans", 10),
        puissance_kw=data.get("puissance_kw"),
        consommation_eau_lh=data.get("consommation_eau_lh"),
        capacite_max=data.get("capacite_max"),
        unite_capacite=data.get("unite_capacite", "unités/h"),
        pression_max_bar=data.get("pression_max_bar"),
        temperature_min=data.get("temperature_min"),
        temperature_max=data.get("temperature_max"),
        vitesse_max=data.get("vitesse_max"),
        statut=data.get("statut", "arret"),
        localisation=data.get("localisation"),
        objet_3d_id=data.get("objet_3d_id"),
        modele_3d=data.get("modele_3d"),
        lien_manuel=data.get("lien_manuel"),
        notes=data.get("notes"),
        produit_id=data.get("produit_id"),
    )
    db.add(machine)
    db.commit()
    db.refresh(machine)
    return {"message": f"Machine '{machine.nom}' créée ✅", "id": machine.id, "code": machine.code_machine}


@router_machine.put("/{machine_id}")
def modifier_machine(machine_id: int, data: dict, db: Session = Depends(get_db)):
    """Modifie une machine existante"""
    machine = db.query(Machine).filter(Machine.id == machine_id).first()
    if not machine:
        raise HTTPException(status_code=404, detail="Machine introuvable")

    champs = ["nom", "categorie", "description", "marque", "modele", "numero_serie",
              "annee_installation", "duree_vie_ans", "puissance_kw", "consommation_eau_lh",
              "capacite_max", "unite_capacite", "pression_max_bar", "temperature_min",
              "temperature_max", "vitesse_max", "statut", "localisation", "objet_3d_id",
              "modele_3d", "lien_manuel", "notes", "produit_id"]

    for champ in champs:
        if champ in data:
            setattr(machine, champ, data[champ])

    machine.date_modification = datetime.now()
    db.commit()
    return {"message": f"Machine '{machine.nom}' modifiée ✅"}


@router_machine.delete("/{machine_id}")
def supprimer_machine(machine_id: int, db: Session = Depends(get_db)):
    """Supprime une machine (désactivation logique)"""
    machine = db.query(Machine).filter(Machine.id == machine_id).first()
    if not machine:
        raise HTTPException(status_code=404, detail="Machine introuvable")
    machine.est_active = False
    db.commit()
    return {"message": f"Machine '{machine.nom}' désactivée ✅"}


# ════════════════════════════════════════════════
# SAISIE MONITORING — Opérateur terrain
# ════════════════════════════════════════════════

@router_machine.post("/{machine_id}/saisie")
def nouvelle_saisie(machine_id: int, data: dict, db: Session = Depends(get_db)):
    """
    Enregistre une nouvelle saisie de monitoring
    Calcule automatiquement HSI, RUL et alertes
    """
    machine = db.query(Machine).filter(Machine.id == machine_id).first()
    if not machine:
        raise HTTPException(status_code=404, detail="Machine introuvable")

    # ── Calcul automatique du HSI (Health Score Index) ──
    hsi = 100.0
    alertes = []
    niveau_alerte = "aucune"

    # Pénalité vibration (norme ISO 10816)
    vibration = data.get("vibration")
    if vibration:
        if vibration > 7.1:
            hsi -= 40
            niveau_alerte = "critique"
            alertes.append({"type": "vibration", "gravite": "critique",
                           "message": f"Vibration dangereuse {vibration} mm/s > 7.1 mm/s"})
        elif vibration > 4.5:
            hsi -= 25
            niveau_alerte = "critique"
            alertes.append({"type": "vibration", "gravite": "critique",
                           "message": f"Vibration critique {vibration} mm/s > 4.5 mm/s"})
        elif vibration > 2.8:
            hsi -= 15
            if niveau_alerte == "aucune":
                niveau_alerte = "attention"
            alertes.append({"type": "vibration", "gravite": "attention",
                           "message": f"Vibration élevée {vibration} mm/s > 2.8 mm/s"})

    # Pénalité température
    temperature = data.get("temperature")
    if temperature and machine.temperature_max:
        if temperature > machine.temperature_max:
            hsi -= 30
            niveau_alerte = "critique"
            alertes.append({"type": "temperature", "gravite": "critique",
                           "message": f"Température hors limite {temperature}°C > {machine.temperature_max}°C"})
        elif temperature > machine.temperature_max * 0.9:
            hsi -= 10
            if niveau_alerte == "aucune":
                niveau_alerte = "attention"
            alertes.append({"type": "temperature", "gravite": "attention",
                           "message": f"Température proche limite {temperature}°C"})

    # Pénalité disponibilité
    taux_dispo = data.get("taux_disponibilite")
    if taux_dispo:
        if taux_dispo < 70:
            hsi -= 20
        elif taux_dispo < 85:
            hsi -= 10

    hsi = max(0.0, min(100.0, round(hsi, 1)))

    # ── Calcul RUL (Remaining Useful Life) ──
    rul_heures = None
    heures_fonct = data.get("heures_fonctionnement")
    if heures_fonct and machine.duree_vie_ans:
        duree_vie_heures = machine.duree_vie_ans * 365 * 8  # 8h/jour
        rul_heures = max(0, round(duree_vie_heures - heures_fonct, 0))
        if rul_heures < 500:
            niveau_alerte = "critique"
            alertes.append({"type": "rul", "gravite": "critique",
                           "message": f"RUL critique : {rul_heures}h restantes — maintenance urgente"})
        elif rul_heures < 2000:
            if niveau_alerte == "aucune":
                niveau_alerte = "attention"
            alertes.append({"type": "rul", "gravite": "attention",
                           "message": f"RUL : {rul_heures}h restantes — planifier maintenance"})

    # ── Mise à jour statut machine ──
    nouveau_statut = data.get("statut", machine.statut)
    machine.statut = nouveau_statut
    machine.date_modification = datetime.now()

    # ── Création de la saisie ──
    saisie = SaisieMachine(
        machine_id=machine_id,
        temperature=temperature,
        pression=data.get("pression"),
        vibration=vibration,
        vitesse_reelle=data.get("vitesse_reelle"),
        courant_ampere=data.get("courant_ampere"),
        consommation_kwh=data.get("consommation_kwh"),
        statut=nouveau_statut,
        operateur=data.get("operateur"),
        heures_fonctionnement=heures_fonct,
        nombre_cycles=data.get("nombre_cycles"),
        production_heure=data.get("production_heure"),
        taux_disponibilite=taux_dispo,
        hsi=hsi,
        rul_heures=rul_heures,
        niveau_alerte=niveau_alerte,
        alertes=alertes if alertes else None,
        notes=data.get("notes"),
    )
    db.add(saisie)
    db.commit()
    db.refresh(saisie)

    return {
        "message": "Saisie enregistrée ✅",
        "id": saisie.id,
        "hsi": hsi,
        "rul_heures": rul_heures,
        "niveau_alerte": niveau_alerte,
        "alertes": alertes,
        "statut_machine": nouveau_statut,
    }


@router_machine.get("/{machine_id}/historique")
def historique_saisies(machine_id: int, limite: int = 30, db: Session = Depends(get_db)):
    """Retourne l'historique des saisies d'une machine"""
    machine = db.query(Machine).filter(Machine.id == machine_id).first()
    if not machine:
        raise HTTPException(status_code=404, detail="Machine introuvable")

    saisies = db.query(SaisieMachine).filter(
        SaisieMachine.machine_id == machine_id
    ).order_by(SaisieMachine.date_saisie.desc()).limit(limite).all()

    return {
        "machine": machine.nom,
        "code": machine.code_machine,
        "total": len(saisies),
        "historique": [
            {
                "id": s.id,
                "date_saisie": str(s.date_saisie),
                "statut": s.statut,
                "temperature": s.temperature,
                "pression": s.pression,
                "vibration": s.vibration,
                "hsi": s.hsi,
                "rul_heures": s.rul_heures,
                "niveau_alerte": s.niveau_alerte,
                "operateur": s.operateur,
            }
            for s in saisies
        ]
    }


# ════════════════════════════════════════════════
# MAINTENANCE
# ════════════════════════════════════════════════

@router_machine.post("/{machine_id}/maintenance")
def ajouter_maintenance(machine_id: int, data: dict, db: Session = Depends(get_db)):
    """Planifie ou enregistre une maintenance"""
    machine = db.query(Machine).filter(Machine.id == machine_id).first()
    if not machine:
        raise HTTPException(status_code=404, detail="Machine introuvable")

    maintenance = MaintenanceMachine(
        machine_id=machine_id,
        type_maintenance=data.get("type_maintenance", "preventive"),
        titre=data.get("titre"),
        description=data.get("description"),
        date_planifiee=datetime.fromisoformat(data["date_planifiee"]) if data.get("date_planifiee") else None,
        date_reelle=datetime.fromisoformat(data["date_reelle"]) if data.get("date_reelle") else None,
        duree_heures=data.get("duree_heures"),
        statut=data.get("statut", "planifiee"),
        technicien=data.get("technicien"),
        cout_dza=data.get("cout_dza"),
        pieces_changees=data.get("pieces_changees"),
        notes=data.get("notes"),
    )
    db.add(maintenance)
    db.commit()
    db.refresh(maintenance)
    return {"message": "Maintenance enregistrée ✅", "id": maintenance.id}


@router_machine.put("/maintenance/{maintenance_id}")
def modifier_maintenance(maintenance_id: int, data: dict, db: Session = Depends(get_db)):
    """Modifie le statut d'une maintenance"""
    maintenance = db.query(MaintenanceMachine).filter(MaintenanceMachine.id == maintenance_id).first()
    if not maintenance:
        raise HTTPException(status_code=404, detail="Maintenance introuvable")

    for champ in ["statut", "technicien", "cout_dza", "notes", "duree_heures", "pieces_changees"]:
        if champ in data:
            setattr(maintenance, champ, data[champ])

    if data.get("date_reelle"):
        maintenance.date_reelle = datetime.fromisoformat(data["date_reelle"])

    db.commit()
    return {"message": "Maintenance mise à jour ✅"}


# ════════════════════════════════════════════════
# TABLEAU DE BORD MACHINES — Vue globale
# ════════════════════════════════════════════════

@router_machine.get("/dashboard/global")
def dashboard_machines(db: Session = Depends(get_db)):
    """Retourne un résumé global de l'état du parc machines"""
    machines = db.query(Machine).filter(Machine.est_active == True).all()

    stats = {
        "total": len(machines),
        "en_marche": 0, "arret": 0, "panne": 0, "maintenance": 0,
        "alertes_critiques": 0, "alertes_attention": 0,
        "hsi_moyen": 0, "machines_critiques": []
    }

    hsi_total = 0
    hsi_count = 0

    for m in machines:
        stats[m.statut] = stats.get(m.statut, 0) + 1

        derniere = db.query(SaisieMachine).filter(
            SaisieMachine.machine_id == m.id
        ).order_by(SaisieMachine.date_saisie.desc()).first()

        if derniere:
            if derniere.niveau_alerte == "critique":
                stats["alertes_critiques"] += 1
                stats["machines_critiques"].append({
                    "id": m.id, "nom": m.nom, "code": m.code_machine,
                    "hsi": derniere.hsi, "alertes": derniere.alertes or []
                })
            elif derniere.niveau_alerte == "attention":
                stats["alertes_attention"] += 1

            if derniere.hsi is not None:
                hsi_total += derniere.hsi
                hsi_count += 1

    if hsi_count > 0:
        stats["hsi_moyen"] = round(hsi_total / hsi_count, 1)

    return stats