// PlantUML Class Diagram PEG Grammar

Diagram
  = _ startuml? _ elements:ElementList _ enduml? _ {
      const entities = [];
      const relations = [];
      for (const el of elements) {
        if (!el) continue;
        if (el.type === 'entity') entities.push(el.value);
        else if (el.type === 'relation') relations.push(el.value);
      }
      return { type: "class", entities, relations };
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
  / Entity

// --- Comments ---
Comment
  = "'" (!EOL .)* EOL?
  / "/'" (!("'/") .)* "'/"

// --- Entities: class, interface, enum, abstract class ---
Entity
  = kind:EntityKind __ name:Identifier stereotype:Stereotype? _ body:Body? {
      return {
        type: 'entity',
        value: {
          kind,
          name,
          stereotype: stereotype || null,
          members: body || []
        }
      };
    }

EntityKind
  = "abstract" __ "class" { return "abstract_class"; }
  / "class"                { return "class"; }
  / "interface"            { return "interface"; }
  / "enum"                 { return "enum"; }

Stereotype
  = _ "<<" _ label:$([^>]+) ">>" { return label.trim(); }

Body
  = "{" _ members:MemberList _ "}" { return members; }

MemberList
  = members:(MemberLine _)* {
      return members.map(m => m[0]).filter(m => m !== null);
    }

MemberLine
  = Comment { return null; }
  / Separator { return null; }
  / EnumValue
  / Member

// --- Separator lines (--  ..  ==  __) ---
Separator
  = $("-" "-" "-"* / "." "." "."* / "=" "=" "="* / "_" "_" "_"*) _

// --- Enum values (simple identifiers, possibly comma-separated) ---
EnumValue
  = name:$([A-Za-z_][A-Za-z0-9_]*) _ ","? &(_ ("}" / [A-Za-z_])) {
      return { kind: "enum_value", name, visibility: null, type: null, isStatic: false, isAbstract: false };
    }

// --- Members (attributes and methods) ---
Member
  = modifiers:Modifiers? visibility:Visibility? memberName:MemberName params:Parameters? returnType:ReturnType? {
      const isMethod = params !== null;
      return {
        kind: isMethod ? "method" : "attribute",
        name: memberName,
        visibility: visibility || null,
        type: returnType || null,
        isStatic: modifiers ? modifiers.includes("static") : false,
        isAbstract: modifiers ? modifiers.includes("abstract") : false,
        parameters: isMethod ? params : undefined
      };
    }

Modifiers
  = mods:Modifier+ { return mods; }

Modifier
  = "{static}" _  { return "static"; }
  / "{abstract}" _ { return "abstract"; }

Visibility
  = v:[+\-#~] { return v; }

MemberName
  = name:$([A-Za-z_][A-Za-z0-9_]*) { return name; }

Parameters
  = "(" params:$([^)]*) ")" { return params; }

ReturnType
  = _ ":" _ type:$([^\n\r{}]+) { return type.trim(); }

// --- Relations ---
Relation
  = left:Identifier _ leftCard:Cardinality? _ arrow:Arrow _ rightCard:Cardinality? _ right:Identifier label:RelationLabel? {
      return {
        type: 'relation',
        value: {
          left,
          right,
          relationType: arrow,
          label: label || null,
          leftCardinality: leftCard || null,
          rightCardinality: rightCard || null
        }
      };
    }

Cardinality
  = '"' card:$([^"]*) '"' { return card; }

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

// --- Identifier ---
Identifier
  = $([A-Za-z_][A-Za-z0-9_]*)

// --- Whitespace ---
_  = [ \t\n\r]*
__ = [ \t]+
EOL = "\r\n" / "\n" / "\r"
