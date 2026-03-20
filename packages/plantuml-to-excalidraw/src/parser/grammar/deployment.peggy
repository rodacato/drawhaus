// PlantUML Deployment Diagram PEG Grammar

Diagram
  = _ startuml? _ elements:ElementList _ enduml? _ {
      const nodes = [];
      const relations = [];
      const nodeMap = new Map();

      function ensureNode(name) {
        if (!nodeMap.has(name)) {
          const n = { kind: "node", name, label: null, children: [] };
          nodeMap.set(name, n);
          nodes.push(n);
        }
      }

      function registerNested(node) {
        nodeMap.set(node.name, node);
        for (const child of node.children) {
          registerNested(child);
        }
      }

      for (const el of elements) {
        if (!el) continue;
        if (el.type === "node") {
          if (!nodeMap.has(el.value.name)) {
            nodeMap.set(el.value.name, el.value);
            nodes.push(el.value);
            // Register nested children so relations can find them
            for (const child of el.value.children) {
              registerNested(child);
            }
          } else {
            // Merge children into existing node
            const existing = nodeMap.get(el.value.name);
            if (el.value.children.length > 0 && existing.children.length === 0) {
              existing.children = el.value.children;
              existing.kind = el.value.kind;
            }
            if (el.value.label) existing.label = el.value.label;
          }
        } else if (el.type === "relation") {
          ensureNode(el.value.left);
          ensureNode(el.value.right);
          relations.push(el.value);
        }
      }

      return { type: "deployment", nodes, relations };
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
  / Relation
  / NodeDecl

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

// --- Node declarations ---
NodeDecl
  = kind:NodeKind __ label:QuotedString __ "as" __ name:Identifier _ "{" _ body:NodeBody _ "}" {
      return {
        type: "node",
        value: { kind, name, label, children: body }
      };
    }
  / kind:NodeKind __ label:QuotedString __ "as" __ name:Identifier {
      return {
        type: "node",
        value: { kind, name, label, children: [] }
      };
    }
  / kind:NodeKind __ name:NodeName _ "{" _ body:NodeBody _ "}" {
      return {
        type: "node",
        value: { kind, name, label: null, children: body }
      };
    }
  / kind:NodeKind __ name:NodeName {
      return {
        type: "node",
        value: { kind, name, label: null, children: [] }
      };
    }

NodeKind
  = "artifact"  { return "artifact"; }
  / "cloud"     { return "cloud"; }
  / "component" { return "component"; }
  / "database"  { return "database"; }
  / "folder"    { return "folder"; }
  / "frame"     { return "frame"; }
  / "node"      { return "node"; }
  / "package"   { return "package"; }
  / "queue"     { return "queue"; }
  / "rectangle" { return "rectangle"; }
  / "stack"     { return "stack"; }
  / "storage"   { return "storage"; }
  / "card"      { return "card"; }
  / "agent"     { return "agent"; }
  / "actor"     { return "actor"; }
  / "person"    { return "person"; }

NodeName
  = QuotedString
  / Identifier

NodeBody
  = elements:(NodeBodyElement _)* {
      const parsed = elements.map(e => e[0]);
      const children = [];
      for (const el of parsed) {
        if (!el) continue;
        if (el.type === "node") {
          children.push(el.value);
        }
      }
      return children;
    }

NodeBodyElement
  = Comment { return null; }
  / Relation { return null; }
  / NodeDecl

// --- Relations ---
Relation
  = left:RelationTarget _ arrow:RelationArrow _ right:RelationTarget label:RelationLabel? {
      return {
        type: "relation",
        value: {
          left,
          right,
          relationType: arrow,
          label: label || null
        }
      };
    }

RelationTarget
  = "[" name:$([^\]]+) "]" { return name.trim(); }
  / name:Identifier { return name; }

RelationArrow
  = "..>" { return "dependency"; }
  / "<.." { return "dependency"; }
  / "-->" { return "directed"; }
  / "<--" { return "directed"; }
  / "->" { return "directed"; }
  / "<-" { return "directed"; }
  / "~~" { return "association"; }
  / ".." { return "dependency"; }
  / "--" { return "association"; }
  / "-" { return "association"; }

RelationLabel
  = _ ":" _ label:$([^\n\r]+) { return label.trim(); }

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
