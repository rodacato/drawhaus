// PlantUML Object Diagram PEG Grammar

Diagram
  = _ startuml? _ elements:ElementList _ enduml? _ {
      const entities = [];
      const relations = [];
      for (const el of elements) {
        if (!el) continue;
        if (el.type === 'entity') entities.push(el.value);
        else if (el.type === 'relation') relations.push(el.value);
      }
      return { type: "object", entities, relations };
    }

startuml = "@startuml" (!EOL .)* EOL
enduml   = "@enduml" (!EOL .)*

ElementList
  = elements:(Element _)* {
      return elements.map(e => e[0]);
    }

Element
  = Comment { return null; }
  / Relation
  / MapEntity
  / ObjectEntity

// --- Comments ---
Comment
  = "'" (!EOL .)* EOL?
  / "/'" (!("'/") .)* "'/"

// --- Object: object Name : Type { key = value } ---
ObjectEntity
  = "object" __ name:Identifier instanceOf:InstanceOf? _ body:ObjectBody? {
      return {
        type: 'entity',
        value: { kind: "object", name, instanceOf: instanceOf || null, fields: body || [] }
      };
    }

InstanceOf
  = _ ":" _ type:Identifier { return type; }

ObjectBody
  = "{" _ fields:ObjectFieldList _ "}" { return fields; }

ObjectFieldList
  = fields:(ObjectFieldLine _)* {
      return fields.map(f => f[0]).filter(f => f !== null);
    }

ObjectFieldLine
  = Comment { return null; }
  / key:FieldKey _ "=" _ value:FieldValue {
      return { key, value: value.trim(), separator: "=" };
    }

// --- Map: map Name { key => value } ---
MapEntity
  = "map" __ name:Identifier _ body:MapBody? {
      return {
        type: 'entity',
        value: { kind: "map", name, instanceOf: null, fields: body || [] }
      };
    }

MapBody
  = "{" _ entries:MapEntryList _ "}" { return entries; }

MapEntryList
  = entries:(MapEntryLine _)* {
      return entries.map(e => e[0]).filter(e => e !== null);
    }

MapEntryLine
  = Comment { return null; }
  / key:MapKey _ "=>" _ value:FieldValue {
      return { key: key.trim(), value: value.trim(), separator: "=>" };
    }

MapKey
  = $([^\n\r{}=>]+)

FieldKey
  = $([A-Za-z_][A-Za-z0-9_.]*)

FieldValue
  = '"' text:$([^"]*) '"' { return text; }
  / $([^\n\r{}]+)

// --- Relations (same arrows as class diagrams) ---
Relation
  = left:Identifier _ arrow:Arrow _ right:Identifier label:RelationLabel? {
      return {
        type: 'relation',
        value: {
          left,
          right,
          relationType: arrow,
          label: label || null
        }
      };
    }

Arrow
  = "<|.."  { return "implementation_reverse"; }
  / "..|>"  { return "implementation"; }
  / "<|--"  { return "inheritance_reverse"; }
  / "--|>"  { return "inheritance"; }
  / "*--"   { return "composition_reverse"; }
  / "--*"   { return "composition"; }
  / "o--"   { return "aggregation_reverse"; }
  / "--o"   { return "aggregation"; }
  / "<--"   { return "directed_association_reverse"; }
  / "-->"   { return "directed_association"; }
  / "..>"   { return "dependency"; }
  / "<.."   { return "dependency_reverse"; }
  / ".."    { return "dependency_bidirectional"; }
  / "--"    { return "association"; }

RelationLabel
  = _ ":" _ label:$([^\n\r]+) { return label.trim(); }

// --- Shared ---
Identifier
  = $([A-Za-z_][A-Za-z0-9_]*)

_  = [ \t\n\r]*
__ = [ \t]+
EOL = "\r\n" / "\n" / "\r"
