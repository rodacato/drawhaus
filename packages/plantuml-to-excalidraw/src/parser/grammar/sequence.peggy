// PlantUML Sequence Diagram PEG Grammar (V1)

Diagram
  = _ startuml? _ elements:ElementList _ enduml? _ {
      const participants = [];
      const messages = [];
      const participantMap = new Map();
      let order = 0;

      function ensureParticipant(name) {
        if (!participantMap.has(name)) {
          const p = { name, alias: null, kind: "participant", order: order++ };
          participantMap.set(name, p);
          participants.push(p);
        }
      }

      for (const el of elements) {
        if (!el) continue;
        if (el.type === "participant") {
          const key = el.value.alias ?? el.value.name;
          if (!participantMap.has(key)) {
            el.value.order = order++;
            participantMap.set(key, el.value);
            participants.push(el.value);
          }
        } else if (el.type === "message") {
          ensureParticipant(el.value.from);
          ensureParticipant(el.value.to);
          messages.push(el.value);
        }
      }

      return { type: "sequence", participants, messages, notes: [] };
    }

startuml = "@startuml" (!EOL .)* EOL
enduml   = "@enduml" (!EOL .)*

ElementList
  = elements:(Element _)* {
      return elements.map(e => e[0]);
    }

Element
  = Comment { return null; }
  / SkinParam { return null; }
  / HideDirective { return null; }
  / AutoNumber { return null; }
  / Title { return null; }
  / ParticipantDecl
  / Message

// --- Comments ---
Comment
  = "'" (!EOL .)* EOL?
  / "/'" (!("'/") .)* "'/"

// --- Directives we ignore ---
SkinParam
  = "skinparam" __ (!("{" / EOL) .)* _ "{" (!"}" .)* "}"
  / "skinparam" __ (!EOL .)* EOL?

HideDirective
  = "hide" __ (!EOL .)* EOL?

AutoNumber
  = "autonumber" (!EOL .)* EOL?

Title
  = "title" __ (!EOL .)* EOL?

// --- Participant declarations ---
ParticipantDecl
  = kind:ParticipantKind __ label:QuotedString __ "as" __ name:Identifier _ color:Color? {
      return {
        type: "participant",
        value: { name, alias: name, kind, label, order: 0 }
      };
    }
  / kind:ParticipantKind __ name:Identifier __ "as" __ alias:Identifier _ color:Color? {
      return {
        type: "participant",
        value: { name: alias, alias, kind, label: name, order: 0 }
      };
    }
  / kind:ParticipantKind __ label:QuotedString _ color:Color? {
      return {
        type: "participant",
        value: { name: label, alias: null, kind, label: null, order: 0 }
      };
    }
  / kind:ParticipantKind __ name:Identifier _ color:Color? {
      return {
        type: "participant",
        value: { name, alias: null, kind, label: null, order: 0 }
      };
    }

ParticipantKind
  = "participant"  { return "participant"; }
  / "actor"        { return "actor"; }
  / "boundary"     { return "boundary"; }
  / "control"      { return "control"; }
  / "entity"       { return "entity"; }
  / "database"     { return "database"; }
  / "collections"  { return "collections"; }
  / "queue"        { return "queue"; }

Color
  = "#" $[A-Za-z0-9]+

// --- Messages ---
Message
  = from:Identifier _ arrow:Arrow _ to:Identifier _ ":" _ label:$([^\n\r]*) {
      return {
        type: "message",
        value: { from, to, label: label.trim(), arrowType: arrow }
      };
    }

Arrow
  = "-->>"  { return "async"; }
  / "<<--"  { return "async"; }
  / "->>"   { return "async"; }
  / "<<-"   { return "async"; }
  / "<-->"  { return "sync"; }
  / "-->"   { return "return"; }
  / "<--"   { return "return"; }
  / "->"    { return "sync"; }
  / "<-"    { return "sync"; }

// --- Quoted string ---
QuotedString
  = '"' text:$([^"]*) '"' { return text; }

// --- Identifier ---
Identifier
  = $([A-Za-z_][A-Za-z0-9_]*)

// --- Whitespace ---
_  = [ \t\n\r]*
__ = [ \t]+
EOL = "\r\n" / "\n" / "\r"
