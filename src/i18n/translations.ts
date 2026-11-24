import { GameLanguage } from '../utils/settingsEngine';

type NonPtLang = Exclude<GameLanguage, 'pt-BR'>;
type TranslationRow = Record<NonPtLang, string>;

/**
 * Curated exact-match dictionary for Patofoot 2026 UI (Brazilian Portuguese -> EN / ES / FR / IT / DE).
 * Keeps proper club names, player names, and stadiums untouched.
 */
const EXACT_PHRASES: Record<string, TranslationRow> = {
  // Top navigation & Sidebar groups
  'Comando': { en: 'Command', es: 'Mando', fr: 'Direction', it: 'Comando', de: 'Kommando' },
  'Futebol': { en: 'Football', es: 'Fútbol', fr: 'Football', it: 'Calcio', de: 'Fußball' },
  'Competições & Mundo': { en: 'Competitions & World', es: 'Competiciones y Mundo', fr: 'Compétitions & Monde', it: 'Competizioni & Mondo', de: 'Wettbewerbe & Welt' },
  'Seleções & FIFA': { en: 'National Teams & FIFA', es: 'Selecciones y FIFA', fr: 'Sélections & FIFA', it: 'Nazionali & FIFA', de: 'Nationalteams & FIFA' },
  'Mercado & Gestão': { en: 'Market & Management', es: 'Mercado y Gestión', fr: 'Marché & Gestion', it: 'Mercato & Gestione', de: 'Markt & Management' },

  // Sidebar / Header sections
  'Central do Clube': { en: 'Club Hub', es: 'Central del Club', fr: 'Centre du Club', it: 'Centro del Club', de: 'Vereinszentrale' },
  'Central': { en: 'Hub', es: 'Central', fr: 'Centre', it: 'Centro', de: 'Zentrale' },
  'Notícias': { en: 'News & Inbox', es: 'Noticias', fr: 'Actualités', it: 'Notizie', de: 'Nachrichten' },
  'Caixa de Entrada': { en: 'Inbox', es: 'Bandeja de Entrada', fr: 'Boîte de réception', it: 'Posta in arrivo', de: 'Posteingang' },
  'Calendário': { en: 'Calendar', es: 'Calendario', fr: 'Calendrier', it: 'Calendario', de: 'Kalender' },
  'Meus Jogadores': { en: 'My Players', es: 'Mis Jugadores', fr: 'Mes Joueurs', it: 'I Miei Giocatori', de: 'Meine Spieler' },
  'Escalação & Campo': { en: 'Lineup & Pitch', es: 'Alineación y Campo', fr: 'Composition & Terrain', it: 'Formazione & Campo', de: 'Aufstellung & Platz' },
  'Elenco': { en: 'Squad', es: 'Plantilla', fr: 'Effectif', it: 'Rosa', de: 'Kader' },
  'Táticas': { en: 'Tactics', es: 'Tácticas', fr: 'Tactiques', it: 'Tattiche', de: 'Taktik' },
  'Instruções Táticas': { en: 'Tactical Instructions', es: 'Instrucciones Tácticas', fr: 'Consignes Tactiques', it: 'Istruzioni Tattiche', de: 'Taktikanweisungen' },
  'Treinos': { en: 'Training', es: 'Entrenamientos', fr: 'Entraînement', it: 'Allenamento', de: 'Training' },
  'Centro de Treino': { en: 'Training Center', es: 'Centro de Entrenamiento', fr: "Centre d'Entraînement", it: 'Centro Sportivo', de: 'Trainingszentrum' },
  'Centro de Treinamento': { en: 'Training Center', es: 'Centro de Entrenamiento', fr: "Centre d'Entraînement", it: 'Centro Sportivo', de: 'Trainingszentrum' },
  'Classificação': { en: 'Standings', es: 'Clasificación', fr: 'Classement', it: 'Classifica', de: 'Tabelle' },
  'Tabela': { en: 'Table', es: 'Tabla', fr: 'Classement', it: 'Classifica', de: 'Tabelle' },
  'Outros Times': { en: 'Other Clubs', es: 'Otros Clubes', fr: 'Autres Clubs', it: 'Altri Club', de: 'Andere Vereine' },
  'Sala de Troféus': { en: 'Trophy Cabinet', es: 'Sala de Trofeos', fr: 'Armoire à Trophées', it: 'Bacheca Trofei', de: 'Trophäenschrank' },
  'Histórico & Recordes': { en: 'History & Records', es: 'Historial y Récords', fr: 'Historique & Records', it: 'Storia & Record', de: 'Historie & Rekorde' },
  'Minha Seleção': { en: 'My National Team', es: 'Mi Selección', fr: 'Ma Sélection', it: 'La Mia Nazionale', de: 'Mein Nationalteam' },
  'Seleções & Torneios': { en: 'National Teams & Cups', es: 'Selecciones y Torneos', fr: 'Sélections & Tournois', it: 'Nazionali & Tornei', de: 'Nationalteams & Turniere' },
  'Mercado da Bola': { en: 'Transfer Market', es: 'Mercado de Fichajes', fr: 'Marché des Transferts', it: 'Calciomercato', de: 'Transfermarkt' },
  'Mercado': { en: 'Market', es: 'Mercado', fr: 'Marché', it: 'Mercato', de: 'Markt' },
  'Olheiros & Base': { en: 'Scouting & Youth', es: 'Ojeadores y Cantera', fr: 'Recrutement & Centre', it: 'Osservatori & Vivaio', de: 'Scouting & Jugend' },
  'Finanças & Estádio': { en: 'Finances & Stadium', es: 'Finanzas y Estadio', fr: 'Finances & Stade', it: 'Finanze & Stadio', de: 'Finanzen & Stadion' },
  'Finanças': { en: 'Finances', es: 'Finanzas', fr: 'Finances', it: 'Finanze', de: 'Finanzen' },
  'Patrocinadores': { en: 'Sponsors', es: 'Patrocinadores', fr: 'Sponsors', it: 'Sponsor', de: 'Sponsoren' },
  'Patrocínios': { en: 'Sponsors', es: 'Patrocinios', fr: 'Sponsors', it: 'Sponsor', de: 'Sponsoren' },
  'Diretoria & Carreira': { en: 'Board & Career', es: 'Directiva y Carrera', fr: 'Direction & Carrière', it: 'Dirigenza & Carriera', de: 'Vorstand & Karriere' },
  'Mais': { en: 'More', es: 'Más', fr: 'Plus', it: 'Altro', de: 'Mehr' },

  // Title Screen & Auth
  'Nova Carreira': { en: 'New Career', es: 'Nueva Carrera', fr: 'Nouvelle Carrière', it: 'Nuova Carriera', de: 'Neue Karriere' },
  'Criar Nova Carreira': { en: 'Create New Career', es: 'Crear Nueva Carrera', fr: 'Créer Nouvelle Carrière', it: 'Crea Nuova Carriera', de: 'Neue Karriere starten' },
  'Continuar Carreira': { en: 'Continue Career', es: 'Continuar Carrera', fr: 'Continuer la Carrière', it: 'Continua Carriera', de: 'Karriere fortsetzen' },
  'Continuar': { en: 'Continue', es: 'Continuar', fr: 'Continuer', it: 'Continua', de: 'Fortsetzen' },
  'Entrar no Jogo': { en: 'Sign In', es: 'Entrar al Juego', fr: 'Se Connecter', it: 'Accedi al Gioco', de: 'Anmelden' },
  'Criar Acesso': { en: 'Create Account', es: 'Crear Acceso', fr: 'Créer un Accès', it: 'Crea Accesso', de: 'Konto erstellen' },
  'Acesse sua Conta de Treinador': { en: 'Access Your Manager Account', es: 'Accede a tu Cuenta de Entrenador', fr: 'Accédez à votre Compte Entraîneur', it: 'Accedi al tuo Account Allenatore', de: 'Trainer-Konto anmelden' },
  'Crie seu Acesso no Jogo': { en: 'Create Your Game Account', es: 'Crea tu Acceso al Juego', fr: 'Créez votre Accès au Jeu', it: 'Crea il tuo Accesso al Gioco', de: 'Spielkonto erstellen' },
  'Seu Nome ou Login': { en: 'Your Name or Username', es: 'Tu Nombre o Usuario', fr: 'Votre Nom ou Identifiant', it: 'Nome o Username', de: 'Name oder Benutzername' },
  'Senha': { en: 'Password', es: 'Contraseña', fr: 'Mot de passe', it: 'Password', de: 'Passwort' },
  'Confirmar Senha': { en: 'Confirm Password', es: 'Confirmar Contraseña', fr: 'Confirmer le mot de passe', it: 'Conferma Password', de: 'Passwort bestätigen' },
  'Digite sua senha': { en: 'Enter your password', es: 'Ingresa tu contraseña', fr: 'Entrez votre mot de passe', it: 'Inserisci la password', de: 'Passwort eingeben' },
  'Crie uma senha (mín. 4 caracteres)': { en: 'Create a password (min. 4 chars)', es: 'Crea una contraseña (mín. 4 caracteres)', fr: 'Créez un mot de passe (min. 4 car.)', it: 'Crea una password (min. 4 caratteri)', de: 'Passwort erstellen (mind. 4 Zeichen)' },
  'Repita sua senha': { en: 'Repeat your password', es: 'Repite tu contraseña', fr: 'Répétez votre mot de passe', it: 'Ripeti la password', de: 'Passwort wiederholen' },
  'Sessão permanente ativada — você continuará logado sempre': { en: 'Persistent session enabled — stay signed in', es: 'Sesión permanente activada — seguirás conectado', fr: 'Session permanente activée — vous restez connecté', it: 'Sessione permanente attiva — resterai connesso', de: 'Dauerhafte Sitzung aktiv — du bleibst angemeldet' },
  'Área de Acesso do Treinador · Login Permanente': { en: 'Manager Login Area · Persistent Session', es: 'Acceso de Entrenador · Sesión Permanente', fr: 'Espace Entraîneur · Connexion Permanente', it: 'Area Allenatore · Accesso Permanente', de: 'Trainer-Login · Dauerhafte Sitzung' },
  '930+ clubes mundiais · 27 estaduais · Copa do Mundo · 5 espaços de carreira': { en: '930+ world clubs · 27 state leagues · World Cup · 5 career slots', es: '930+ clubes mundiales · 27 estaduales · Mundial · 5 espacios', fr: '930+ clubs mondiaux · 27 championnats · Mondial · 5 emplacements', it: '930+ club mondiali · 27 campionati · Mondiali · 5 slot carriera', de: '930+ Weltvereine · 27 Ligen · WM · 5 Karriereslots' },
  'Espaço Livre': { en: 'Empty Slot', es: 'Espacio Libre', fr: 'Emplacement Libre', it: 'Slot Libero', de: 'Freier Platz' },
  'Carreira Ativa': { en: 'Active Career', es: 'Carrera Activa', fr: 'Carrière Active', it: 'Carriera Attiva', de: 'Aktive Karriere' },
  'Saves & Backups': { en: 'Saves & Backups', es: 'Partidas y Copias', fr: 'Sauvegardes', it: 'Salvataggi & Backup', de: 'Spielstände & Backups' },
  'Configurações': { en: 'Settings', es: 'Ajustes', fr: 'Paramètres', it: 'Impostazioni', de: 'Einstellungen' },
  'Configurações do Jogo': { en: 'Game Settings', es: 'Configuración del Juego', fr: 'Paramètres du Jeu', it: 'Impostazioni di Gioco', de: 'Spieleinstellungen' },
  'Como Jogar': { en: 'How to Play', es: 'Cómo Jugar', fr: 'Comment Jouer', it: 'Come Giocare', de: 'Spielanleitung' },
  'v1.0 Novidades': { en: "v1.0 What's New", es: 'Novedades v1.0', fr: 'Nouveautés v1.0', it: 'Novità v1.0', de: 'v1.0 Neuigkeiten' },
  'Sair': { en: 'Exit', es: 'Salir', fr: 'Quitter', it: 'Esci', de: 'Beenden' },
  'Entrar': { en: 'Sign In', es: 'Iniciar Sesión', fr: 'Connexion', it: 'Accedi', de: 'Anmelden' },
  'Criar Conta': { en: 'Create Account', es: 'Crear Cuenta', fr: 'Créer un Compte', it: 'Crea Account', de: 'Konto erstellen' },
  'Entrar com Google': { en: 'Sign in with Google', es: 'Entrar con Google', fr: 'Continuer avec Google', it: 'Accedi con Google', de: 'Mit Google anmelden' },
  'Trocar Conta': { en: 'Switch Account', es: 'Cambiar Cuenta', fr: 'Changer de Compte', it: 'Cambia Account', de: 'Konto wechseln' },
  'Treinador:': { en: 'Manager:', es: 'Entrenador:', fr: 'Entraîneur :', it: 'Allenatore:', de: 'Trainer:' },
  'Treinador': { en: 'Manager', es: 'Entrenador', fr: 'Entraîneur', it: 'Allenatore', de: 'Trainer' },
  'Salvar nova carreira em:': { en: 'Save new career in:', es: 'Guardar nueva carrera en:', fr: 'Sauvegarder la carrière dans :', it: 'Salva nuova carriera in:', de: 'Neue Karriere speichern in:' },
  'Modo / Desafio de Carreira': { en: 'Career Mode / Challenge', es: 'Modo / Desafío de Carrera', fr: 'Mode / Défi de Carrière', it: 'Modalità / Sfida Carriera', de: 'Karrieremodus / Herausforderung' },
  'Especialidade do Treinador': { en: 'Manager Specialty', es: 'Especialidad del Entrenador', fr: "Spécialité de l'Entraîneur", it: 'Specialità Allenatore', de: 'Trainer-Spezialität' },
  'Sugerir Clube Ideal': { en: 'Suggest Ideal Club', es: 'Sugerir Club Ideal', fr: 'Suggérer un Club Idéal', it: 'Suggerisci Club Ideale', de: 'Idealen Verein vorschlagen' },
  'Carreira Livre': { en: 'Free Career', es: 'Carrera Libre', fr: 'Carrière Libre', it: 'Carriera Libera', de: 'Freie Karriere' },
  'Livre': { en: 'Free', es: 'Libre', fr: 'Libre', it: 'Libera', de: 'Frei' },
  'Operação Salvação': { en: 'Operation Survival', es: 'Operación Salvación', fr: 'Opération Maintien', it: 'Operazione Salvezza', de: 'Mission Klassenerhalt' },
  'Salvação Z-4': { en: 'Relegation Rescue', es: 'Salvación Descenso', fr: 'Maintien', it: 'Salvezza', de: 'Abstiegskampf' },
  'Da Série D à Libertadores': { en: '4th Tier to Libertadores', es: 'De Serie D a Libertadores', fr: 'De D4 à la Libertadores', it: 'Dalla Serie D alla Libertadores', de: 'Von Liga 4 zur Libertadores' },
  'Série D → América': { en: '4th Tier → Glory', es: 'Serie D → América', fr: 'D4 → Amérique', it: 'Serie D → America', de: 'Liga 4 → Ruhm' },
  'Gigante em Reconstrução': { en: 'Rebuilding Giant', es: 'Gigante en Reconstrucción', fr: 'Géant en Reconstruction', it: 'Gigante in Ricostruzione', de: 'Umbruch-Riese' },
  'Orçamento Curto': { en: 'Tight Budget', es: 'Presupuesto Corto', fr: 'Budget Serré', it: 'Budget Ridotto', de: 'Knappes Budget' },
  'Começar do Zero (Raiz)': { en: 'Start From Scratch', es: 'Empezar de Cero', fr: 'Partir de Zéro', it: 'Partire da Zero', de: 'Bei Null anfangen' },
  'Do Zero': { en: 'From Zero', es: 'De Cero', fr: 'De Zéro', it: 'Da Zero', de: 'Von Null' },
  'Especialista Tático': { en: 'Tactical Specialist', es: 'Especialista Táctico', fr: 'Spécialiste Tactique', it: 'Specialista Tattico', de: 'Taktik-Spezialist' },
  'Mestre Tático': { en: 'Tactical Master', es: 'Maestro Táctico', fr: 'Maître Tactique', it: 'Maestro Tattico', de: 'Taktikmeister' },
  'Formador de Base': { en: 'Youth Developer', es: 'Formador de Cantera', fr: 'Formateur de Jeunes', it: 'Formatore Vivaio', de: 'Jugendförderer' },
  'Lapidador Sub-23': { en: 'U-23 Developer', es: 'Desarrollador Sub-23', fr: 'Développeur U23', it: 'Sviluppatore U23', de: 'U23-Entwickler' },
  'Negociador de Mercado': { en: 'Transfer Negotiator', es: 'Negociador de Mercado', fr: 'Négociateur Mercato', it: 'Negoziatore di Mercato', de: 'Transfer-Verhandler' },
  'Tubarão do Mercado': { en: 'Market Shark', es: 'Tiburón del Mercado', fr: 'Requin du Mercato', it: 'Squalo del Mercato', de: 'Markt-Hai' },
  'Motivador de Elenco': { en: 'Squad Motivator', es: 'Motivador de Plantilla', fr: "Motivateur d'Équipe", it: 'Motivatore di Squadra', de: 'Motivator' },
  'Líder de Vestiário': { en: 'Dressing Room Leader', es: 'Líder de Vestuario', fr: 'Leader de Vestiaire', it: 'Leader di Spogliatoio', de: 'Kabinen-Leader' },
  'Orçamento Base': { en: 'Starting Budget', es: 'Presupuesto Base', fr: 'Budget Initial', it: 'Budget Iniziale', de: 'Startbudget' },
  'Estádio': { en: 'Stadium', es: 'Estadio', fr: 'Stade', it: 'Stadio', de: 'Stadion' },
  'Capacidade': { en: 'Capacity', es: 'Capacidad', fr: 'Capacité', it: 'Capienza', de: 'Kapazität' },
  'Principais Rivais': { en: 'Main Rivals', es: 'Principales Rivales', fr: 'Principaux Rivaux', it: 'Principali Rivali', de: 'Hauptrivalen' },
  'Principais Atletas': { en: 'Key Players', es: 'Jugadores Clave', fr: 'Joueurs Clés', it: 'Giocatori Chiave', de: 'Schlüsselspieler' },
  'Voltar': { en: 'Back', es: 'Volver', fr: 'Retour', it: 'Indietro', de: 'Zurück' },
  'Concluir': { en: 'Done', es: 'Finalizar', fr: 'Terminer', it: 'Fine', de: 'Fertig' },
  'Fechar': { en: 'Close', es: 'Cerrar', fr: 'Fermer', it: 'Chiudi', de: 'Schließen' },
  'Cancelar': { en: 'Cancel', es: 'Cancelar', fr: 'Annuler', it: 'Annulla', de: 'Abbrechen' },
  'Confirmar': { en: 'Confirm', es: 'Confirmar', fr: 'Confirmer', it: 'Conferma', de: 'Bestätigen' },
  'Salvar': { en: 'Save', es: 'Guardar', fr: 'Enregistrer', it: 'Salva', de: 'Speichern' },
  'Carregar': { en: 'Load', es: 'Cargar', fr: 'Charger', it: 'Carica', de: 'Laden' },
  'Aplicar': { en: 'Apply', es: 'Aplicar', fr: 'Appliquer', it: 'Applica', de: 'Anwenden' },
  'Exportar': { en: 'Export', es: 'Exportar', fr: 'Exporter', it: 'Esporta', de: 'Exportieren' },
  'Importar': { en: 'Import', es: 'Importar', fr: 'Importer', it: 'Importa', de: 'Importieren' },

  // Settings Modal
  'Áudio & Som': { en: 'Audio & Sound', es: 'Audio y Sonido', fr: 'Audio & Son', it: 'Audio & Suoni', de: 'Audio & Sound' },
  'Partida & Visual': { en: 'Match & Visuals', es: 'Partido y Visual', fr: 'Match & Visuels', it: 'Partita & Grafica', de: 'Spiel & Grafik' },
  'Carreira & Salvamento': { en: 'Career, Language & Save', es: 'Carrera, Idioma y Guardado', fr: 'Carrière, Langue & Sauvegarde', it: 'Carriera, Lingua & Salvataggio', de: 'Karriere, Sprache & Speichern' },
  'Idioma do Jogo': { en: 'Game Language', es: 'Idioma del Juego', fr: 'Langue du Jeu', it: 'Lingua del Gioco', de: 'Spielsprache' },
  'Escolha o idioma da interface, menus, táticas e partidas.': {
    en: 'Choose the language for menus, tactics, career and match day.',
    es: 'Elige el idioma para menús, tácticas, carrera y días de partido.',
    fr: 'Choisissez la langue des menus, tactiques, carrière et matchs.',
    it: 'Scegli la lingua per menu, tattiche, carriera e giorni di gara.',
    de: 'Wähle die Sprache für Menüs, Taktik, Karriere und Spieltage.',
  },
  'Som Geral do Estádio e Menus': { en: 'Master Stadium & Menu Audio', es: 'Sonido General de Estadio y Menús', fr: 'Son Général Stade & Menus', it: 'Audio Generale Stadio e Menu', de: 'Allgemeiner Stadion- & Menüton' },
  'Som Ativado': { en: 'Sound On', es: 'Sonido Activado', fr: 'Son Activé', it: 'Audio Attivo', de: 'Ton Ein' },
  'Silenciado': { en: 'Muted', es: 'Silenciado', fr: 'Muet', it: 'Disattivato', de: 'Stumm' },
  'Volume Principal': { en: 'Master Volume', es: 'Volumen Principal', fr: 'Volume Principal', it: 'Volume Principale', de: 'Hauptlautstärke' },
  'Testar Efeitos Sonoros': { en: 'Test Sound Effects', es: 'Probar Efectos de Sonido', fr: 'Tester les Effets Sonores', it: 'Testa Effetti Sonori', de: 'Soundeffekte testen' },
  'Testar Apito': { en: 'Test Whistle', es: 'Probar Silbato', fr: 'Tester le Sifflet', it: 'Testa Fischietto', de: 'Pfiff testen' },
  'Testar Grito de Gol': { en: 'Test Goal Roar', es: 'Probar Grito de Gol', fr: 'Tester Cri de But', it: 'Testa Urlo Gol', de: 'Torjubel testen' },
  'Testar Fanfarra de Título': { en: 'Test Trophy Fanfare', es: 'Probar Fanfarria de Título', fr: 'Tester Fanfare de Titre', it: 'Testa Fanfara Trofeo', de: 'Pokal-Fanfare testen' },
  'Velocidade Inicial do Simulador 2D': { en: 'Default 2D Match Speed', es: 'Velocidad Inicial del Simulador 2D', fr: 'Vitesse Initiale du Simulateur 2D', it: 'Velocità Iniziale Simulatore 2D', de: 'Standard-Spielgeschwindigkeit (2D)' },
  '1x Normal': { en: '1x Normal', es: '1x Normal', fr: '1x Normal', it: '1x Normale', de: '1x Normal' },
  '2x Rápido': { en: '2x Fast', es: '2x Rápido', fr: '2x Rapide', it: '2x Veloce', de: '2x Schnell' },
  '4x Turbo': { en: '4x Turbo', es: '4x Turbo', fr: '4x Turbo', it: '4x Turbo', de: '4x Turbo' },
  'Pausa Automática no Intervalo (45\')': { en: 'Auto-Pause at Halftime (45\')', es: 'Pausa Automática en el Descanso (45\')', fr: 'Pause Automatique à la Mi-Temps (45\')', it: 'Pausa Automatica all\'Intervallo (45\')', de: 'Automatische Halbzeitpause (45\')' },
  'Ativada': { en: 'Enabled', es: 'Activada', fr: 'Activée', it: 'Attiva', de: 'Aktiviert' },
  'Ativado': { en: 'Enabled', es: 'Activado', fr: 'Activé', it: 'Attivo', de: 'Aktiviert' },
  'Desativado': { en: 'Disabled', es: 'Desactivado', fr: 'Désactivé', it: 'Disattivato', de: 'Deaktiviert' },
  'Visível': { en: 'Visible', es: 'Visible', fr: 'Visible', it: 'Visibile', de: 'Sichtbar' },
  'Oculto': { en: 'Hidden', es: 'Oculto', fr: 'Masqué', it: 'Nascosto', de: 'Ausgeblendet' },
  'Salvamento Automático (IndexedDB)': { en: 'Auto-Save (IndexedDB)', es: 'Guardado Automático (IndexedDB)', fr: 'Sauvegarde Automatique (IndexedDB)', it: 'Salvataggio Automatico (IndexedDB)', de: 'Automatisches Speichern (IndexedDB)' },
  'Intervalo de Auto-Salvamento': { en: 'Auto-Save Interval', es: 'Intervalo de Autoguardado', fr: 'Intervalle de Sauvegarde Auto', it: 'Intervallo Salvataggio Automatico', de: 'Auto-Speicher-Intervall' },
  'Contínuo': { en: 'Continuous', es: 'Continuo', fr: 'Continu', it: 'Continuo', de: 'Fortlaufend' },
  'A cada ação': { en: 'Every action', es: 'Cada acción', fr: 'Chaque action', it: 'Ogni azione', de: 'Jede Aktion' },
  'Frequente': { en: 'Frequent', es: 'Frecuente', fr: 'Fréquent', it: 'Frequente', de: 'Häufig' },
  'Equilibrado': { en: 'Balanced', es: 'Equilibrado', fr: 'Équilibré', it: 'Bilanciato', de: 'Ausgewogen' },
  'Moderado': { en: 'Moderate', es: 'Moderado', fr: 'Modéré', it: 'Moderato', de: 'Mäßig' },
  'Espaçado': { en: 'Spaced', es: 'Espaciado', fr: 'Espacé', it: 'Ampio', de: 'Selten' },
  'Desligado': { en: 'Off', es: 'Apagado', fr: 'Désactivé', it: 'Spento', de: 'Aus' },
  'Nível de Exigência da Carreira': { en: 'Career Difficulty Level', es: 'Nivel de Dificultad de Carrera', fr: 'Niveau de Difficulté', it: 'Livello di Difficoltà', de: 'Karriere-Schwierigkeitsgrad' },
  'Casual': { en: 'Casual', es: 'Casual', fr: 'Détente', it: 'Facile', de: 'Locker' },
  'Padrão': { en: 'Standard', es: 'Estándar', fr: 'Standard', it: 'Standard', de: 'Standard' },
  'Realista': { en: 'Realistic', es: 'Realista', fr: 'Réaliste', it: 'Realistico', de: 'Realistisch' },
  'Automático': { en: 'Automatic', es: 'Automático', fr: 'Automatique', it: 'Automatico', de: 'Automatisch' },
  'Ultra Leve': { en: 'Ultra Light', es: 'Ultra Ligero', fr: 'Ultra Léger', it: 'Ultra Leggero', de: 'Ultra Leicht' },
  'Qualidade Máxima': { en: 'Max Quality', es: 'Calidad Máxima', fr: 'Qualité Maximale', it: 'Qualità Massima', de: 'Maximale Qualität' },
  'Restaurar Padrões': { en: 'Restore Defaults', es: 'Restaurar Valores', fr: 'Réinitialiser', it: 'Ripristina Predefiniti', de: 'Standard wiederherstellen' },
  'Apagar Todos os Saves': { en: 'Delete All Saves', es: 'Borrar Todas las Partidas', fr: 'Supprimer Toutes les Sauvegardes', it: 'Elimina Tutti i Salvataggi', de: 'Alle Spielstände löschen' },
  'Salvar e Voltar à Página Inicial': { en: 'Save & Return to Title', es: 'Guardar y Volver al Inicio', fr: "Sauvegarder & Retour à l'Accueil", it: 'Salva e Torna alla Home', de: 'Speichern & zum Hauptmenü' },
  'Voltar à Página Inicial': { en: 'Return to Title', es: 'Volver al Inicio', fr: "Retour à l'Accueil", it: 'Torna alla Home', de: 'Zum Hauptmenü' },
  'Atalhos Rápidos de Teclado': { en: 'Keyboard Shortcuts', es: 'Atajos de Teclado', fr: 'Raccourcis Clavier', it: 'Scorciatoie da Tastiera', de: 'Tastenkürzel' },

  // Club Hub & Match Actions
  'Jogar Partida': { en: 'Play Match', es: 'Jugar Partido', fr: 'Jouer le Match', it: 'Gioca Partita', de: 'Spiel starten' },
  'Jogar Agora': { en: 'Play Now', es: 'Jugar Ahora', fr: 'Jouer Maintenant', it: 'Gioca Ora', de: 'Jetzt spielen' },
  'Dia de Jogo': { en: 'Match Day', es: 'Día de Partido', fr: 'Jour de Match', it: 'Giorno di Gara', de: 'Spieltag' },
  'Avanço Inteligente': { en: 'Smart Advance', es: 'Avance Inteligente', fr: 'Avance Intelligente', it: 'Avanzamento Smart', de: 'Smart-Vorlauf' },
  'Ir ao Dia do Jogo': { en: 'Go to Match Day', es: 'Ir al Día de Partido', fr: 'Aller au Jour de Match', it: 'Vai alla Partita', de: 'Zum Spieltag' },
  'Avançar 1 Dia': { en: 'Advance 1 Day', es: 'Avanzar 1 Día', fr: 'Avancer 1 Jour', it: 'Avanza 1 Giorno', de: '1 Tag weiter' },
  'Resultado Instantâneo': { en: 'Instant Result', es: 'Resultado Instantáneo', fr: 'Résultat Instantané', it: 'Risultato Istantaneo', de: 'Sofortergebnis' },
  'Escalar Time': { en: 'Set Lineup', es: 'Alinear Equipo', fr: 'Composer Équipe', it: 'Schiera Squadra', de: 'Aufstellen' },
  'Tour 4 Passos': { en: '4-Step Tour', es: 'Tour 4 Pasos', fr: 'Guide 4 Étapes', it: 'Tour 4 Passi', de: '4-Schritte-Tour' },
  'Abrir Plantão ao Vivo': { en: 'Open Live Deadline Desk', es: 'Abrir Cierre en Vivo', fr: 'Ouvrir le Direct Mercato', it: 'Apri Diretta Mercato', de: 'Deadline-Day-Live öffnen' },
  'Encerrar Temporada': { en: 'Finish Season', es: 'Finalizar Temporada', fr: 'Terminer la Saison', it: 'Termina Stagione', de: 'Saison beenden' },
  'Mandante': { en: 'Home', es: 'Local', fr: 'Domicile', it: 'Casa', de: 'Heim' },
  'Visitante': { en: 'Away', es: 'Visitante', fr: 'Extérieur', it: 'Trasferta', de: 'Auswärts' },
  'Defesa': { en: 'Defense', es: 'Defensa', fr: 'Défense', it: 'Difesa', de: 'Abwehr' },
  'Meio-Campo': { en: 'Midfield', es: 'Mediocampo', fr: 'Milieu', it: 'Centrocampo', de: 'Mittelfeld' },
  'Meio': { en: 'Mid', es: 'Med', fr: 'Mil', it: 'Cen', de: 'Mit' },
  'Ataque': { en: 'Attack', es: 'Ataque', fr: 'Attaque', it: 'Attacco', de: 'Angriff' },
  'Perfil:': { en: 'Profile:', es: 'Perfil:', fr: 'Profil :', it: 'Profilo:', de: 'Profil:' },

  // Match Simulator 2D, Shouts, Stats & Ratings
  'Intervalo': { en: 'Halftime', es: 'Descanso', fr: 'Mi-Temps', it: 'Intervallo', de: 'Halbzeit' },
  'Fim de Jogo': { en: 'Full Time', es: 'Final del Partido', fr: 'Fin du Match', it: 'Fine Partita', de: 'Abpfiff' },
  'Iniciar 2º Tempo': { en: 'Start 2nd Half', es: 'Iniciar 2º Tiempo', fr: 'Lancer 2e Mi-Temps', it: 'Inizia 2° Tempo', de: '2. Halbzeit starten' },
  'Pausar': { en: 'Pause', es: 'Pausar', fr: 'Pause', it: 'Pausa', de: 'Pause' },
  'Retomar': { en: 'Resume', es: 'Reanudar', fr: 'Reprendre', it: 'Riprendi', de: 'Fortsetzen' },
  'Substituições': { en: 'Substitutions', es: 'Sustituciones', fr: 'Remplacements', it: 'Sostituzioni', de: 'Auswechslungen' },
  'Pressionar Alto': { en: 'High Press', es: 'Presión Alta', fr: 'Pressing Haut', it: 'Pressing Alto', de: 'Hohes Pressing' },
  'Tudo ou Nada': { en: 'All-Out Attack', es: 'Todo o Nada', fr: 'Tout pour le Tout', it: 'Tutto per Tutto', de: 'Alles oder Nichts' },
  'Incentivar': { en: 'Encourage', es: 'Animar', fr: 'Encourager', it: 'Incoraggia', de: 'Anfeuern' },
  'Cobrar Foco': { en: 'Demand Focus', es: 'Exigir Foco', fr: 'Exiger Concentration', it: 'Chiedi Concentrazione', de: 'Fokus fordern' },
  'Esfriar o Jogo': { en: 'Slow It Down', es: 'Enfriar el Partido', fr: 'Calmer le Jeu', it: 'Rallenta il Gioco', de: 'Tempo rausnehmen' },
  'Posse de Bola': { en: 'Possession', es: 'Posesión', fr: 'Possession', it: 'Possesso Palla', de: 'Ballbesitz' },
  'Finalizações': { en: 'Shots', es: 'Remates', fr: 'Tirs', it: 'Tiri', de: 'Schüsse' },
  'No Alvo': { en: 'On Target', es: 'Al Arco', fr: 'Cadrés', it: 'In Porta', de: 'Aufs Tor' },
  'Escanteios': { en: 'Corners', es: 'Córners', fr: 'Corners', it: 'Calci d\'angolo', de: 'Ecken' },
  'Faltas': { en: 'Fouls', es: 'Faltas', fr: 'Fautes', it: 'Falli', de: 'Fouls' },
  'Gols Esperados (xG)': { en: 'Expected Goals (xG)', es: 'Goles Esperados (xG)', fr: 'Buts Attendus (xG)', it: 'Gol Attesi (xG)', de: 'Expected Goals (xG)' },
  'xG (Gols Esperados)': { en: 'xG (Expected Goals)', es: 'xG (Goles Esperados)', fr: 'xG (Buts Attendus)', it: 'xG (Gol Attesi)', de: 'xG (Expected Goals)' },
  'Notas dos Jogadores': { en: 'Player Ratings', es: 'Notas de Jugadores', fr: 'Notes des Joueurs', it: 'Pagelle Giocatori', de: 'Spielerbewertungen' },
  'Pular para Intervalo': { en: 'Skip to Halftime', es: 'Ir al Descanso', fr: 'Aller à la Mi-Temps', it: 'Salta all\'Intervallo', de: 'Zur Halbzeit' },
  'Pular para o Fim': { en: 'Skip to Full Time', es: 'Ir al Final', fr: 'Aller à la Fin', it: 'Salta alla Fine', de: 'Zum Abpfiff' },

  // Tactics, Presets & Squad
  'Perfis Táticos Salvos (3 Slots)': { en: 'Saved Tactical Presets (3 Slots)', es: 'Perfiles Tácticos Guardados (3 Slots)', fr: 'Profils Tactiques Sauvegardés (3 Slots)', it: 'Profili Tattici Salvati (3 Slot)', de: 'Gespeicherte Taktik-Profile (3 Slots)' },
  'Salvar Atual': { en: 'Save Current', es: 'Guardar Actual', fr: 'Enregistrer Actuel', it: 'Salva Attuale', de: 'Aktuelle speichern' },
  'Formação': { en: 'Formation', es: 'Formación', fr: 'Formation', it: 'Modulo', de: 'Formation' },
  'Mentalidade': { en: 'Mentality', es: 'Mentalidad', fr: 'Mentalité', it: 'Mentalità', de: 'Mentalität' },
  'Marcação': { en: 'Marking', es: 'Marcaje', fr: 'Marquage', it: 'Marcatura', de: 'Deckung' },
  'Estilo de Passe': { en: 'Passing Style', es: 'Estilo de Pase', fr: 'Style de Passe', it: 'Stile di Passaggio', de: 'Passspiel' },
  'Capitão': { en: 'Captain', es: 'Capitán', fr: 'Capitaine', it: 'Capitano', de: 'Kapitän' },
  'Batedor de Pênaltis': { en: 'Penalty Taker', es: 'Lanzador de Penales', fr: 'Tireur de Penalties', it: 'Rigorista', de: 'Elfmeterschütze' },
  'Batedor de Faltas': { en: 'Free-Kick Taker', es: 'Lanzador de Faltas', fr: 'Tireur de Coups Francs', it: 'Tiratore Punizioni', de: 'Freistoßschütze' },
  'Batedor de Escanteios': { en: 'Corner Taker', es: 'Lanzador de Córners', fr: 'Tireur de Corners', it: 'Tiratore Angoli', de: 'Eckenschütze' },
  'Titulares': { en: 'Starters', es: 'Titulares', fr: 'Titulaires', it: 'Titolari', de: 'Startelf' },
  'Reservas': { en: 'Substitutes', es: 'Suplentes', fr: 'Remplaçants', it: 'Riserve', de: 'Bank' },
  'Titular': { en: 'Starter', es: 'Titular', fr: 'Titulaire', it: 'Titolare', de: 'Startelf' },
  'Reserva': { en: 'Sub', es: 'Suplente', fr: 'Remplaçant', it: 'Riserva', de: 'Ersatz' },
  'Lesionado': { en: 'Injured', es: 'Lesionado', fr: 'Blessé', it: 'Infortunato', de: 'Verletzt' },
  'Suspenso': { en: 'Suspended', es: 'Suspendido', fr: 'Suspendu', it: 'Squalificato', de: 'Gesperrt' },
  'Posição': { en: 'Position', es: 'Posición', fr: 'Poste', it: 'Ruolo', de: 'Position' },
  'Idade': { en: 'Age', es: 'Edad', fr: 'Âge', it: 'Età', de: 'Alter' },
  'Força': { en: 'Rating', es: 'Media', fr: 'Note', it: 'Valore', de: 'Stärke' },
  'Condição': { en: 'Fitness', es: 'Condición', fr: 'Forme', it: 'Condizione', de: 'Fitness' },
  'Moral': { en: 'Morale', es: 'Moral', fr: 'Moral', it: 'Morale', de: 'Moral' },
  'Salário': { en: 'Wage', es: 'Salario', fr: 'Salaire', it: 'Stipendio', de: 'Gehalt' },
  'Contrato': { en: 'Contract', es: 'Contrato', fr: 'Contrat', it: 'Contratto', de: 'Vertrag' },
  'Valor de Mercado': { en: 'Market Value', es: 'Valor de Mercado', fr: 'Valeur Marchande', it: 'Valore di Mercato', de: 'Marktwert' },
  'Gols': { en: 'Goals', es: 'Goles', fr: 'Buts', it: 'Gol', de: 'Tore' },
  'Assistências': { en: 'Assists', es: 'Asistencias', fr: 'Passes D.', it: 'Assist', de: 'Vorlagen' },
  'Jogos': { en: 'Matches', es: 'Partidos', fr: 'Matchs', it: 'Partite', de: 'Spiele' },
  'Vitórias': { en: 'Wins', es: 'Victorias', fr: 'Victoires', it: 'Vittorie', de: 'Siege' },
  'Empates': { en: 'Draws', es: 'Empates', fr: 'Nuls', it: 'Pareggi', de: 'Unentschieden' },
  'Derrotas': { en: 'Losses', es: 'Derrotas', fr: 'Défaites', it: 'Sconfitte', de: 'Niederlagen' },
  'Pontos': { en: 'Points', es: 'Puntos', fr: 'Points', it: 'Punti', de: 'Punkte' },

  // Board, Market, Sharing, Saves
  'Metas': { en: 'Objectives', es: 'Objetivos', fr: 'Objectifs', it: 'Obiettivi', de: 'Ziele' },
  'Vestiário': { en: 'Dressing Room', es: 'Vestuario', fr: 'Vestiaire', it: 'Spogliatoio', de: 'Kabine' },
  'Imprensa': { en: 'Press', es: 'Prensa', fr: 'Presse', it: 'Stampa', de: 'Presse' },
  'Propostas': { en: 'Offers', es: 'Ofertas', fr: 'Offres', it: 'Offerte', de: 'Angebote' },
  'Dança das Cadeiras & Técnicos': { en: 'Manager Carousel', es: 'Carrusel de Técnicos', fr: 'Valise des Entraîneurs', it: 'Valzer delle Panchine', de: 'Trainerkarussell' },
  'Histórico': { en: 'History', es: 'Historial', fr: 'Historique', it: 'Storico', de: 'Verlauf' },
  'Conquistas': { en: 'Achievements', es: 'Logros', fr: 'Succès', it: 'Obiettivi', de: 'Erfolge' },
  'Agentes Livres': { en: 'Free Agents', es: 'Agentes Libres', fr: 'Joueurs Libres', it: 'Svincolati', de: 'Vertragslos' },
  'Empréstimos': { en: 'Loans', es: 'Préstamos', fr: 'Prêts', it: 'Prestiti', de: 'Leihen' },
  'Pré-Contratos': { en: 'Pre-Contracts', es: 'Precontratos', fr: 'Pré-Contrats', it: 'Pre-Contratti', de: 'Vorverträge' },
  'Baixar Card PNG': { en: 'Download PNG Card', es: 'Descargar Card PNG', fr: 'Télécharger Carte PNG', it: 'Scarica Card PNG', de: 'PNG-Karte laden' },
  'Baixar / Compartilhar Card (PNG)': { en: 'Download / Share Card (PNG)', es: 'Descargar / Compartir Card (PNG)', fr: 'Télécharger / Partager Carte (PNG)', it: 'Scarica / Condividi Card (PNG)', de: 'Karte teilen / laden (PNG)' },
  'Compartilhar Card (PNG)': { en: 'Share Card (PNG)', es: 'Compartir Card (PNG)', fr: 'Partager Carte (PNG)', it: 'Condividi Card (PNG)', de: 'Karte teilen (PNG)' },
  'Salvar e Sair ao Início': { en: 'Save & Exit to Title', es: 'Guardar y Salir al Inicio', fr: 'Sauvegarder & Quitter', it: 'Salva ed Esci', de: 'Speichern & Beenden' },
  'Sair ao Início': { en: 'Exit to Title', es: 'Salir al Inicio', fr: 'Quitter vers Accueil', it: 'Esci alla Home', de: 'Zum Hauptmenü' },
  'Espaços Locais no Navegador (5 Carreiras)': { en: 'Local Browser Slots (5 Careers)', es: 'Espacios Locales (5 Carreras)', fr: 'Emplacements Locaux (5 Carrières)', it: 'Slot Locali Browser (5 Carriere)', de: 'Lokale Speicherplätze (5 Karrieren)' },
  'Buscar': { en: 'Search', es: 'Buscar', fr: 'Rechercher', it: 'Cerca', de: 'Suchen' },
  'Buscar em todos os 930+ clubes...': {
    en: 'Search across all 930+ clubs...',
    es: 'Buscar en los más de 930 clubes...',
    fr: 'Rechercher parmi les 930+ clubs...',
    it: 'Cerca tra tutti i 930+ club...',
    de: 'In allen 930+ Vereinen suchen...',
  },
  'Plantão: Último Dia da Janela (Deadline Day)': {
    en: 'Live Desk: Transfer Deadline Day',
    es: 'Especial: Último Día de Mercado (Deadline Day)',
    fr: 'Direct : Dernier Jour du Mercato (Deadline Day)',
    it: 'Diretta: Ultimo Giorno di Mercato (Deadline Day)',
    de: 'Live-Ticker: Transfer-Deadline-Day',
  },
  'Propostas Relâmpago': { en: 'Flash Offers', es: 'Ofertas Relámpago', fr: 'Offres Flash', it: 'Offerte Lampo', de: 'Blitz-Angebote' },
  'Oportunidades de Última Hora': { en: 'Last-Minute Bargains', es: 'Oportunidades de Última Hora', fr: 'Bons Plans de Dernière Minute', it: 'Occasioni Last-Minute', de: 'Last-Minute-Schnäppchen' },
  'Avançar +2 Horas': { en: 'Advance +2 Hours', es: 'Avanzar +2 Horas', fr: 'Avancer +2 Heures', it: 'Avanza +2 Ore', de: '+2 Stunden weiter' },
  'Encerrar Plantão': { en: 'Close Deadline Day', es: 'Cerrar Mercado', fr: 'Clôturer le Mercato', it: 'Chiudi Mercato', de: 'Deadline Day beenden' },
  'Aceitar': { en: 'Accept', es: 'Aceptar', fr: 'Accepter', it: 'Accetta', de: 'Annehmen' },
  'Recusar': { en: 'Reject', es: 'Rechazar', fr: 'Refuser', it: 'Rifiuta', de: 'Ablehnen' },
  'Contratar': { en: 'Sign Player', es: 'Fichar', fr: 'Recruter', it: 'Acquista', de: 'Verpflichten' },
  'Entendi, não mostrar novamente': {
    en: 'Got it, do not show again',
    es: 'Entendido, no mostrar de nuevo',
    fr: 'Compris, ne plus afficher',
    it: 'Capito, non mostrare più',
    de: 'Verstanden, nicht mehr anzeigen',
  },
  'Guia Rápido do Treinador': {
    en: 'Quick Manager Guide',
    es: 'Guía Rápida del Entrenador',
    fr: "Guide Rapide de l'Entraîneur",
    it: 'Guida Rapida Allenatore',
    de: 'Kurzanleitung für Trainer',
  },
};

