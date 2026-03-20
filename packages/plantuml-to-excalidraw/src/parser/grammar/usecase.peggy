// PlantUML Use Case Diagram PEG Grammar
{
  function extractStereotype(label) {
    const m = label.match(/<<\s*(\w+)\s*>>/);
    return m ? m[1].toLowerCase() : null;
  }
}

Diagram
  = _ startuml? _ elements:ElementList _ enduml? _ {
      const actors = [];
      const useCases = [];
      const boundaries = [];
      const relations = [];
      let direction = "TB";
      for (const el of elements) {
        if (!el) continue;
        if (el.type === 'actor') actors.push(el.value);
        else if (el.type === 'usecase') useCases.push(el.value);
        else if (el.type === 'boundary') {
          boundaries.push({ name: el.value.name });
          // Flatten nested elements
          for (const child of el.value.children) {
            if (!child) continue;
            if (child.type === 'actor') actors.push(child.value);
            else if (child.type === 'usecase') {
              child.value.boundary = el.value.name;
              useCases.push(child.value);
            }
            else if (child.type === 'relation') relations.push(child.value);
          }
        }
        else if (el.type === 'relation') relations.push(el.value);
        else if (el.type === 'direction') direction = el.value;
      }
      return { type: "usecase", actors, useCases, boundaries, relations, direction };
    }

startuml = "@startuml" (!EOL .)* EOL
enduml   = "@enduml" (!EOL .)*

ElementList
  = elements:(Element _)* {
      return elements.map(e => e[0]);
    }

Element
  = Comment { return null; }
  / Skinparam { return null; }
  / Direction
  / Boundary
  / ActorDecl
  / UseCaseDecl
  / Relation

// --- Comments ---
Comment
  = "'" (!EOL .)* EOL?
  / "/'" (!("'/") .)* "'/"

// --- Skinparam (ignored) ---
Skinparam
  = "skinparam" (!EOL .)* EOL?

// --- Direction ---
Direction
  = "left" __ "to" __ "right" __ "direction" _ EOL? {
      return { type: 'direction', value: "LR" };
    }
  / "top" __ "to" __ "bottom" __ "direction" _ EOL? {
      return { type: 'direction', value: "TB" };
    }

// --- Boundary (rectangle/package) ---
Boundary
  = kw:("rectangle" / "package") __ name:QuotedOrIdent _ "{" _ children:ElementList _ "}" {
      return { type: 'boundary', value: { name, children } };
    }

// --- Actor declaration ---
ActorDecl
  = "actor" __ name:QuotedOrIdent alias:Alias? _ EOL? {
      return { type: 'actor', value: { name, alias: alias || null } };
    }
  / ":" name:$([^:\n\r]+) ":" alias:Alias? _ EOL? {
      return { type: 'actor', value: { name: name.trim(), alias: alias || null } };
    }

// --- Use Case declaration ---
UseCaseDecl
  = "usecase" __ name:QuotedOrIdent alias:Alias? _ EOL? {
      return { type: 'usecase', value: { name, alias: alias || null, boundary: null } };
    }

// --- Alias ---
Alias
  = __ "as" __ id:Identifier { return id; }

// --- Relations ---
Relation
  = left:RelIdent _ arrow:UCArrow _ right:RelIdent label:RelationLabel? _ EOL? {
      const stereo = label ? extractStereotype(label) : null;
      let relationType = arrow;
      if (relationType === "dependency") {
        if (stereo === "include") relationType = "include";
        else if (stereo === "extend" || stereo === "extends") relationType = "extend";
      }
      return {
        type: 'relation',
        value: {
          left: left,
          right: right,
          relationType,
          label: label || null,
          stereotype: stereo
        }
      };
    }

RelIdent
  = "(" name:$([^)\n\r]+) ")" { return name.trim(); }
  / QuotedOrIdent

UCArrow
  = "--|>"  { return "inheritance"; }
  / "<|--"  { return "inheritance"; }
  / "-->"   { return "directed"; }
  / "<--"   { return "directed"; }
  / "..>"   { return "dependency"; }
  / "<.."   { return "dependency"; }
  / "--"    { return "association"; }

RelationLabel
  = _ ":" _ label:$([^\n\r]+) { return label.trim(); }

// --- Shared ---
QuotedOrIdent
  = '"' text:$([^"]*) '"' { return text; }
  / Identifier

Identifier
  = $([A-Za-z_][A-Za-z0-9_]*)

_  = [ \t\n\r]*
__ = [ \t]+
EOL = "\r\n" / "\n" / "\r"
