# ═══════════════════════════════════════════════════════════════
# TWINOVA — MODULE TWIN MACHINE
# machine_models.py — Modèles SQLAlchemy + Données de démonstration
# ═══════════════════════════════════════════════════════════════

from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, JSON, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base, SessionLocal


# ════════════════════════════════════════════════
# TABLE : machines
# ════════════════════════════════════════════════

class Machine(Base):
    __tablename__ = "machines"

    id                   = Column(Integer, primary_key=True, index=True)
    code_machine         = Column(String, unique=True, nullable=False)  # MAC-LAIT-001
    nom                  = Column(String, nullable=False)
    categorie            = Column(String, nullable=False)               # Thermique, Fermentation, etc.
    description          = Column(String, nullable=True)

    # Données Constructeur
    marque               = Column(String, nullable=True)
    modele               = Column(String, nullable=True)
    numero_serie         = Column(String, nullable=True)
    annee_installation   = Column(Integer, nullable=True)
    duree_vie_ans        = Column(Integer, default=10)
    puissance_kw         = Column(Float, nullable=True)
    consommation_eau_lh  = Column(Float, nullable=True)

    # Capacités Nominales
    capacite_max         = Column(Float, nullable=True)
    unite_capacite       = Column(String, default="unités/h")
    pression_max_bar     = Column(Float, nullable=True)
    temperature_min      = Column(Float, nullable=True)
    temperature_max      = Column(Float, nullable=True)
    vitesse_max          = Column(Float, nullable=True)

    # Lien 3D
    objet_3d_id          = Column(String, nullable=True)
    position_3d          = Column(JSON, nullable=True)
    modele_3d            = Column(String, nullable=True)

    # Statut
    statut               = Column(String, default="arret")  # en_marche, arret, panne, maintenance
    localisation         = Column(String, nullable=True)
    produit_id           = Column(Integer, ForeignKey("produits.id"), nullable=True)

    # Documentation
    lien_manuel          = Column(String, nullable=True)
    notes                = Column(Text, nullable=True)

    est_active           = Column(Boolean, default=True)
    date_creation        = Column(DateTime, default=datetime.now)
    date_modification    = Column(DateTime, default=datetime.now)

    saisies              = relationship("SaisieMachine", back_populates="machine", cascade="all, delete")
    maintenances         = relationship("MaintenanceMachine", back_populates="machine", cascade="all, delete")


# ════════════════════════════════════════════════
# TABLE : saisies_machine
# ════════════════════════════════════════════════

class SaisieMachine(Base):
    __tablename__ = "saisies_machine"

    id                    = Column(Integer, primary_key=True, index=True)
    machine_id            = Column(Integer, ForeignKey("machines.id"), nullable=False)

    # Variables de Process
    temperature           = Column(Float, nullable=True)   # °C
    pression              = Column(Float, nullable=True)   # bar
    vibration             = Column(Float, nullable=True)   # mm/s
    vitesse_reelle        = Column(Float, nullable=True)
    courant_ampere        = Column(Float, nullable=True)
    consommation_kwh      = Column(Float, nullable=True)

    # Statut
    statut                = Column(String, default="en_marche")
    operateur             = Column(String, nullable=True)

    # Compteurs
    heures_fonctionnement = Column(Float, nullable=True)
    nombre_cycles         = Column(Integer, nullable=True)
    production_heure      = Column(Float, nullable=True)

    # Alertes
    niveau_alerte         = Column(String, default="aucune")
    alertes               = Column(JSON, nullable=True)

    # KPIs calculés
    taux_disponibilite    = Column(Float, nullable=True)
    hsi                   = Column(Float, nullable=True)   # Health Score Index
    rul_heures            = Column(Float, nullable=True)   # Remaining Useful Life

    date_saisie           = Column(DateTime, default=datetime.now)
    notes                 = Column(String, nullable=True)

    machine               = relationship("Machine", back_populates="saisies")


# ════════════════════════════════════════════════
# TABLE : maintenances_machine
# ════════════════════════════════════════════════

class MaintenanceMachine(Base):
    __tablename__ = "maintenances_machine"

    id                = Column(Integer, primary_key=True, index=True)
    machine_id        = Column(Integer, ForeignKey("machines.id"), nullable=False)

    type_maintenance  = Column(String, nullable=False)   # preventive, corrective, predictive
    titre             = Column(String, nullable=False)
    description       = Column(String, nullable=True)

    date_planifiee    = Column(DateTime, nullable=True)
    date_reelle       = Column(DateTime, nullable=True)
    duree_heures      = Column(Float, nullable=True)

    statut            = Column(String, default="planifiee")  # planifiee, en_cours, terminee
    technicien        = Column(String, nullable=True)
    cout_dza          = Column(Float, nullable=True)
    pieces_changees   = Column(JSON, nullable=True)
    notes             = Column(String, nullable=True)

    date_creation     = Column(DateTime, default=datetime.now)

    machine           = relationship("Machine", back_populates="maintenances")


