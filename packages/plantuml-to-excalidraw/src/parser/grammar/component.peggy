// PlantUML Component Diagram PEG Grammar

Diagram
  = _ startuml? _ elements:ElementList _ enduml? _ {
      const components = [];
      const containers = [];
      const interfaces = [];
      const relations = [];
      const componentMap = new Map();

      function ensureComponent(name) {
        if (!componentMap.has(name)) {
          const c = { name, alias: null, container: null };
          componentMap.set(name, c);
          components.push(c);
        }
      }

      for (const el of elements) {
        if (!el) continue;
        if (el.type === "component") {
          const c = el.value;
          const key = c.alias || c.name;
          if (!componentMap.has(key)) {
            componentMap.set(key, c);
            components.push(c);
          }
        } else if (el.type === "container") {
          containers.push(el.value);
          // Register children as components
          for (const child of el.value.children) {
            const key = child.alias || child.name;
            if (!componentMap.has(key)) {
              componentMap.set(key, child);
              components.push(child);
            }
          }
          // Collect relations from inside containers
          if (el.value.relations) {
            for (const r of el.value.relations) {
              ensureComponent(r.left);
              ensureComponent(r.right);
              relations.push(r);
            }
          }
        } else if (el.type === "interface") {
          interfaces.push(el.value);
        } else if (el.type === "relation") {
          ensureComponent(el.value.left);
          ensureComponent(el.value.right);
          relations.push(el.value);
        }
      }

      return { type: "component", components, containers, interfaces, relations };
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
  / Container
  / InterfaceDecl
  / Relation
  / ComponentDecl

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

// --- Containers: package, node, cloud, database, folder, frame ---
Container
  = kind:ContainerKind __ name:ContainerName _ "{" _ body:ContainerBody _ "}" {
      return {
        type: "container",
        value: {
          kind,
          name,
          children: body.children,
          childContainers: body.childContainers,
          relations: body.relations
        }
      };
    }

ContainerKind
  = "package"   { return "package"; }
  / "node"      { return "node"; }
  / "cloud"     { return "cloud"; }
  / "database"  { return "database"; }
  / "folder"    { return "folder"; }
  / "frame"     { return "frame"; }
  / "rectangle" { return "rectangle"; }

ContainerName
  = QuotedString
  / Identifier

ContainerBody
  = elements:(ContainerElement _)* {
      const parsed = elements.map(e => e[0]);
      const children = [];
      const childContainers = [];
      const relations = [];
      const childMap = new Map();
      function ensureChild(name) {
        if (!childMap.has(name)) {
          const c = { name, alias: null, container: null };
          childMap.set(name, c);
          children.push(c);
        }
      }
      for (const el of parsed) {
        if (!el) continue;
        if (el.type === "component") {
          const key = el.value.alias || el.value.name;
          if (!childMap.has(key)) {
            childMap.set(key, el.value);
            children.push(el.value);
          }
        } else if (el.type === "container") {
          childContainers.push(el.value);
          for (const child of el.value.children) {
            const key = child.alias || child.name;
            if (!childMap.has(key)) {
              childMap.set(key, child);
              children.push(child);
            }
          }
          if (el.value.relations) {
            for (const r of el.value.relations) relations.push(r);
          }
        } else if (el.type === "relation") {
          ensureChild(el.value.left);
          ensureChild(el.value.right);
          relations.push(el.value);
        }
      }
      return { children, childContainers, relations };
    }

ContainerElement
  = Comment { return null; }
  / Container
  / InterfaceDecl
  / Relation
  / ComponentDecl

// --- Component declarations ---
ComponentDecl
  = "component" __ name:QuotedString __ "as" __ alias:Identifier {
      return {
        type: "component",
        value: { name, alias, container: null }
      };
    }
  / "component" __ name:Identifier {
      return {
        type: "component",
        value: { name, alias: null, container: null }
      };
    }
  / "[" name:$([^\]]+) "]" {
      return {
        type: "component",
        value: { name: name.trim(), alias: null, container: null }
      };
    }

// --- Interface declarations ---
InterfaceDecl
  = "interface" __ name:QuotedString __ "as" __ alias:Identifier {
      return {
        type: "interface",
        value: { name, alias }
      };
    }
  / "interface" __ name:Identifier {
      return {
        type: "interface",
        value: { name, alias: null }
      };
    }
  / "()" __ name:QuotedString __ "as" __ alias:Identifier {
      return {
        type: "interface",
        value: { name, alias }
      };
    }
  / "()" __ name:QuotedString {
      return {
        type: "interface",
        value: { name, alias: null }
      };
    }

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
  / "()" _ name:QuotedString { return name; }
  / name:Identifier { return name; }

RelationArrow
  = "..>" { return "dependency"; }
  / "<.." { return "dependency"; }
  / "-->" { return "directed"; }
  / "<--" { return "directed"; }
  / "->" { return "directed"; }
  / "<-" { return "directed"; }
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
