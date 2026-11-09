---
name: video-prodotto
description: Regole e ricette per creare o rivedere un video promo di prodotto in Remotion (voce fuori campo, musica, evidenziazioni su screenshot, CTA). Usala quando l'utente chiede di creare, montare, rivedere o correggere un video di prodotto / spot / demo video, di aggiungere o cambiare la voce o la musica, o di sistemare sincronizzazione voce-immagini. Nasce dalle correzioni richieste sui video SS9 Brand Studio e OrderMatch.
---

# Video di prodotto: regole dalle revisioni

Regole emerse dalle correzioni dell'utente. Applicale **dalla prima versione**, non aspettare che vengano chieste di nuovo.

## Ritmo e struttura
- **Le cose più importanti all'inizio.** Apri sul risultato reale e sul caso principale; niente intro lente "problema → reveal". Durata indicativa 90–120 s, non 180.
- Ogni schermata 3–4 s **più ~1 s di respiro dopo la fine della frase**: cambiare schermata appena finisce la voce sembra frettoloso (l'utente ha chiesto di rallentare da 110 a 120 s). Evidenziazioni entro 0,5 s. Se una schermata deve mostrare più cose in sequenza, **allungala** (es. 6 s) togliendo tempo a schermate con poca voce, a durata totale costante.
- **Nessun buco di voce > ~5 s.** Dopo ogni modifica controlla in `voiceover.json` lo stacco massimo tra clip consecutive; riempi con frasi brevi e vere che descrivono ciò che si vede.

## Testi
- Il nome dell'azienda del cliente si usa **solo come nome del prodotto** (es. "SS9 Brand Studio"). Altrove parla allo spettatore: "il tuo logo", "il tuo brand", "i dati ufficiali del tuo brand" (il video è per chi adotterà il prodotto, non per chi lo produce).
- Niente claim inventati: ogni frase deve essere verificabile in UI o nelle fonti; segna nel registro quelli da confermare.
- **CTA: mai il link all'app** se gli utenti non possono registrarsi da soli. Usa "Richiedi una demo" + pagina contatti del sito, dopo aver verificato che l'ancora esista (`curl` + grep; nelle SPA cerca l'id nel bundle JS).

## Voce
- Le voci TTS classiche (Edge/Azure standard, Piper) sono **troppo robotiche** per l'utente. Default: **Gemini TTS** (`gemini-3.8-flash-tts` o più recente, elenca i modelli con `GET v1beta/models`) con una voce scelta su campioni (es. Achird, maschile amichevole). Prima di scegliere, genera 3–4 campioni sullo stesso testo e fai scegliere.
- La "voce di Claude" non è disponibile come API: dillo subito e proponi alternative.
- Ricetta Gemini (trappole già pagate):
  - Chiave da `GEMINI_API_KEY`; su Windows dopo `setx` la sessione corrente non la vede: leggila dal registro (`HKCU\Environment`). Mai stamparla o scriverla in file.
  - La risposta `inlineData` è **già un WAV completo (RIFF)**: salvala così com'è, non aggiungere un altro header (fa un click iniziale).
  - **Il modello legge ad alta voce le istruzioni di stile**, soprattutto su testi brevi ma **anche con il copione intero** (OrderMatch: ha letto "Fai una pausa lunga… tra un paragrafo e l'altro. Testo." prima del primo paragrafo). Quindi: **una sola richiesta con tutto il copione** (paragrafi separati da riga vuota), poi taglio in clip; scarta tutto ciò che precede il primo paragrafo.
  - Il piano gratuito ha **~10 richieste TTS al giorno per modello**: budget di 1–3 chiamate per giro; per correggere poche frasi fai una richiesta "patch" con la frase precedente come contesto e tieni in cache ogni wav grezzo.
  - **Il taglio per sole pause non è affidabile**: "le N pause più lunghe" attacca le frasi brevi; la programmazione dinamica sulle durate attese (~15 caratteri/s) **assorbe lo stile letto ad alta voce e sfasa tutte le clip di un pezzo** (ogni clip conteneva la frase precedente, con durate tutte "plausibili"), e le pause interne a un paragrafo possono essere lunghe quanto quelle tra paragrafi. Ricetta giusta: **trascrivi il wav grezzo con i tempi** (modello testuale Gemini, a pezzi brevi) per trovare l'inizio reale di ogni paragrafo, poi taglia a metà della pausa che lo precede (lista `PARAGRAPH_STARTS` nello script; la DP solo come ripiego). Esempio: `OrderMatch_video/tools/audio/gen_voiceover.py`.
  - **Verifica ogni clip trascrivendola PRIMA di costruire timeline ed evidenziazioni**: la durata coerente con il testo non prova niente. Ogni clip deve contenere esattamente la sua frase, niente stile, niente pezzi della vicina. Se la quota lo impedisce, dichiara all'utente quali frasi non sono verificate e i loro timecode.
  - Trascrizione con Gemini testuale: `gemini-2.5-flash` va presto in 429 → ripiega su `gemini-2.5-flash-lite` (meno preciso: "listino" diventa "all'estino", ricontrolla i dubbi); metti un `timeout` a ogni chiamata (un wav di 20 s ha bloccato la richiesta per 5 min); una chiamata per clip, in sequenza.
  - Primo passaggio con `MAX_ATEMPO = 1.0` e fine blocco lontana: misura le durate vere, poi fissa gli shot = ritardo ~0,3 s + voce + ≥1 s di respiro e rilancia lo script sul wav in cache (nessuna chiamata TTS). Altrimenti l'atempo accelera la voce per farla entrare in slot stimati male.
  - Pronuncia: nel testo per il TTS scrivi sigle e nomi stranieri come si leggono ("pi di effe", "ci esse vu", nome di prodotto separato in parole); i sottotitoli usano il testo normale.
  - Inizio delle parole per le evidenziazioni: senza riconoscitore vocale locale si stima dall'inviluppo RMS (inizio di segmento = affidabile, proporzione di sillabe dentro un segmento = stimato, errore ~0,1–0,2 s). Dichiara all'utente quali sono stimate e i timecode da ascoltare.
  - Limitatore sulla voce (es. `alimiter` ~-8 dBFS) se il mix va in clip; poi regola il guadagno master.
- **Tagli e pause dentro una clip**: taglia solo nei veri minimi dell'inviluppo (RMS 5 ms), dopo che la parola è decaduta del tutto. Le occlusive sorde (il "c" di "pubblico") creano un falso silenzio a metà parola: controlla che dopo il punto di taglio non ci sia un altro picco della stessa parola. Dissolvenza di ~10 ms a ogni giunzione.
- Esempi completi: `SS9_Brand_Studio_video/tools/audio/gen_voiceover.py` (generazione unica + split, `--patch`, `split_b2c`); `OrderMatch_video/tools/audio/gen_voiceover.py` (taglio sugli inizi di paragrafo trascritti, `PARAGRAPH_STARTS`) e `tools/audio/word_onsets.py` (stima degli inizi di parola).

## Schermate dall'app (Claude in Chrome)
- Usa l'app **da operatore** su un caso dimostrativo completo (inserisci, correggi, approva, scarica) chiedendo prima il consenso per login/OAuth e per le azioni che modificano dati; un caso con errori veri (es. un abbinamento sbagliato proposto dall'app) racconta bene il controllo umano.
- Lo `screenshot` dell'estensione è ridotto a 1568 px in JPEG: per catture nitide usa `zoom` su una regione con `save_to_disk` **senza `scale`** (con `scale` anche il file salvato viene ridotto) → PNG a pixel nativi CSS. Ritaglia la colonna di contenuto ed escludi la barra con il nome dell'utente.
- Prima di ogni cattura: sposta il mouse fuori dall'area (hover in un angolo), togli lo spellcheck dalle textarea (`el.spellcheck=false`) e fai blur; cattura toast e dialoghi subito, spariscono in pochi secondi.
- Una cattura stretta (es. 930 px) non va ingrandita oltre ~1,1×: per le scene hero ricatturala più grande prima di montare.
- I PDF prodotti dall'app (in `shell:Downloads`, non sempre `~/Downloads`) si rendono in PNG con PyMuPDF a 200 dpi.

## Musica ed effetti
- Musica royalty free per uso commerciale (es. Pixabay Content License); annota licenza, etichetta "AI generated" e assenza di garanzia Content ID in `LICENZE.md`. Fai scegliere il brano all'utente.
- Il drop/ritornello della musica cade sull'inizio della CTA. Se la durata cambia, sposta il drop con la CTA: per allungare **ripeti battute intere di una sezione stabile prima del drop** (sulla griglia delle battute, crossfade equal-power ~0,25 s sul battere; scegli il punto con analisi RMS/spettro/croma per battuta), mai il crescendo che porta al drop. Tieni un backup della traccia precedente. Esempio: `tools/audio/cut_pixabay.py`.
- Ducking: musica ~-12 dB senza voce, ~-20 dB sotto la voce. Master a -16 LUFS ±1, true peak ≤ -1 dBTP.
- Riuso di un brano già tagliato (es. `music.wav` di Brand Studio: 120,000 s, drop a 107,17 s): **non ritagliarlo**, progetta la timeline attorno a lui (CTA al frame 3210, totale 3600). Misura prima la posizione del drop (RMS per secondo) e leggi il docstring dello script di taglio: il README può essere rimasto alla durata vecchia.

## Sincronizzazione voce-immagini
- Ogni evidenziazione entra ~0,2 s (≈7 frame) **prima** della parola che la nomina e resta ≥1 s. Misura i tempi delle parole sulla forma d'onda, non a stima.
- Se le parole di un elenco sono troppo vicine per evidenziazioni leggibili, allunga la schermata, dividi la frase in due clip e aggiungi pause brevi (~0,25 s) **nei veri silenzi**.
- Gli effetti "click" seguono l'ingresso delle evidenziazioni: ritimali quando cambi i tempi.

## Rallentare un video già sincronizzato
- Prima chiedi di quanto (es. +10/+20/+35%), con le conseguenze: oltre ~+20% i buchi di voce rischiano di superare 5 s e servono nuove frasi.
- La voce non si rigenera: si aggiungono frame **alla fine degli shot** (pausa dopo la frase), così ogni `from` di evidenziazioni e camera resta agganciato alla parola. Allunga solo la durata, l'ultimo keyframe della camera e il `to` dell'ultima evidenziazione.
- Distribuisci i frame in base alla "coda" di ogni shot (fine shot − fine dell'ultima frase): molto agli shot con coda ~0, niente a quelli con già ≥3 s di silenzio o che precedono un buco di voce lungo.
- Blocchi con più shot sotto **una sola frase continua**: allunga solo l'ultimo shot, altrimenti gli shot successivi arrivano in ritardo sulle parole.
- Prepara tu la tabella (nuove durate, spostamento cumulativo di ogni clip di voce, click e chime ricalcolati come inizio shot + offset) e passala al subagente come dati, non come regole da ricavare. Aggiorna anche `STATIC_FROM`, il controllo della durata totale, il fotogramma "ultimi 4 s" degli stills, la durata del mix di anteprima e i sottotitoli.

## Consegna e verifica
- Ogni render è una nuova versione (`out/<nome>-vN.mp4`); non sovrascrivere le precedenti (l'utente le rinomina e confronta).
- Prima di dire "fatto": ffprobe (durata esatta, h264 + AAC 48 kHz), loudnorm, silencedetect, fotogrammi estratti nei punti modificati. Dichiara cosa non è verificabile senza ascolto (pronuncia, naturalezza delle pause) e indica i timecode da ascoltare.