# ════════════════════════════════════════════════
# DONNÉES DE DÉMONSTRATION
# ════════════════════════════════════════════════

def seed_machine_demo(db):
    try:
        if db.query(Machine).count() > 0:
            return

        machines_demo = [
            Machine(
                code_machine="MAC-LAIT-001", nom="Pasteurisateur HTST",
                categorie="Thermique",
                description="Pasteurisateur haute température courte durée (72°C / 15s). Traitement du lait cru.",
                marque="APV", modele="HT-5000", annee_installation=2020,
                duree_vie_ans=15, puissance_kw=45.0, consommation_eau_lh=200.0,
                capacite_max=5000.0, unite_capacite="L/h",
                temperature_min=4.0, temperature_max=95.0,
                statut="en_marche", localisation="Atelier Pasteurisation",
                objet_3d_id="plate_pasteurizer", modele_3d="plate_pasteurizer.glb"
            ),
            Machine(
                code_machine="MAC-LAIT-002", nom="Cuve de Fermentation Yaourt",
                categorie="Fermentation",
                description="Cuve inox 304 pour fermentation yaourt à 43°C. Agitateur intégré.",
                marque="INOXPA", modele="FV-2000", annee_installation=2019,
                duree_vie_ans=20, puissance_kw=5.5, consommation_eau_lh=50.0,
                capacite_max=2000.0, unite_capacite="L",
                temperature_min=2.0, temperature_max=95.0,
                statut="en_marche", localisation="Atelier Fermentation",
                objet_3d_id="oil_storage_small_tank", modele_3d="oil_storage_small_tank.glb"
            ),
            Machine(
                code_machine="MAC-LAIT-003", nom="Conditionneuse Bouteilles",
                categorie="Conditionnement",
                description="Machine de remplissage et capsulage bouteilles PET 1L. Cadence 3000 bouteilles/h.",
                marque="KRONES", modele="Volumetic VMF", annee_installation=2021,
                duree_vie_ans=12, puissance_kw=22.0, consommation_eau_lh=30.0,
                capacite_max=3000.0, unite_capacite="bouteilles/h",
                statut="arret", localisation="Ligne Conditionnement",
                objet_3d_id="machine_a_fabriquer_les_bouteilles",
                modele_3d="machine_a_fabriquer_les_bouteilles.glb"
            ),
            Machine(
                code_machine="MAC-LAIT-004", nom="Bras Robot Palettisation",
                categorie="Manutention",
                description="Robot 6 axes pour palettisation automatique des caisses produits finis.",
                marque="KUKA", modele="KR 120 R2500", annee_installation=2022,
                duree_vie_ans=10, puissance_kw=7.5,
                capacite_max=120.0, unite_capacite="cycles/h",
                statut="maintenance", localisation="Zone Palettisation",
                objet_3d_id="industrial_robot_arm__animated",
                modele_3d="industrial_robot_arm__animated.glb"
            ),
            Machine(
                code_machine="MAC-LAIT-005", nom="Trémie Réception",
                categorie="Réception",
                description="Trémie de réception du lait cru avec pesage intégré. Capacité 500 kg.",
                marque="SERAP", modele="TR-500", annee_installation=2021,
                duree_vie_ans=20, puissance_kw=3.5, consommation_eau_lh=20.0,
                capacite_max=500.0, unite_capacite="kg",
                temperature_min=2.0, temperature_max=10.0,
                statut="en_marche", localisation="Zone Réception",
                objet_3d_id="tremie_reception", modele_3d=None
            ),
            Machine(
                code_machine="MAC-LAIT-006", nom="Mélangeur Inox",
                categorie="Transformation",
                description="Mélangeur inox 304 pour homogénéisation des mélanges laitiers.",
                marque="INOXPA", modele="MX-2000", annee_installation=2020,
                duree_vie_ans=15, puissance_kw=7.5, consommation_eau_lh=30.0,
                capacite_max=2000.0, unite_capacite="L",
                temperature_min=4.0, temperature_max=85.0,
                statut="panne", localisation="Atelier Transformation",
                objet_3d_id="melangeur_inox", modele_3d=None
            ),
            Machine(
                code_machine="MAC-LAIT-007", nom="Station de Contrôle",
                categorie="Supervision",
                description="Console de supervision et contrôle qualité de la ligne de production.",
                marque="SIEMENS", modele="SIMATIC S7-1500", annee_installation=2022,
                duree_vie_ans=10, puissance_kw=2.0,
                temperature_max=45.0,
                statut="en_marche", localisation="Salle Contrôle",
                objet_3d_id="monitoring_station", modele_3d="monitoring_station.glb"
            ),
            Machine(
                code_machine="MAC-LAIT-008", nom="Bras Robotique Animé",
                categorie="Manutention",
                description="Bras robotique 6 axes animé pour transfert et tri automatique des produits.",
                marque="FANUC", modele="LR Mate 200iD", annee_installation=2023,
                duree_vie_ans=12, puissance_kw=5.5,
                capacite_max=7.0, unite_capacite="kg",
                temperature_max=50.0,
                statut="maintenance", localisation="Zone Palettisation",
                objet_3d_id="industrial_robot_arm_animated",
                modele_3d="animated_robotic_arm__blender_3d.glb"
            ),
            Machine(
                code_machine="MAC-LAIT-009", nom="Chaudière Vapeur",
                categorie="Utilités",
                description="Chaudière vapeur industrielle pour alimentation process thermiques.",
                marque="VIESSMAN", modele="VITOPLEX 200", annee_installation=2019,
                duree_vie_ans=20, puissance_kw=45.0, consommation_eau_lh=180.0,
                capacite_max=500.0, unite_capacite="kg vapeur/h",
                temperature_max=200.0, pression_max_bar=10.0,
                statut="maintenance", localisation="Chaufferie",
                objet_3d_id="chaudiere_vapeur", modele_3d=None
            ),
            Machine(
                code_machine="MAC-LAIT-010", nom="Compresseur Air",
                categorie="Utilités",
                description="Compresseur air comprimé 10 bar pour alimentation pneumatique de la ligne.",
                marque="ATLAS COPCO", modele="GA 15", annee_installation=2020,
                duree_vie_ans=15, puissance_kw=15.0,
                capacite_max=1500.0, unite_capacite="L/min",
                temperature_max=80.0, pression_max_bar=12.0,
                statut="en_marche", localisation="Local Compresseurs",
                objet_3d_id="compresseur_air", modele_3d=None
            ),
        ]

        for m in machines_demo:
            db.add(m)
        db.commit()

        saisies_demo = [
            SaisieMachine(
                machine_id=1, temperature=72.5, pression=3.2, vibration=1.8,
                vitesse_reelle=5000, courant_ampere=85.0, consommation_kwh=42.0,
                statut="en_marche", operateur="Ahmed B.",
                heures_fonctionnement=2450, nombre_cycles=12500, production_heure=4800,
                taux_disponibilite=96.0, hsi=88.0, rul_heures=9750, niveau_alerte="aucune"
            ),
            SaisieMachine(
                machine_id=2, temperature=43.2, vibration=0.5, courant_ampere=12.0,
                consommation_kwh=5.0, statut="en_marche", operateur="Fatima Z.",
                heures_fonctionnement=3100, nombre_cycles=1550,
                taux_disponibilite=98.0, hsi=92.0, rul_heures=15900, niveau_alerte="aucune"
            ),
            SaisieMachine(
                machine_id=3, statut="arret", operateur="Karim M.",
                heures_fonctionnement=1800, nombre_cycles=5400000, production_heure=0,
                taux_disponibilite=78.0, hsi=71.0, rul_heures=4200,
                niveau_alerte="attention",
                alertes=[{"type": "disponibilite", "message": "Taux disponibilité < 80% — vérifier"}]
            ),
            SaisieMachine(
                machine_id=4, vibration=4.2, statut="maintenance",
                operateur="Technicien KUKA",
                heures_fonctionnement=5200, nombre_cycles=185000, production_heure=0,
                taux_disponibilite=65.0, hsi=55.0, rul_heures=800,
                niveau_alerte="critique",
                alertes=[
                    {"type": "vibration", "message": "Vibration critique 4.2 mm/s > seuil 3.5 mm/s"},
                    {"type": "rul", "message": "RUL < 1000h — maintenance urgente requise"}
                ]
            ),
        ]

        for s in saisies_demo:
            db.add(s)

        maintenances_demo = [
            MaintenanceMachine(
                machine_id=1, type_maintenance="preventive",
                titre="Nettoyage et désinfection plaques",
                description="Démontage et nettoyage complet des plaques d'échange thermique",
                date_planifiee=datetime(2026, 6, 15),
                statut="planifiee", technicien="Équipe Maintenance", cout_dza=45000
            ),
            MaintenanceMachine(
                machine_id=4, type_maintenance="corrective",
                titre="Remplacement roulements bras robot",
                description="Vibrations anormales — remplacement roulements axes 2 et 3",
                date_planifiee=datetime(2026, 5, 20),
                statut="en_cours", technicien="Technicien KUKA", cout_dza=280000,
                pieces_changees=["Roulement SKF 6205", "Roulement SKF 6206"]
            ),
        ]

        for m in maintenances_demo:
            db.add(m)

        db.commit()
        print("✅ Données démo Twin Machine créées !")

    except Exception as e:
        print(f"❌ Erreur seed machines: {e}")
        db.rollback()