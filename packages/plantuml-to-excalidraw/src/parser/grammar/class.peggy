// PlantUML Class Diagram PEG Grammar

Diagram
  = _ startuml? _ elements:ElementList _ enduml? _ {
      // Merge inline members into their entity declarations
      const entityMap = new Map();
      const entities = [];
      const relations = [];
      for (const el of elements) {
        if (!el) continue;
        if (el.type === 'entity') {
          if (entityMap.has(el.value.name)) {
            // Merge members into existing entity
            const existing = entityMap.get(el.value.name);
            existing.members.push(...el.value.members);
          } else {
            entityMap.set(el.value.name, el.value);
            entities.push(el.value);
          }
        }
        else if (el.type === 'inline_member') {
          // ClassName : member syntax
          if (entityMap.has(el.value.name)) {
            entityMap.get(el.value.name).members.push(el.value.member);
          } else {
            const entity = { kind: "class", name: el.value.name, stereotype: null, members: [el.value.member] };
            entityMap.set(el.value.name, entity);
            entities.push(entity);
          }
        }
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
  / InlineMember
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
  / "abstract"             { return "abstract_class"; }
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

// --- Inline member: ClassName : memberText ---
// Matches "Foo : bar()" or "Foo : baz" outside of a body block.
InlineMember
  = name:Identifier __ ":" __ text:$([^\n\r{}<>]+) {
      const trimmed = text.trim();
      const isMethod = /\w+\s*\(/.test(trimmed);
      // Extract the member name (first word or before parentheses)
      const nameMatch = trimmed.match(/^([A-Za-z_][\w\[\]]*)/);
      const memberName = nameMatch ? nameMatch[1] : trimmed;
      if (isMethod) {
        const paramsMatch = trimmed.match(/\(([^)]*)\)/);
        return {
          type: 'inline_member',
          value: {
            name,
            member: {
              kind: "method",
              name: memberName,
              visibility: null,
              type: null,
              isStatic: false,
              isAbstract: false,
              parameters: paramsMatch ? paramsMatch[1] : ""
            }
          }
        };
      }
      return {
        type: 'inline_member',
        value: {
          name,
          member: {
            kind: "attribute",
            name: memberName,
            visibility: null,
            type: null,
            isStatic: false,
            isAbstract: false
          }
        }
      };
    }

// --- Separator lines (--  ..  ==  __) ---
Separator
  = $("-" "-" "-"* / "." "." "."* / "=" "=" "="* / "_" "_" "_"*) _

// --- Enum values (simple identifiers, possibly comma-separated) ---
EnumValue
  = name:$([A-Za-z_][A-Za-z0-9_]*) _ ","? &(_ ("}" / [A-Za-z_])) {
      return { kind: "enum_value", name, visibility: null, type: null, isStatic: false, isAbstract: false };
    }

// --- Members (attributes and methods) ---
// Supports both: {abstract} +name  AND  +{abstract} name
Member
  = modifiers:Modifiers? visibility:Visibility? modifiers2:Modifiers? _ memberName:MemberName params:Parameters? returnType:ReturnType? {
      const allMods = (modifiers || []).concat(modifiers2 || []);
      const isMethod = params !== null;
      return {
        kind: isMethod ? "method" : "attribute",
        name: memberName,
        visibility: visibility || null,
        type: returnType || null,
        isStatic: allMods.includes("static"),
        isAbstract: allMods.includes("abstract"),
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
  = name:$([A-Za-z_][A-Za-z0-9_\[\]]*) { return name; }

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
  // Two-dash variants (must be checked first — longer match)
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
  // Single-dash variants (PlantUML allows both - and --)
  / "<|-"   { return "inheritance_reverse"; }
  / "-|>"   { return "inheritance"; }
  / "<|."   { return "implementation_reverse"; }
  / ".|>"   { return "implementation"; }
  / "*-"    { return "composition_reverse"; }
  / "-*"    { return "composition"; }
  / "o-"    { return "aggregation_reverse"; }
  / "-o"    { return "aggregation"; }
  / "<-"    { return "directed_association_reverse"; }
  / "->"    { return "directed_association"; }
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