interface PatternRule {
  regex: RegExp;
  replace: (match: RegExpMatchArray, lang: NonPtLang) => string;
}

const PATTERN_RULES: PatternRule[] = [
  {
    regex: /^Espaço\s+(\d+)$/i,
    replace: (m, l) =>
      ({
        en: `Slot ${m[1]}`,
        es: `Espacio ${m[1]}`,
        fr: `Empl. ${m[1]}`,
        it: `Slot ${m[1]}`,
        de: `Platz ${m[1]}`,
      })[l],
  },
  {
    regex: /^Rodada\s+(\d+)(.*)$/i,
    replace: (m, l) =>
      ({
        en: `Round ${m[1]}${m[2]}`,
        es: `Jornada ${m[1]}${m[2]}`,
        fr: `Journée ${m[1]}${m[2]}`,
        it: `Giornata ${m[1]}${m[2]}`,
        de: `Spieltag ${m[1]}${m[2]}`,
      })[l],
  },
  {
    regex: /^Temporada\s+(.+)$/i,
    replace: (m, l) =>
      ({
        en: `Season ${m[1]}`,
        es: `Temporada ${m[1]}`,
        fr: `Saison ${m[1]}`,
        it: `Stagione ${m[1]}`,
        de: `Saison ${m[1]}`,
      })[l],
  },
  {
    regex: /^Passo\s+(\d+)$/i,
    replace: (m, l) =>
      ({
        en: `Step ${m[1]}`,
        es: `Paso ${m[1]}`,
        fr: `Étape ${m[1]}`,
        it: `Passo ${m[1]}`,
        de: `Schritt ${m[1]}`,
      })[l],
  },
  {
    regex: /^Assumir\s+(.+?)\s*\(Espaço\s+(\d+)\)$/i,
    replace: (m, l) =>
      ({
        en: `Manage ${m[1]} (Slot ${m[2]})`,
        es: `Dirigir ${m[1]} (Espacio ${m[2]})`,
        fr: `Diriger ${m[1]} (Empl. ${m[2]})`,
        it: `Allena ${m[1]} (Slot ${m[2]})`,
        de: `Übernehmen: ${m[1]} (Platz ${m[2]})`,
      })[l],
  },
  {
    regex: /^Usar Técnico Real:\s*(.+)$/i,
    replace: (m, l) =>
      ({
        en: `Use Real Manager: ${m[1]}`,
        es: `Usar Técnico Real: ${m[1]}`,
        fr: `Utiliser Coach Réel : ${m[1]}`,
        it: `Usa Allenatore Reale: ${m[1]}`,
        de: `Echten Trainer nutzen: ${m[1]}`,
      })[l],
  },
  {
    regex: /^A cada\s+(\d+)\s*min$/i,
    replace: (m, l) =>
      ({
        en: `Every ${m[1]} min`,
        es: `Cada ${m[1]} min`,
        fr: `Toutes les ${m[1]} min`,
        it: `Ogni ${m[1]} min`,
        de: `Alle ${m[1]} Min.`,
      })[l],
  },
  {
    regex: /^Ativo\s*·\s*Contínuo$/i,
    replace: (_m, l) =>
      ({
        en: 'Active · Continuous',
        es: 'Activo · Continuo',
        fr: 'Actif · Continu',
        it: 'Attivo · Continuo',
        de: 'Aktiv · Fortlaufend',
      })[l],
  },
  {
    regex: /^Ativo\s*·\s*(\d+)\s*min$/i,
    replace: (m, l) =>
      ({
        en: `Active · ${m[1]} min`,
        es: `Activo · ${m[1]} min`,
        fr: `Actif · ${m[1]} min`,
        it: `Attivo · ${m[1]} min`,
        de: `Aktiv · ${m[1]} Min.`,
      })[l],
  },
  {
    regex: /^\(em\s+(\d+)\s+dias?\)$/i,
    replace: (m, l) => {
      const n = Number(m[1]);
      return {
        en: `(in ${n} ${n === 1 ? 'day' : 'days'})`,
        es: `(en ${n} ${n === 1 ? 'día' : 'días'})`,
        fr: `(dans ${n} ${n === 1 ? 'jour' : 'jours'})`,
        it: `(tra ${n} ${n === 1 ? 'giorno' : 'giorni'})`,
        de: `(in ${n} ${n === 1 ? 'Tag' : 'Tagen'})`,
      }[l];
    },
  },
  {
    regex: /^Ver\s+(.+)$/i,
    replace: (m, l) =>
      ({
        en: `View ${m[1]}`,
        es: `Ver ${m[1]}`,
        fr: `Voir ${m[1]}`,
        it: `Vedi ${m[1]}`,
        de: `Ansehen: ${m[1]}`,
      })[l],
  },
  {
    regex: /^(\d+)\s+atletas$/i,
    replace: (m, l) =>
      ({
        en: `${m[1]} players`,
        es: `${m[1]} jugadores`,
        fr: `${m[1]} joueurs`,
        it: `${m[1]} giocatori`,
        de: `${m[1]} Spieler`,
      })[l],
  },
  {
    regex: /^(.+?)\s+lugares$/i,
    replace: (m, l) =>
      ({
        en: `${m[1]} seats`,
        es: `${m[1]} asientos`,
        fr: `${m[1]} places`,
        it: `${m[1]} posti`,
        de: `${m[1]} Plätze`,
      })[l],
  },
  {
    regex: /^Especialidade:\s*(.+)$/i,
    replace: (m, l) => {
      const val = translateText(m[1], l);
      return {
        en: `Specialty: ${val}`,
        es: `Especialidad: ${val}`,
        fr: `Spécialité : ${val}`,
        it: `Specialità: ${val}`,
        de: `Spezialität: ${val}`,
      }[l];
    },
  },
];

