---
name: log-task-hours
description: Registra le ore effettive (Completed Work) su Azure DevOps creando un Task figlio del ticket, deducendo ticket, ore e titolo dal lavoro svolto con Claude. Usala SOLO quando l'utente chiede di inserire/segnare/registrare le ore (es. "segna le ore", "/log-task-hours", "/log-task-hours 15175").
argument-hint: "[id-ticket]"
---

Registra le ore effettive su un ticket Azure DevOps (org di default di `az devops configure --list`, qualsiasi progetto; se non è impostata chiedila all'utente e passala con `--org`). L'utente NON fornisce ore né titolo: li deduci tu.

1. **Ticket**: da `$ARGUMENTS`; altrimenti dalla conversazione corrente, dal nome del branch o da cartelle tipo `Ticket-<id>`. Se restano più candidati o nessuno, chiedi quale (una domanda).
2. **Padre**: `az boards work-item show --id <id> --expand relations -o json` → `System.TeamProject`, `System.AreaPath`, `System.IterationPath`, `System.Title`, figli (`System.LinkTypes.Hierarchy-Forward`).
3. **Ore già registrate**: per ogni Task figlio leggi `Custom.Effectivedate` (o `System.CreatedDate` se assente); prendi la più recente come `<dal>`, per non contare due volte lo stesso lavoro.
4. **Ore lavorate**: `python ~/.claude/skills/log-task-hours/active_session_time.py <id> [--dal <dal>]`. Somma il tempo attivo delle sessioni Claude Code che citano il ticket (pause >15 min escluse), arrotondato per eccesso a **multipli di 0.5** (minimo 0.5). Se TOTALE è 0, dillo e chiedi le ore.
5. **Titolo** — scelto con le regole Clean Code sui nomi significativi:
   - **rivela l'intento**: dice cosa è stato fatto e su cosa, senza bisogno di aprire il ticket (verbo/azione + oggetto di dominio: "Ripristino impianti LA RUSSA a mai rivalutati");
   - **linguaggio di dominio**: usa i termini del ticket e del business (impianto, verifica, amministratore, rivalutazione ISTAT…), non dettagli tecnici superflui;
   - **niente parole rumore o generiche**: vietati "fix", "varie", "lavoro", "attività", "modifiche", "ticket <id>";
   - **specifico ma breve**: max ~60 caratteri, italiano, una sola cosa; se le sessioni coprono più attività, nomina quella prevalente.
   Fonti: la conversazione corrente, i record `ai-title` e i messaggi utente delle sessioni elencate dallo script.
6. **Riepilogo**: mostra in una riga `#<id> "<titolo padre>" → Task "<titolo>" <ore>h (<sessioni/fasce orarie>)` e procedi senza chiedere conferma.
7. **Crea il Task** (stesso progetto/area/iteration del padre):
   ```
   az boards work-item create --project "<TeamProject>" --type Task --title "<titolo>" --assigned-to "<utente: `az account show --query user.name -o tsv`>" --area "<AreaPath>" --iteration "<IterationPath>" --fields "Microsoft.VSTS.Scheduling.CompletedWork=<ore>" "Custom.Effectivedate=<ora corrente UTC, formato YYYY-MM-DDTHH:MM:SSZ>" -o json
   ```
   Se `Custom.Effectivedate` non esiste nel processo del progetto, riprova senza e segnalalo.
8. **Collega e chiudi**: `az boards work-item relation add --id <nuovo> --relation-type parent --target-id <id>`, poi `az boards work-item update --id <nuovo> --state Done`.
9. **Verifica**: rileggi il Task (`CompletedWork`, `Custom.Effectivedate`, `System.Parent`, `State`).

Output: una riga, es. `✅ Task #15345 "Analisi e fix rivalutazione ISTAT" → 2.5h su #15175 (Done)`. Non toccare il ticket padre.
