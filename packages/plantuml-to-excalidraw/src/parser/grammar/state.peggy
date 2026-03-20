// PlantUML State Diagram PEG Grammar

Diagram
  = _ startuml? _ elements:ElementList _ enduml? _ {
      const states = [];
      const transitions = [];
      const stateMap = new Map();

      function ensureState(name) {
        if (name === "[*]") return; // pseudo-state, handled separately
        if (!stateMap.has(name)) {
          const s = { kind: "simple", name, label: null, description: null };
          stateMap.set(name, s);
          states.push(s);
        }
      }

      for (const el of elements) {
        if (!el) continue;
        if (el.type === "state") {
          if (stateMap.has(el.value.name)) {
            // Merge: upgrade simple to composite if needed
            const existing = stateMap.get(el.value.name);
            if (el.value.kind === "composite") {
              existing.kind = "composite";
              existing.children = el.value.children || [];
              existing.transitions = el.value.transitions || [];
            }
            if (el.value.label) existing.label = el.value.label;
            if (el.value.description) existing.description = el.value.description;
          } else {
            stateMap.set(el.value.name, el.value);
            states.push(el.value);
          }
        } else if (el.type === "transition") {
          ensureState(el.value.from);
          ensureState(el.value.to);
          transitions.push(el.value);
        }
      }

      return { type: "state", states, transitions };
    }

startuml = "@startuml" (!EOL .)* EOL
enduml   = "@enduml" (!EOL .)*

ElementList
  = elements:(Element _)* {
      return elements.map(e => e[0]);
    }

Element
  = Comment { return null; }
  / HideDirective { return null; }
  / SkinParam { return null; }
  / CompositeState
  / StateDeclaration
  / Transition

// --- Comments ---
Comment
  = "'" (!EOL .)* EOL?
  / "/'" (!("'/") .)* "'/"

// --- Directives we ignore ---
HideDirective
  = "hide" __ (!EOL .)* EOL?

SkinParam
  = "skinparam" __ (!("{" / EOL) .)* _ "{" (!"}" .)* "}"
  / "skinparam" __ (!EOL .)* EOL?

// --- Composite state: state Parent { ... } ---
CompositeState
  = "state" __ label:QuotedString __ "as" __ name:StateIdentifier _ "{" _ body:CompositeBody _ "}" {
      return {
        type: "state",
        value: {
          kind: "composite",
          name,
          label,
          children: body.states,
          transitions: body.transitions
        }
      };
    }
  / "state" __ name:StateIdentifier stereotype:Stereotype? _ "{" _ body:CompositeBody _ "}" {
      return {
        type: "state",
        value: {
          kind: "composite",
          name,
          label: null,
          children: body.states,
          transitions: body.transitions
        }
      };
    }

CompositeBody
  = elements:(CompositeElement _)* {
      const parsed = elements.map(e => e[0]);
      const states = [];
      const transitions = [];
      const stateMap = new Map();

      function ensureState(name) {
        if (name === "[*]") return;
        if (!stateMap.has(name)) {
          const s = { kind: "simple", name, label: null, description: null };
          stateMap.set(name, s);
          states.push(s);
        }
      }

      for (const el of parsed) {
        if (!el) continue;
        if (el.type === "state") {
          if (!stateMap.has(el.value.name)) {
            stateMap.set(el.value.name, el.value);
            states.push(el.value);
          }
        } else if (el.type === "transition") {
          ensureState(el.value.from);
          ensureState(el.value.to);
          transitions.push(el.value);
        }
      }
      return { states, transitions };
    }

CompositeElement
  = Comment { return null; }
  / CompositeState
  / StateDeclaration
  / Transition

// --- State declarations ---
StateDeclaration
  = "state" __ label:QuotedString __ "as" __ name:StateIdentifier stereotype:Stereotype? {
      return {
        type: "state",
        value: { kind: "simple", name, label, description: null }
      };
    }
  / "state" __ name:StateIdentifier __ stereotype:Stereotype _ ":" __ desc:$([^\n\r]*) {
      return {
        type: "state",
        value: { kind: "simple", name, label: null, description: desc.trim() || null }
      };
    }
  / "state" __ name:StateIdentifier __ ":" __ desc:$([^\n\r]*) {
      return {
        type: "state",
        value: { kind: "simple", name, label: null, description: desc.trim() || null }
      };
    }
  / "state" __ name:StateIdentifier stereotype:Stereotype? {
      return {
        type: "state",
        value: { kind: "simple", name, label: null, description: null }
      };
    }

Stereotype
  = _ "<<" _ label:$([^>]+) ">>" { return label.trim(); }

// --- Transitions: A --> B : label ---
Transition
  = from:TransitionTarget _ arrow:TransitionArrow _ to:TransitionTarget label:TransitionLabel? {
      return {
        type: "transition",
        value: {
          from,
          to,
          label: label || null
        }
      };
    }

TransitionTarget
  = "[*]" { return "[*]"; }
  / name:StateIdentifier { return name; }

TransitionArrow
  = "-"+ ">" { return "right"; }
  / "<" "-"+ { return "left"; }
  / "-"+ "down" "-"* ">" { return "down"; }
  / "-"+ "up" "-"* ">" { return "up"; }
  / "-"+ "left" "-"* ">" { return "left"; }
  / "-"+ "right" "-"* ">" { return "right"; }

TransitionLabel
  = _ ":" _ label:$([^\n\r]+) { return label.trim(); }

// --- Quoted string ---
QuotedString
  = '"' text:$([^"]*) '"' { return text; }

// --- State identifier ---
StateIdentifier
  = $([A-Za-z_][A-Za-z0-9_]*)

// --- Whitespace ---
_  = [ \t\n\r]*
__ = [ \t]+
EOL = "\r\n" / "\n" / "\r"