// Normalized case-insensitive map for fast O(1) lookup
const NORMALIZED_EXACT_MAP = new Map<string, TranslationRow>();
for (const [pt, row] of Object.entries(EXACT_PHRASES)) {
  NORMALIZED_EXACT_MAP.set(pt.trim(), row);
}

/**
 * Translates a Portuguese UI string to the target language.
 * Returns original text untouched when `lang === 'pt-BR'` or when no curated match exists.
 */
export function translateText(rawText: string, lang: GameLanguage): string {
  if (lang === 'pt-BR' || !rawText) return rawText;

  const trimmed = rawText.trim();
  if (!trimmed || trimmed.length > 180) return rawText;

  // Preserve leading/trailing whitespace
  const leadingWs = rawText.match(/^\s*/)?.[0] || '';
  const trailingWs = rawText.match(/\s*$/)?.[0] || '';

  const exact = NORMALIZED_EXACT_MAP.get(trimmed);
  if (exact) {
    return `${leadingWs}${exact[lang]}${trailingWs}`;
  }

  for (const rule of PATTERN_RULES) {
    const match = trimmed.match(rule.regex);
    if (match) {
      return `${leadingWs}${rule.replace(match, lang)}${trailingWs}`;
    }
  }

  // Handle simple compound labels separated by " · " where every segment is translatable
  if (trimmed.includes(' · ')) {
    const parts = trimmed.split(' · ');
    if (parts.length <= 4) {
      let changed = false;
      const mapped = parts.map((p) => {
        const tr = translateText(p, lang);
        if (tr !== p) changed = true;
        return tr;
      });
      if (changed) {
        return `${leadingWs}${mapped.join(' · ')}${trailingWs}`;
      }
    }
  }

  return rawText;
}
